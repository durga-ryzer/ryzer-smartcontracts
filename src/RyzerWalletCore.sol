// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import "./RyzerWalletInterfaces.sol";
import "./RyzerWalletLibraries.sol";
import "./IRyzerMilitaryGradeSecurity.sol";

contract RyzerWalletCore is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    EIP712Upgradeable,
    IRyzerMilitaryGradeSecurity
{
    bytes32 internal constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");
    bytes32 internal constant BROKER_ROLE = keccak256("BROKER_ROLE");
    bytes32 internal constant SECURITY_ADMIN_ROLE =
        keccak256("SECURITY_ADMIN_ROLE");
    bytes32 internal constant TEE_VERIFIER_ROLE =
        keccak256("TEE_VERIFIER_ROLE");
    bytes32 internal constant TSS_OPERATOR_ROLE =
        keccak256("TSS_OPERATOR_ROLE");
    uint64 internal constant DEFAULT_ROLE_DURATION = 365 days;
    uint256 internal constant MAX_GAS_PER_OP = 1_000_000;
    uint256 internal constant RATE_LIMIT_BLOCKS = 10;

    address public entryPoint;
    address public paymaster;
    address payable public timelock;
    uint64 public threshold;
    mapping(address => uint64) private nonces;
    mapping(address => address) public delegatedSigners;
    mapping(address => MultiSignature) public multiSigners;
    mapping(address => uint64) public userAddressToId;
    mapping(address => bool) private blacklistedUsers;
    mapping(bytes32 => uint64) private roleExpirations;
    mapping(address => uint256) public lastOperationBlock;
    bool public emergencyStopped;

    // Military-grade security mappings
    //mapping(address => MilitaryGradeConfig) public militaryGradeConfigs;
    //mapping(address => AccessPolicy) public accessPolicies;
    //mapping(address => SecurityAudit[]) public securityAudits;
    //mapping(address => TEEAttestation) public teeAttestations;
    //mapping(address => TSSConfig) public tssConfigs;
    //mapping(address => IntrusionDetection) public intrusionDetection;
    //mapping(address => bool) public emergencyLockdownEnabled;

    event WalletCreated(address indexed walletAddress);
    event DelegatedSignerSet(address indexed user, address indexed signer);
    event MultiSignersSet(
        address indexed user,
        bytes32 merkleRoot,
        uint256 threshold
    );
    // event UserBlacklisted(address indexed user, bool isBlacklisted);
    // event BatchOperationsExecuted(uint256 count);
    event EmergencyStop(bool stopped);
    event RoleRevoked(bytes32 indexed role, address indexed account);
    // event OperationRateLimited(address indexed user);
    event DelegatedOperation(
        address indexed delegator,
        address indexed operator,
        string operation
    );

    // Military-grade security events
    event MilitaryGradeWalletCreated(
        address indexed wallet,
        SecurityLevel level
    );
    event SecurityConfigUpdated(address indexed wallet, SecurityLevel level);
    event AccessPolicyUpdated(address indexed wallet);
    event SecurityAuditRecorded(
        address indexed wallet,
        string action,
        bool success
    );
    event TEEAttestationVerified(address indexed wallet, bool verified);
    event AnomalyDetected(address indexed wallet, uint256 score);
    //event WalletLocked(address indexed wallet, uint256 expiry);
    event WalletUnlocked(address indexed wallet);
    event EmergencyLockdownActivated(address indexed wallet);
    event EmergencyLockdownDeactivated(address indexed wallet);

    // error UnauthorizedAccess();
    // error GasLimitExceeded();
    // error InvalidSignature();
    error RateLimited();
    error EmergencyStopped();

    // Military-grade security errors
    // error SecurityCheckFailed(string reason);
    // error MFARequired();
    // error BiometricVerificationRequired();
    // error HardwareKeyRequired();
    // error GeoRestricted();
    // error TimeWindowRestricted();
    // error DeviceNotAllowed();
    // error IPAddressNotAllowed();
    // error TransactionAmountExceeded();
    // error CooldownPeriodActive();
    // error WalletLocked();
    // error EmergencyLockdownActive();

    bytes32 private constant USER_OPERATION_TYPEHASH =
        keccak256(
            "UserOperation(address sender,uint256 nonce,bytes callData,uint256 callGasLimit,uint256 verificationGasLimit,uint256 preVerificationGas,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas)"
        );

    struct InitParams {
        address initialUser;
        uint64 userId;
        uint64 threshold;
        address[] custodians;
        address[] brokers;
        address[] securityAdmins;
        address[] teeVerifiers;
        address[] tssOperators;
        address entryPoint;
        address paymaster;
        address payable timelock;
    }

    function initialize(InitParams memory params) public virtual initializer {
        require(
            params.userId > 0 &&
                params.threshold > 0 &&
                params.initialUser != address(0),
            "Invalid params"
        );
        require(
            params.entryPoint != address(0) &&
                params.paymaster != address(0) &&
                params.timelock != address(0),
            "Invalid addresses"
        );
        require(
            params.custodians.length <= 50 && params.brokers.length <= 50,
            "Too many roles"
        );

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __EIP712_init("RyzerWallet", "1");

        _setInitialState(params);
        _initializeRoles(
            params.timelock,
            msg.sender,
            params.custodians,
            params.brokers,
            params.securityAdmins,
            params.teeVerifiers,
            params.tssOperators
        );
        emit WalletCreated(address(this));
    }

    function _setInitialState(InitParams memory params) internal {
        threshold = params.threshold;
        entryPoint = params.entryPoint;
        paymaster = params.paymaster;
        timelock = params.timelock;
        userAddressToId[params.initialUser] = params.userId;
    }

    function _initializeRoles(
        address payable _timelock,
        address _msgSender,
        address[] memory custodians,
        address[] memory brokers,
        address[] memory securityAdmins,
        address[] memory teeVerifiers,
        address[] memory tssOperators
    ) internal {
        _grantRoleWithExpiration(
            DEFAULT_ADMIN_ROLE,
            _timelock,
            type(uint64).max
        );
        _grantRoleWithExpiration(CUSTODIAN_ROLE, _msgSender, type(uint64).max);
        _assignRoles(CUSTODIAN_ROLE, custodians);
        _assignRoles(BROKER_ROLE, brokers);
        _assignRoles(SECURITY_ADMIN_ROLE, securityAdmins);
        _assignRoles(TEE_VERIFIER_ROLE, teeVerifiers);
        _assignRoles(TSS_OPERATOR_ROLE, tssOperators);
    }

    function _assignRoles(bytes32 role, address[] memory accounts) internal {
        for (uint256 i = 0; i < accounts.length; ) {
            address account = accounts[i];
            require(account != address(0), "Invalid address");
            _grantRoleWithExpiration(role, account, type(uint64).max);
            unchecked {
                i++;
            }
        }
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal view override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            TimelockController(timelock).isOperationPending(
                keccak256(abi.encode(newImplementation))
            ),
            "Upgrade not scheduled"
        );
    }

    function hasRole(
        bytes32 role,
        address account
    ) public view override returns (bool) {
        // Generate unique key for role-account pair to check expiration
        bytes32 roleKey = keccak256(abi.encode(role, account));

        // Check if role has a non-zero expiration and has expired
        if (
            roleExpirations[roleKey] != 0 &&
            block.timestamp > roleExpirations[roleKey]
        ) {
            return false;
        }

        // Delegate to AccessControlUpgradeable to check if role is assigned
        return super.hasRole(role, account);
    }

    function revokeRole(
        bytes32 role,
        address account
    ) public override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        super.revokeRole(role, account);
        bytes32 roleKey = keccak256(abi.encode(role, account));
        delete roleExpirations[roleKey];
        emit RoleRevoked(role, account);
    }

    modifier notBlacklisted(address account) {
        require(!blacklistedUsers[account], "User blacklisted");
        _;
    }

    modifier rateLimited(address user) {
        if (block.number <= lastOperationBlock[user] + RATE_LIMIT_BLOCKS)
            revert RateLimited();
        lastOperationBlock[user] = block.number;
        _;
    }

    modifier notEmergencyStopped() virtual {
        if (emergencyStopped) revert EmergencyStopped();
        _;
    }

    modifier verifyDelegation(
        address delegator,
        bytes calldata delegationData
    ) {
        require(delegator != address(0), "Invalid delegator");
        (bytes32 messageHash, bytes memory signature) = abi.decode(
            delegationData,
            (bytes32, bytes)
        );
        bytes32 ethSignedMessageHash = toEthSignedMessageHash(messageHash);
        require(
            ECDSA.recover(ethSignedMessageHash, signature) == delegator,
            "Invalid delegation signature"
        );
        _;
    }

    function toEthSignedMessageHash(
        bytes32 hash
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
            );
    }

    function setEmergencyStop(
        bool stopped
    ) external virtual onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        emergencyStopped = stopped;
        if (stopped) _pause();
        else _unpause();
        emit EmergencyStop(stopped);
    }

    function setDelegatedSigner(
        address signer
    )
        external
        nonReentrant
        notBlacklisted(msg.sender)
        rateLimited(msg.sender)
        notEmergencyStopped
    {
        require(signer != address(0), "Invalid signer");
        delegatedSigners[msg.sender] = signer;
        emit DelegatedSignerSet(msg.sender, signer);
    }

    function setMultiSigners(
        address[] calldata signers,
        uint256 _threshold,
        bytes32 merkleRoot
    )
        external
        nonReentrant
        notBlacklisted(msg.sender)
        rateLimited(msg.sender)
        notEmergencyStopped
    {
        require(
            signers.length >= _threshold && _threshold > 0,
            "Invalid multi-sig config"
        );
        require(merkleRoot != bytes32(0), "Invalid Merkle root");
        multiSigners[msg.sender] = MultiSignature(merkleRoot, _threshold);
        emit MultiSignersSet(msg.sender, merkleRoot, _threshold);
    }

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256
    ) external nonReentrant notEmergencyStopped returns (uint256) {
        require(msg.sender == entryPoint, "Only EntryPoint");
        require(!blacklistedUsers[userOp.sender], "User blacklisted");
        require(
            IEntryPoint(entryPoint).getUserOpHash(userOp) == userOpHash,
            "Invalid hash"
        );
        require(nonces[userOp.sender] == userOp.nonce, "Invalid nonce");

        if (multiSigners[userOp.sender].merkleRoot != bytes32(0)) {
            _verifyMultiSignature(userOp.sender, userOpHash, userOp.signature);
        } else if (delegatedSigners[userOp.sender] != address(0)) {
            bytes32 messageHash = toEthSignedMessageHash(userOpHash);
            require(
                ECDSA.recover(messageHash, userOp.signature) ==
                    delegatedSigners[userOp.sender],
                "Invalid ECDSA signature"
            );
        } else {
            bytes32 digest = _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        USER_OPERATION_TYPEHASH,
                        userOp.sender,
                        userOp.nonce,
                        keccak256(userOp.callData),
                        userOp.callGasLimit,
                        userOp.verificationGasLimit,
                        userOp.preVerificationGas,
                        userOp.maxFeePerGas,
                        userOp.maxPriorityFeePerGas
                    )
                )
            );
            require(
                ECDSA.recover(digest, userOp.signature) == userOp.sender,
                "Invalid EIP-712 signature"
            );
        }

        nonces[userOp.sender]++;
        return 0;
    }

    function _verifyMultiSignature(
        address user,
        bytes32 userOpHash,
        bytes calldata signature
    ) internal view {
        MultiSignature storage multiSig = multiSigners[user];
        (
            address[] memory signers,
            bytes[] memory signatures,
            bytes32[][] memory proofs
        ) = abi.decode(signature, (address[], bytes[], bytes32[][]));
        require(
            signers.length == signatures.length &&
                proofs.length == signers.length,
            "Invalid signature data"
        );
        require(
            signers.length >= multiSig.threshold,
            "Insufficient signatures"
        );

        bytes32 messageHash = toEthSignedMessageHash(userOpHash);
        uint256 validSignatures = _countValidSignatures(
            signers,
            signatures,
            proofs,
            multiSig.merkleRoot,
            messageHash
        );
        require(
            validSignatures >= multiSig.threshold,
            "Insufficient valid signatures"
        );
    }

    function _countValidSignatures(
        address[] memory signers,
        bytes[] memory signatures,
        bytes32[][] memory proofs,
        bytes32 merkleRoot,
        bytes32 messageHash
    ) internal pure returns (uint256) {
        uint256 validSignatures = 0;
        for (
            uint i = 0;
            i < signers.length && validSignatures < signers.length;
            i++
        ) {
            bytes32 leaf = keccak256(abi.encodePacked(signers[i]));
            if (
                MerkleProof.verify(proofs[i], merkleRoot, leaf) &&
                ECDSA.recover(messageHash, signatures[i]) == signers[i]
            ) {
                validSignatures++;
            }
        }
        return validSignatures;
    }

    function _grantRoleWithExpiration(
        bytes32 role,
        address account,
        uint64 expiration
    ) internal {
        require(account != address(0), "Invalid account");
        _grantRole(role, account);
        roleExpirations[keccak256(abi.encode(role, account))] = expiration;
    }

    receive() external payable {}
}
