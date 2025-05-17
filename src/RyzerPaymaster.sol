// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./RyzerWalletInterfaces.sol";
import "./RyzerWalletFactory.sol";

contract RyzerPaymaster is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    address public entryPoint;
    address payable public factory;
    address public gasToken;
    mapping(address => uint256) public ethBalances;
    mapping(address => uint256) public tokenBalances;
    mapping(address => uint64) public userFeeTiers;
    uint256 public offPeakStart;
    uint256 public offPeakEnd;
    uint64 public offPeakDiscount;
    uint64 public volumeDiscountThreshold;
    uint64 public volumeDiscount;
    bool public emergencyStopped;
    uint256 public lowEthBalanceThreshold;
    uint256 public lowTokenBalanceThreshold;

    event GasSponsored(address indexed user, uint256 amount, address token);
    event FundsWithdrawn(address indexed recipient, uint256 amount, address token);
    event FeeTierUpdated(address indexed user, uint64 tier);
    event GasTokenUpdated(address indexed token);
    event OffPeakDiscountUpdated(uint256 startHour, uint256 endHour, uint64 discount);
    event VolumeDiscountUpdated(uint64 threshold, uint64 discount);
    event EmergencyStop(bool stopped);
    event LowBalance(address indexed user, uint256 ethBalance, uint256 tokenBalance);
    event LowBalanceThresholdsUpdated(uint256 ethThreshold, uint256 tokenThreshold);
    event EntryPointUpdated(address indexed newEntryPoint);
    event FactoryUpdated(address indexed newFactory);

    error EmergencyStopped();
    error InsufficientBalance();
    error InvalidAddress();
    error InvalidHours();
    error DiscountTooHigh();
    error InvalidThresholds();

    struct InitParams {
        address entryPoint;
        address payable factory;
        address gasToken;
        uint256 offPeakStart;
        uint256 offPeakEnd;
        uint64 offPeakDiscount;
        uint64 volumeDiscountThreshold;
        uint64 volumeDiscount;
        uint256 lowEthBalanceThreshold;
        uint256 lowTokenBalanceThreshold;
    }

    function initialize(InitParams memory params) external initializer {
        require(
            params.entryPoint != address(0) && params.factory != address(0) && params.gasToken != address(0),
            "Invalid address"
        );
        require(
            params.offPeakStart < 24 && params.offPeakEnd < 24 && params.offPeakStart < params.offPeakEnd,
            "Invalid hours"
        );
        require(params.offPeakDiscount <= 500, "Discount too high");
        require(params.volumeDiscount <= 500, "Discount too high");
        require(params.lowEthBalanceThreshold > 0 && params.lowTokenBalanceThreshold > 0, "Invalid thresholds");

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(ADMIN_ROLE, msg.sender);
        entryPoint = params.entryPoint;
        factory = params.factory;
        gasToken = params.gasToken;
        offPeakStart = params.offPeakStart;
        offPeakEnd = params.offPeakEnd;
        offPeakDiscount = params.offPeakDiscount;
        volumeDiscountThreshold = params.volumeDiscountThreshold;
        volumeDiscount = params.volumeDiscount;
        lowEthBalanceThreshold = params.lowEthBalanceThreshold;
        lowTokenBalanceThreshold = params.lowTokenBalanceThreshold;

        emit EntryPointUpdated(params.entryPoint);
        emit FactoryUpdated(params.factory);
        emit GasTokenUpdated(params.gasToken);
        emit OffPeakDiscountUpdated(params.offPeakStart, params.offPeakEnd, params.offPeakDiscount);
        emit VolumeDiscountUpdated(params.volumeDiscountThreshold, params.volumeDiscount);
        emit LowBalanceThresholdsUpdated(params.lowEthBalanceThreshold, params.lowTokenBalanceThreshold);
    }

    function _authorizeUpgrade(address newImplementation) internal view override onlyRole(ADMIN_ROLE) {
        require(newImplementation != address(0), "Invalid implementation");
    }

    modifier notEmergencyStopped() {
        if (emergencyStopped) revert EmergencyStopped();
        _;
    }

    function setEmergencyStop(bool stopped) external onlyRole(ADMIN_ROLE) nonReentrant {
        emergencyStopped = stopped;
        emit EmergencyStop(stopped);
    }

    function setEntryPoint(address newEntryPoint) external onlyRole(ADMIN_ROLE) nonReentrant notEmergencyStopped {
        require(newEntryPoint != address(0), "Invalid address");
        entryPoint = newEntryPoint;
        emit EntryPointUpdated(newEntryPoint);
    }

    function setFactory(address payable newFactory) external onlyRole(ADMIN_ROLE) nonReentrant notEmergencyStopped {
        require(newFactory != address(0), "Invalid address");
        factory = newFactory;
        emit FactoryUpdated(newFactory);
    }

    function setGasToken(address newGasToken) external onlyRole(ADMIN_ROLE) nonReentrant notEmergencyStopped {
        require(newGasToken != address(0), "Invalid address");
        gasToken = newGasToken;
        emit GasTokenUpdated(newGasToken);
    }

    function setOffPeakDiscount(uint256 startHour, uint256 endHour, uint64 discount)
        external
        onlyRole(ADMIN_ROLE)
        nonReentrant
        notEmergencyStopped
    {
        require(startHour < 24 && endHour < 24 && startHour < endHour, "Invalid hours");
        require(discount <= 500, "Discount too high");
        offPeakStart = startHour;
        offPeakEnd = endHour;
        offPeakDiscount = discount;
        emit OffPeakDiscountUpdated(startHour, endHour, discount);
    }

    function setVolumeDiscount(uint64 threshold, uint64 discount)
        external
        onlyRole(ADMIN_ROLE)
        nonReentrant
        notEmergencyStopped
    {
        require(discount <= 500, "Discount too high");
        volumeDiscountThreshold = threshold;
        volumeDiscount = discount;
        emit VolumeDiscountUpdated(threshold, discount);
    }

    function setFeeTier(address user, uint64 tier) external onlyRole(ADMIN_ROLE) nonReentrant notEmergencyStopped {
        require(tier <= 500, "Tier too high");
        userFeeTiers[user] = tier;
        emit FeeTierUpdated(user, tier);
    }

    function setLowBalanceThresholds(uint256 ethThreshold, uint256 tokenThreshold)
        external
        onlyRole(ADMIN_ROLE)
        nonReentrant
        notEmergencyStopped
    {
        require(ethThreshold > 0 && tokenThreshold > 0, "Invalid thresholds");
        lowEthBalanceThreshold = ethThreshold;
        lowTokenBalanceThreshold = tokenThreshold;
        emit LowBalanceThresholdsUpdated(ethThreshold, tokenThreshold);
    }

    function depositEth(address user) external payable nonReentrant notEmergencyStopped {
        require(user != address(0), "Invalid user");
        ethBalances[user] += msg.value;
        IEntryPoint(entryPoint).depositTo{value: msg.value}(RyzerWalletFactory(factory).getWallet(user));
        if (ethBalances[user] < lowEthBalanceThreshold) {
            emit LowBalance(user, ethBalances[user], tokenBalances[user]);
        }
        emit GasSponsored(user, msg.value, address(0));
    }

    function depositToken(address user, uint256 amount) external nonReentrant notEmergencyStopped {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Invalid amount");
        IERC20(gasToken).safeTransferFrom(msg.sender, address(this), amount);
        tokenBalances[user] += amount;
        if (tokenBalances[user] < lowTokenBalanceThreshold) {
            emit LowBalance(user, ethBalances[user], tokenBalances[user]);
        }
        emit GasSponsored(user, amount, gasToken);
    }

    function validatePaymasterUserOp(UserOperation calldata userOp, bytes32, /*userOpHash*/ uint256 maxCost)
        external
        nonReentrant
        notEmergencyStopped
        returns (bytes memory context, uint256 validationData)
    {
        require(msg.sender == entryPoint, "Only EntryPoint");
        require(RyzerWalletFactory(factory).isWallet(userOp.sender), "Not a wallet");

        uint64 feeTier = userFeeTiers[userOp.sender];
        if (feeTier == 0) {
            feeTier = 100; // Default 1% fee (100 basis points)
        }

        uint256 hour = (block.timestamp % 86400) / 3600;
        if (hour >= offPeakStart && hour < offPeakEnd && offPeakDiscount > 0) {
            feeTier = feeTier * (10000 - offPeakDiscount) / 10000;
        }

        if (tokenBalances[userOp.sender] >= volumeDiscountThreshold && volumeDiscount > 0) {
            feeTier = feeTier * (10000 - volumeDiscount) / 10000;
        }

        uint256 adjustedCost = (maxCost * (10000 + feeTier)) / 10000;

        if (ethBalances[userOp.sender] >= adjustedCost) {
            ethBalances[userOp.sender] -= adjustedCost;
            if (ethBalances[userOp.sender] < lowEthBalanceThreshold) {
                emit LowBalance(userOp.sender, ethBalances[userOp.sender], tokenBalances[userOp.sender]);
            }
            return (abi.encode(userOp.sender, adjustedCost, address(0)), 0);
        } else if (tokenBalances[userOp.sender] >= adjustedCost) {
            tokenBalances[userOp.sender] -= adjustedCost;
            if (tokenBalances[userOp.sender] < lowTokenBalanceThreshold) {
                emit LowBalance(userOp.sender, ethBalances[userOp.sender], tokenBalances[userOp.sender]);
            }
            return (abi.encode(userOp.sender, adjustedCost, gasToken), 0);
        } else {
            emit GasSponsored(userOp.sender, 0, address(0));
            revert InsufficientBalance();
        }
    }

    function withdrawFunds(address payable recipient, uint256 amount, address token)
        external
        onlyRole(ADMIN_ROLE)
        nonReentrant
        notEmergencyStopped
    {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        if (token == address(0)) {
            require(amount <= address(this).balance, "Insufficient ETH balance");
            (bool sent,) = recipient.call{value: amount}("");
            require(sent, "ETH transfer failed");
        } else {
            require(amount <= IERC20(token).balanceOf(address(this)), "Insufficient token balance");
            IERC20(token).safeTransfer(recipient, amount);
        }
        emit FundsWithdrawn(recipient, amount, token);
    }

    receive() external payable {}
}
