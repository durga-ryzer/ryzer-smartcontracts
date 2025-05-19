// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./RyzerWalletInterfaces.sol";
import "./RyzerWalletFactory.sol";

contract RyzerTokenManagement is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");
    bytes32 public constant BROKER_ROLE = keccak256("BROKER_ROLE");

    address public entryPoint;
    address public paymaster;
    address payable public timelock;
    uint64 public threshold;
    mapping(address => uint64) public userAddressToId;
    mapping(bytes32 => uint64) private roleExpirations;
    bool public emergencyStopped;

    event TokenDeposited(address indexed user, address indexed token, uint256 amount, bool isERC721, uint256 tokenId);
    event TokenWithdrawn(address indexed user, address indexed token, uint256 amount, bool isERC721, uint256 tokenId);
    event WalletInitialized(address indexed wallet);
    event EmergencyStop(bool stopped);
    event RoleGrantedWithExpiration(bytes32 indexed role, address indexed account, uint64 expiration);

    error InvalidParams();
    error InvalidAddresses();
    error TooManyRoles();
    error EmergencyStopped();
    error UnauthorizedAccess();
    error InvalidToken();

    struct InitParams {
        address initialUser;
        uint64 userId;
        uint64 threshold;
        address[] custodians;
        address[] brokers;
        address entryPoint;
        address paymaster;
        address payable timelock;
    }

    function initialize(InitParams memory params) public initializer {
        // Combine validation to reduce stack usage
        if (params.userId == 0 || params.threshold == 0 || params.initialUser == address(0)) {
            revert InvalidParams();
        }
        if (params.entryPoint == address(0) || params.paymaster == address(0) || params.timelock == address(0)) {
            revert InvalidAddresses();
        }
        if (params.custodians.length > 50 || params.brokers.length > 50) {
            revert TooManyRoles();
        }

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _setInitialState(params);
        _initializeRoles(params.timelock, msg.sender, params.custodians, params.brokers);
        emit WalletInitialized(address(this));
    }

    function _setInitialState(InitParams memory params) internal {
        threshold = params.threshold;
        entryPoint = params.entryPoint;
        paymaster = params.paymaster;
        timelock = params.timelock;
        userAddressToId[params.initialUser] = params.userId; // Line 93, now safe
    }

    function _initializeRoles(
        address payable _timelock,
        address _msgSender,
        address[] memory custodians,
        address[] memory brokers
    ) internal {
        _grantRoleWithExpiration(DEFAULT_ADMIN_ROLE, _timelock, type(uint64).max);
        _grantRoleWithExpiration(CUSTODIAN_ROLE, _msgSender, type(uint64).max);
        _assignCustodianRoles(custodians);
        _assignBrokerRoles(brokers);
    }

    function _assignCustodianRoles(address[] memory custodians) internal {
        for (uint256 i = 0; i < custodians.length; i++) {
            if (custodians[i] == address(0)) revert InvalidParams();
            _grantRoleWithExpiration(CUSTODIAN_ROLE, custodians[i], type(uint64).max);
        }
    }

    function _assignBrokerRoles(address[] memory brokers) internal {
        for (uint256 i = 0; i < brokers.length; i++) {
            if (brokers[i] == address(0)) revert InvalidParams();
            _grantRoleWithExpiration(BROKER_ROLE, brokers[i], type(uint64).max);
        }
    }

    function _grantRoleWithExpiration(bytes32 role, address account, uint64 expiration) internal {
        if (account == address(0)) revert InvalidParams();
        _grantRole(role, account);
        roleExpirations[keccak256(abi.encode(role, account))] = expiration;
        emit RoleGrantedWithExpiration(role, account, expiration);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {
        // Assume timelock scheduling, similar to RyzerWalletCore
    }

    modifier notEmergencyStopped() {
        if (emergencyStopped) revert EmergencyStopped();
        _;
    }

    function depositERC20(address token, uint256 amount) external notEmergencyStopped nonReentrant {
        if (token == address(0) || amount == 0) revert InvalidToken();
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit TokenDeposited(msg.sender, token, amount, false, 0);
    }

    function depositERC721(address token, uint256 tokenId) external notEmergencyStopped nonReentrant {
        if (token == address(0)) revert InvalidToken();
        IERC721(token).safeTransferFrom(msg.sender, address(this), tokenId);
        emit TokenDeposited(msg.sender, token, 1, true, tokenId);
    }

    function withdrawERC20(address token, uint256 amount)
        external
        onlyRole(CUSTODIAN_ROLE)
        notEmergencyStopped
        nonReentrant
    {
        if (token == address(0) || amount == 0) revert InvalidToken();
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokenWithdrawn(msg.sender, token, amount, false, 0);
    }

    function withdrawERC721(address token, uint256 tokenId)
        external
        onlyRole(CUSTODIAN_ROLE)
        notEmergencyStopped
        nonReentrant
    {
        if (token == address(0)) revert InvalidToken();
        IERC721(token).safeTransferFrom(address(this), msg.sender, tokenId);
        emit TokenWithdrawn(msg.sender, token, 1, true, tokenId);
    }

    function setEmergencyStop(bool stopped) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        emergencyStopped = stopped;
        emit EmergencyStop(stopped);
    }

    receive() external payable {}
}
