// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import { RyzerWalletCore } from "./RyzerWalletCore.sol";

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

    function createWallet(
        address user,
        uint64 userId,
        uint64 threshold,
        address[] calldata custodians,
        address[] calldata brokers
    ) external whenNotPaused nonReentrant returns (address payable wallet) { // Changed to address payable
        if (emergencyStopped) revert EmergencyStopped();
        if (block.number <= lastOperationBlock[user] + RATE_LIMIT_BLOCKS) revert RateLimited();
        require(user != address(0) && userId > 0, "Invalid user");
        require(userToWallet[user] == address(0), "Wallet already exists");
        require(custodians.length <= 50 && brokers.length <= 50, "Too many roles");
        require(threshold > 0, "Invalid threshold");

        unchecked {
            lastOperationBlock[user] = block.number;
        }
        wallet = payable(Clones.clone(walletImplementation)); // Cast to payable
        isWallet[wallet] = true;

        try RyzerWalletCore(wallet).initialize(
            RyzerWalletCore.InitParams({
                initialUser: user,
                userId: userId,
                threshold: threshold,
                custodians: custodians,
                brokers: brokers,
                entryPoint: entryPoint,
                paymaster: paymaster,
                timelock: timelock
            })
        ) {
            userToWallet[user] = wallet;
            emit WalletDeployed(user, wallet);
        } catch {
            revert InvalidInitialization();
        }
    }

    function upgradeImplementation(address newImplementation) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(newImplementation != address(0), "Invalid implementation");
        require(newImplementation.code.length > 0, "Implementation not a contract");
        require(TimelockController(timelock).isOperationPending(keccak256(abi.encode(newImplementation))), "Upgrade not scheduled");
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

    function setTimelock(address payable newTimelock) external onlyRole(ADMIN_ROLE) nonReentrant { // Changed to address payable
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
}