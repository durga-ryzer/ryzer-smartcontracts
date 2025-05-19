// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import {RyzerWalletCore} from "./RyzerWalletCore.sol";

contract RyzerWalletFactory is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    address public immutable walletImplementation;
    address public entryPoint;
    address public paymaster;
    address payable public timelock; // Changed to address payable
    mapping(address => address) public userToWallet;
    mapping(address => bool) public isWallet;
    mapping(address => uint256) public lastOperationBlock;
    bool public emergencyStopped;
    uint256 public constant RATE_LIMIT_BLOCKS = 10;

    struct WalletParams {
        address user;
        uint64 userId;
        uint64 threshold;
        address[] custodians;
        address[] brokers;
        address[] securityAdmins;
        address[] teeVerifiers;
        address[] tssOperators;
    }

    event WalletDeployed(address indexed user, address indexed wallet);
    event ImplementationUpgraded(address indexed newImplementation);
    event EntryPointUpdated(address indexed newEntryPoint);
    event PaymasterUpdated(address indexed newPaymaster);
    event TimelockUpdated(address indexed newTimelock);
    event EmergencyStop(bool stopped);
    event OperationRateLimited(address indexed user);

    error WalletAlreadyExists();
    error InvalidInitialization();
    error NotWallet();
    error RateLimited();
    error EmergencyStopped();
    error InvalidImplementation();

    constructor(
        address _walletImplementation,
        address _entryPoint,
        address _paymaster,
        address payable _timelock // Changed to address payable
    ) {
        require(_walletImplementation != address(0) && _entryPoint != address(0), "Invalid addresses");
        require(_paymaster != address(0) && _timelock != address(0), "Invalid addresses");
        require(_walletImplementation.code.length > 0, "Implementation not a contract");
        _grantRole(ADMIN_ROLE, msg.sender);
        walletImplementation = _walletImplementation;
        entryPoint = _entryPoint;
        paymaster = _paymaster;
        timelock = _timelock;
    }

    function createWallet(WalletParams calldata params)
        external
        whenNotPaused
        nonReentrant
        returns (address payable wallet)
    {
        // Changed to address payable
        if (emergencyStopped) revert EmergencyStopped();
        if (block.number <= lastOperationBlock[params.user] + RATE_LIMIT_BLOCKS) {
            revert RateLimited();
        }

        _validateParams(params);

        unchecked {
            lastOperationBlock[params.user] = block.number;
        }

        wallet = _deployWallet(params);
        userToWallet[params.user] = wallet;
        emit WalletDeployed(params.user, wallet);
    }

    function upgradeImplementation(address newImplementation) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(newImplementation != address(0), "Invalid implementation");
        require(newImplementation.code.length > 0, "Implementation not a contract");
        require(
            TimelockController(timelock).isOperationPending(keccak256(abi.encode(newImplementation))),
            "Upgrade not scheduled"
        );
        emit ImplementationUpgraded(newImplementation);
    }

    function setEntryPoint(address newEntryPoint) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(newEntryPoint != address(0), "Invalid entry point");
        entryPoint = newEntryPoint;
        emit EntryPointUpdated(newEntryPoint);
    }

    function setPaymaster(address newPaymaster) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(newPaymaster != address(0), "Invalid paymaster");
        paymaster = newPaymaster;
        emit PaymasterUpdated(newPaymaster);
    }

    function setTimelock(address payable newTimelock) external onlyRole(ADMIN_ROLE) nonReentrant {
        // Changed to address payable
        require(newTimelock != address(0), "Invalid timelock");
        timelock = newTimelock;
        emit TimelockUpdated(newTimelock);
    }

    function setEmergencyStop(bool stopped) external onlyRole(ADMIN_ROLE) nonReentrant {
        emergencyStopped = stopped;
        if (stopped) _pause();
        else _unpause();
        emit EmergencyStop(stopped);
    }

    function getWallet(address user) external view returns (address) {
        return userToWallet[user];
    }

    function predictWalletAddress(address user) external view returns (address) {
        return Clones.predictDeterministicAddress(walletImplementation, bytes32(uint256(uint160(user))), address(this));
    }

    receive() external payable {
        revert("Direct ETH not allowed");
    }

    function _validateParams(WalletParams calldata p) private view {
        require(p.user != address(0) && p.userId > 0, "Invalid user");
        require(userToWallet[p.user] == address(0), "Wallet already exists");
        require(p.custodians.length <= 50 && p.brokers.length <= 50, "Too many roles");
        require(p.threshold > 0, "Invalid threshold");
    }

    function _deployWallet(WalletParams calldata p) private returns (address payable wallet) {
        wallet = payable(Clones.clone(walletImplementation));
        isWallet[wallet] = true;

        try RyzerWalletCore(wallet).initialize(
            RyzerWalletCore.InitParams({
                initialUser: p.user,
                userId: p.userId,
                threshold: p.threshold,
                custodians: p.custodians,
                securityAdmins: p.securityAdmins,
                teeVerifiers: p.teeVerifiers,
                tssOperators: p.tssOperators,
                brokers: p.brokers,
                entryPoint: entryPoint,
                paymaster: paymaster,
                timelock: timelock
            })
        ) {
            return wallet;
        } catch {
            revert InvalidInitialization();
        }
    }
}
