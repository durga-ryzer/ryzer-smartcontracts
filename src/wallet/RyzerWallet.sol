// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */
/* solhint-disable reason-string */

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/core/Helpers.sol";
import "@account-abstraction/contracts/accounts/callback/TokenCallbackHandler.sol";

import "./ERC3643Support.sol";

/**
 * SmartWallet: Semi-custodial smart account that supports ERC-4337 and ERC-3643.
 * Initialized by an admin, but owned by the user. Admin can submit userOps on behalf of the user.
 */
contract RyzerWallet is BaseAccount, TokenCallbackHandler, ERC3643Support, UUPSUpgradeable, Initializable {
    address public owner; // actual user
    address public admin; // account creator / relayer
    address public custodian;

    IEntryPoint private immutable _entryPoint;

    event SignerAdded(address signer);
    event SignerRemoved(address signer);
    event SmartWalletInitialized(IEntryPoint indexed entryPoint, address indexed owner, address indexed admin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Unauthorized");
        _;
    }

    modifier onlyCustodian() {
        require(msg.sender == custodian, "Not authorized custodian");
        _;
    }

    receive() external payable {}

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    function setCustodian(address _custodian) external {
        require(msg.sender == admin, "Not authorized admin");
        require(_custodian != address(0), "Invalid address");
        custodian = _custodian;
    }

    function setOnchainID(address token, address _onchainID) external override onlyCustodian {
        IToken(token).setOnchainID(_onchainID);
    }

    function initialize(address _admin, address _owner) public virtual initializer {
        admin = _admin;
        owner = _owner;
        emit SmartWalletInitialized(_entryPoint, _owner, _admin);
    }

    function addDeposit() public payable {
        entryPoint().depositTo{value: msg.value}(address(this));
    }

    function withdrawDepositTo(address payable withdrawAddress, uint256 amount) public onlyAdmin {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }

    /// validate signature: only user (owner) can authorize UserOperation
    function _validateSignature(PackedUserOperation calldata userOp, bytes32 userOpHash)
        internal
        virtual
        override
        returns (uint256 validationData)
    {
        if (admin != ECDSA.recover(userOpHash, userOp.signature)) {
            return SIG_VALIDATION_FAILED;
        }
        return SIG_VALIDATION_SUCCESS;
    }

    function _requireForExecute() internal view virtual override {
        require(
            msg.sender == address(entryPoint()) || msg.sender == admin || msg.sender == owner, "account: not authorized"
        );
    }

    function _authorizeUpgrade(address newImplementation) internal view override {
        (newImplementation);
        require(msg.sender == admin, "Unauthorized");
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }
}
