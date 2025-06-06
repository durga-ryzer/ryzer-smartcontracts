// SPDX-License-Identifier: MIT
pragma solidity =0.8.29 ^0.8.20 ^0.8.22;

// lib/openzeppelin-contracts/contracts/utils/Errors.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/Errors.sol)

/**
 * @dev Collection of common custom errors used in multiple contracts
 *
 * IMPORTANT: Backwards compatibility is not guaranteed in future versions of the library.
 * It is recommended to avoid relying on the error API for critical functionality.
 *
 * _Available since v5.1._
 */
library Errors {
    /**
     * @dev The ETH balance of the account is not enough to perform the operation.
     */
    error InsufficientBalance(uint256 balance, uint256 needed);

    /**
     * @dev A call to an address target failed. The target may have reverted.
     */
    error FailedCall();

    /**
     * @dev The deployment failed.
     */
    error FailedDeployment();

    /**
     * @dev A necessary precompile is missing.
     */
    error MissingPrecompile(address);
}

// lib/openzeppelin-contracts/contracts/access/IAccessControl.sol

// OpenZeppelin Contracts (last updated v5.3.0) (access/IAccessControl.sol)

/**
 * @dev External interface of AccessControl declared to support ERC-165 detection.
 */
interface IAccessControl {
    /**
     * @dev The `account` is missing a role.
     */
    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);

    /**
     * @dev The caller of a function is not the expected one.
     *
     * NOTE: Don't confuse with {AccessControlUnauthorizedAccount}.
     */
    error AccessControlBadConfirmation();

    /**
     * @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
     *
     * `DEFAULT_ADMIN_ROLE` is the starting admin for all roles, despite
     * {RoleAdminChanged} not being emitted to signal this.
     */
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /**
     * @dev Emitted when `account` is granted `role`.
     *
     * `sender` is the account that originated the contract call. This account bears the admin role (for the granted role).
     * Expected in cases where the role was granted using the internal {AccessControl-_grantRole}.
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Emitted when `account` is revoked `role`.
     *
     * `sender` is the account that originated the contract call:
     *   - if using `revokeRole`, it is the admin role bearer
     *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) external view returns (bool);

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {AccessControl-_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been granted `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     */
    function renounceRole(bytes32 role, address callerConfirmation) external;
}

// lib/openzeppelin-contracts/contracts/proxy/beacon/IBeacon.sol

// OpenZeppelin Contracts (last updated v5.0.0) (proxy/beacon/IBeacon.sol)

/**
 * @dev This is the interface that {BeaconProxy} expects of its beacon.
 */
interface IBeacon {
    /**
     * @dev Must return an address that can be used as a delegate call target.
     *
     * {UpgradeableBeacon} will check that this address is a contract.
     */
    function implementation() external view returns (address);
}

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC1967.sol

// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC1967.sol)

/**
 * @dev ERC-1967: Proxy Storage Slots. This interface contains the events defined in the ERC.
 */
interface IERC1967 {
    /**
     * @dev Emitted when the implementation is upgraded.
     */
    event Upgraded(address indexed implementation);

    /**
     * @dev Emitted when the admin account has changed.
     */
    event AdminChanged(address previousAdmin, address newAdmin);

    /**
     * @dev Emitted when the beacon is changed.
     */
    event BeaconUpgraded(address indexed beacon);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol

// OpenZeppelin Contracts (last updated v5.3.0) (proxy/utils/Initializable.sol)

/**
 * @dev This is a base contract to aid in writing upgradeable contracts, or any kind of contract that will be deployed
 * behind a proxy. Since proxied contracts do not make use of a constructor, it's common to move constructor logic to an
 * external initializer function, usually called `initialize`. It then becomes necessary to protect this initializer
 * function so it can only be called once. The {initializer} modifier provided by this contract will have this effect.
 *
 * The initialization functions use a version number. Once a version number is used, it is consumed and cannot be
 * reused. This mechanism prevents re-execution of each "step" but allows the creation of new initialization steps in
 * case an upgrade adds a module that needs to be initialized.
 *
 * For example:
 *
 * [.hljs-theme-light.nopadding]
 * ```solidity
 * contract MyToken is ERC20Upgradeable {
 *     function initialize() initializer public {
 *         __ERC20_init("MyToken", "MTK");
 *     }
 * }
 *
 * contract MyTokenV2 is MyToken, ERC20PermitUpgradeable {
 *     function initializeV2() reinitializer(2) public {
 *         __ERC20Permit_init("MyToken");
 *     }
 * }
 * ```
 *
 * TIP: To avoid leaving the proxy in an uninitialized state, the initializer function should be called as early as
 * possible by providing the encoded function call as the `_data` argument to {ERC1967Proxy-constructor}.
 *
 * CAUTION: When used with inheritance, manual care must be taken to not invoke a parent initializer twice, or to ensure
 * that all initializers are idempotent. This is not verified automatically as constructors are by Solidity.
 *
 * [CAUTION]
 * ====
 * Avoid leaving a contract uninitialized.
 *
 * An uninitialized contract can be taken over by an attacker. This applies to both a proxy and its implementation
 * contract, which may impact the proxy. To prevent the implementation contract from being used, you should invoke
 * the {_disableInitializers} function in the constructor to automatically lock it when it is deployed:
 *
 * [.hljs-theme-light.nopadding]
 * ```
 * /// @custom:oz-upgrades-unsafe-allow constructor
 * constructor() {
 *     _disableInitializers();
 * }
 * ```
 * ====
 */
abstract contract Initializable {
    /**
     * @dev Storage of the initializable contract.
     *
     * It's implemented on a custom ERC-7201 namespace to reduce the risk of storage collisions
     * when using with upgradeable contracts.
     *
     * @custom:storage-location erc7201:openzeppelin.storage.Initializable
     */
    struct InitializableStorage {
        /**
         * @dev Indicates that the contract has been initialized.
         */
        uint64 _initialized;
        /**
         * @dev Indicates that the contract is in the process of being initialized.
         */
        bool _initializing;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Initializable")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant INITIALIZABLE_STORAGE = 0xf0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00;

    /**
     * @dev The contract is already initialized.
     */
    error InvalidInitialization();

    /**
     * @dev The contract is not initializing.
     */
    error NotInitializing();

    /**
     * @dev Triggered when the contract has been initialized or reinitialized.
     */
    event Initialized(uint64 version);

    /**
     * @dev A modifier that defines a protected initializer function that can be invoked at most once. In its scope,
     * `onlyInitializing` functions can be used to initialize parent contracts.
     *
     * Similar to `reinitializer(1)`, except that in the context of a constructor an `initializer` may be invoked any
     * number of times. This behavior in the constructor can be useful during testing and is not expected to be used in
     * production.
     *
     * Emits an {Initialized} event.
     */
    modifier initializer() {
        // solhint-disable-next-line var-name-mixedcase
        InitializableStorage storage $ = _getInitializableStorage();

        // Cache values to avoid duplicated sloads
        bool isTopLevelCall = !$._initializing;
        uint64 initialized = $._initialized;

        // Allowed calls:
        // - initialSetup: the contract is not in the initializing state and no previous version was
        //                 initialized
        // - construction: the contract is initialized at version 1 (no reinitialization) and the
        //                 current contract is just being deployed
        bool initialSetup = initialized == 0 && isTopLevelCall;
        bool construction = initialized == 1 && address(this).code.length == 0;

        if (!initialSetup && !construction) {
            revert InvalidInitialization();
        }
        $._initialized = 1;
        if (isTopLevelCall) {
            $._initializing = true;
        }
        _;
        if (isTopLevelCall) {
            $._initializing = false;
            emit Initialized(1);
        }
    }

    /**
     * @dev A modifier that defines a protected reinitializer function that can be invoked at most once, and only if the
     * contract hasn't been initialized to a greater version before. In its scope, `onlyInitializing` functions can be
     * used to initialize parent contracts.
     *
     * A reinitializer may be used after the original initialization step. This is essential to configure modules that
     * are added through upgrades and that require initialization.
     *
     * When `version` is 1, this modifier is similar to `initializer`, except that functions marked with `reinitializer`
     * cannot be nested. If one is invoked in the context of another, execution will revert.
     *
     * Note that versions can jump in increments greater than 1; this implies that if multiple reinitializers coexist in
     * a contract, executing them in the right order is up to the developer or operator.
     *
     * WARNING: Setting the version to 2**64 - 1 will prevent any future reinitialization.
     *
     * Emits an {Initialized} event.
     */
    modifier reinitializer(uint64 version) {
        // solhint-disable-next-line var-name-mixedcase
        InitializableStorage storage $ = _getInitializableStorage();

        if ($._initializing || $._initialized >= version) {
            revert InvalidInitialization();
        }
        $._initialized = version;
        $._initializing = true;
        _;
        $._initializing = false;
        emit Initialized(version);
    }

    /**
     * @dev Modifier to protect an initialization function so that it can only be invoked by functions with the
     * {initializer} and {reinitializer} modifiers, directly or indirectly.
     */
    modifier onlyInitializing() {
        _checkInitializing();
        _;
    }

    /**
     * @dev Reverts if the contract is not in an initializing state. See {onlyInitializing}.
     */
    function _checkInitializing() internal view virtual {
        if (!_isInitializing()) {
            revert NotInitializing();
        }
    }

    /**
     * @dev Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
     * Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
     * to any version. It is recommended to use this to lock implementation contracts that are designed to be called
     * through proxies.
     *
     * Emits an {Initialized} event the first time it is successfully executed.
     */
    function _disableInitializers() internal virtual {
        // solhint-disable-next-line var-name-mixedcase
        InitializableStorage storage $ = _getInitializableStorage();

        if ($._initializing) {
            revert InvalidInitialization();
        }
        if ($._initialized != type(uint64).max) {
            $._initialized = type(uint64).max;
            emit Initialized(type(uint64).max);
        }
    }

    /**
     * @dev Returns the highest version that has been initialized. See {reinitializer}.
     */
    function _getInitializedVersion() internal view returns (uint64) {
        return _getInitializableStorage()._initialized;
    }

    /**
     * @dev Returns `true` if the contract is currently initializing. See {onlyInitializing}.
     */
    function _isInitializing() internal view returns (bool) {
        return _getInitializableStorage()._initializing;
    }

    /**
     * @dev Pointer to storage slot. Allows integrators to override it with a custom storage location.
     *
     * NOTE: Consider following the ERC-7201 formula to derive storage locations.
     */
    function _initializableStorageSlot() internal pure virtual returns (bytes32) {
        return INITIALIZABLE_STORAGE;
    }

    /**
     * @dev Returns a pointer to the storage namespace.
     */
    // solhint-disable-next-line var-name-mixedcase
    function _getInitializableStorage() private pure returns (InitializableStorage storage $) {
        bytes32 slot = _initializableStorageSlot();
        assembly {
            $.slot := slot
        }
    }
}

// lib/openzeppelin-contracts/contracts/utils/StorageSlot.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/draft-IERC1822.sol

// OpenZeppelin Contracts (last updated v5.1.0) (interfaces/draft-IERC1822.sol)

/**
 * @dev ERC-1822: Universal Upgradeable Proxy Standard (UUPS) documents a method for upgradeability through a simplified
 * proxy whose upgrades are fully controlled by the current implementation.
 */
interface IERC1822Proxiable {
    /**
     * @dev Returns the storage slot that the proxiable contract assumes is being used to store the implementation
     * address.
     *
     * IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks
     * bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this
     * function revert if invoked through a proxy.
     */
    function proxiableUUID() external view returns (bytes32);
}

// lib/openzeppelin-contracts/contracts/utils/Address.sol

// OpenZeppelin Contracts (last updated v5.2.0) (utils/Address.sol)

/**
 * @dev Collection of functions related to the address type
 */
library Address {
    /**
     * @dev There's no code at `target` (it is not a contract).
     */
    error AddressEmptyCode(address target);

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://consensys.net/diligence/blog/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.8.20/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        if (address(this).balance < amount) {
            revert Errors.InsufficientBalance(address(this).balance, amount);
        }

        (bool success, bytes memory returndata) = recipient.call{value: amount}("");
        if (!success) {
            _revert(returndata);
        }
    }

    /**
     * @dev Performs a Solidity function call using a low level `call`. A
     * plain `call` is an unsafe replacement for a function call: use this
     * function instead.
     *
     * If `target` reverts with a revert reason or custom error, it is bubbled
     * up by this function (like regular Solidity function calls). However, if
     * the call reverted with no returned reason, this function reverts with a
     * {Errors.FailedCall} error.
     *
     * Returns the raw returned data. To convert to the expected return value,
     * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
     *
     * Requirements:
     *
     * - `target` must be a contract.
     * - calling `target` with `data` must not revert.
     */
    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but also transferring `value` wei to `target`.
     *
     * Requirements:
     *
     * - the calling contract must have an ETH balance of at least `value`.
     * - the called Solidity function must be `payable`.
     */
    function functionCallWithValue(address target, bytes memory data, uint256 value) internal returns (bytes memory) {
        if (address(this).balance < value) {
            revert Errors.InsufficientBalance(address(this).balance, value);
        }
        (bool success, bytes memory returndata) = target.call{value: value}(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a static call.
     */
    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a delegate call.
     */
    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    /**
     * @dev Tool to verify that a low level call to smart-contract was successful, and reverts if the target
     * was not a contract or bubbling up the revert reason (falling back to {Errors.FailedCall}) in case
     * of an unsuccessful call.
     */
    function verifyCallResultFromTarget(
        address target,
        bool success,
        bytes memory returndata
    ) internal view returns (bytes memory) {
        if (!success) {
            _revert(returndata);
        } else {
            // only check if target is a contract if the call was successful and the return data is empty
            // otherwise we already know that it was a contract
            if (returndata.length == 0 && target.code.length == 0) {
                revert AddressEmptyCode(target);
            }
            return returndata;
        }
    }

    /**
     * @dev Tool to verify that a low level call was successful, and reverts if it wasn't, either by bubbling the
     * revert reason or with a default {Errors.FailedCall} error.
     */
    function verifyCallResult(bool success, bytes memory returndata) internal pure returns (bytes memory) {
        if (!success) {
            _revert(returndata);
        } else {
            return returndata;
        }
    }

    /**
     * @dev Reverts with returndata if present. Otherwise reverts with {Errors.FailedCall}.
     */
    function _revert(bytes memory returndata) private pure {
        // Look for revert reason and bubble it up if present
        if (returndata.length > 0) {
            // The easiest way to bubble the revert reason is using memory via assembly
            assembly ("memory-safe") {
                let returndata_size := mload(returndata)
                revert(add(32, returndata), returndata_size)
            }
        } else {
            revert Errors.FailedCall();
        }
    }
}

// lib/openzeppelin-contracts-upgradeable/contracts/utils/ContextUpgradeable.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract ContextUpgradeable is Initializable {
    function __Context_init() internal onlyInitializing {
    }

    function __Context_init_unchained() internal onlyInitializing {
    }
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// lib/openzeppelin-contracts/contracts/utils/Create2.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/Create2.sol)

/**
 * @dev Helper to make usage of the `CREATE2` EVM opcode easier and safer.
 * `CREATE2` can be used to compute in advance the address where a smart
 * contract will be deployed, which allows for interesting new mechanisms known
 * as 'counterfactual interactions'.
 *
 * See the https://eips.ethereum.org/EIPS/eip-1014#motivation[EIP] for more
 * information.
 */
library Create2 {
    /**
     * @dev There's no code to deploy.
     */
    error Create2EmptyBytecode();

    /**
     * @dev Deploys a contract using `CREATE2`. The address where the contract
     * will be deployed can be known in advance via {computeAddress}.
     *
     * The bytecode for a contract can be obtained from Solidity with
     * `type(contractName).creationCode`.
     *
     * Requirements:
     *
     * - `bytecode` must not be empty.
     * - `salt` must have not been used for `bytecode` already.
     * - the factory must have a balance of at least `amount`.
     * - if `amount` is non-zero, `bytecode` must have a `payable` constructor.
     */
    function deploy(uint256 amount, bytes32 salt, bytes memory bytecode) internal returns (address addr) {
        if (address(this).balance < amount) {
            revert Errors.InsufficientBalance(address(this).balance, amount);
        }
        if (bytecode.length == 0) {
            revert Create2EmptyBytecode();
        }
        assembly ("memory-safe") {
            addr := create2(amount, add(bytecode, 0x20), mload(bytecode), salt)
            // if no address was created, and returndata is not empty, bubble revert
            if and(iszero(addr), not(iszero(returndatasize()))) {
                let p := mload(0x40)
                returndatacopy(p, 0, returndatasize())
                revert(p, returndatasize())
            }
        }
        if (addr == address(0)) {
            revert Errors.FailedDeployment();
        }
    }

    /**
     * @dev Returns the address where a contract will be stored if deployed via {deploy}. Any change in the
     * `bytecodeHash` or `salt` will result in a new destination address.
     */
    function computeAddress(bytes32 salt, bytes32 bytecodeHash) internal view returns (address) {
        return computeAddress(salt, bytecodeHash, address(this));
    }

    /**
     * @dev Returns the address where a contract will be stored if deployed via {deploy} from a contract located at
     * `deployer`. If `deployer` is this contract's address, returns the same value as {computeAddress}.
     */
    function computeAddress(bytes32 salt, bytes32 bytecodeHash, address deployer) internal pure returns (address addr) {
        assembly ("memory-safe") {
            let ptr := mload(0x40) // Get free memory pointer

            // |                   | ↓ ptr ...  ↓ ptr + 0x0B (start) ...  ↓ ptr + 0x20 ...  ↓ ptr + 0x40 ...   |
            // |-------------------|---------------------------------------------------------------------------|
            // | bytecodeHash      |                                                        CCCCCCCCCCCCC...CC |
            // | salt              |                                      BBBBBBBBBBBBB...BB                   |
            // | deployer          | 000000...0000AAAAAAAAAAAAAAAAAAA...AA                                     |
            // | 0xFF              |            FF                                                             |
            // |-------------------|---------------------------------------------------------------------------|
            // | memory            | 000000...00FFAAAAAAAAAAAAAAAAAAA...AABBBBBBBBBBBBB...BBCCCCCCCCCCCCC...CC |
            // | keccak(start, 85) |            ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ |

            mstore(add(ptr, 0x40), bytecodeHash)
            mstore(add(ptr, 0x20), salt)
            mstore(ptr, deployer) // Right-aligned with 12 preceding garbage bytes
            let start := add(ptr, 0x0b) // The hashed data starts at the final garbage byte which we will set to 0xff
            mstore8(start, 0xff)
            addr := and(keccak256(start, 85), 0xffffffffffffffffffffffffffffffffffffffff)
        }
    }
}

// lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol

// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/extensions/IERC20Metadata.sol)

/**
 * @dev Interface for the optional metadata functions from the ERC-20 standard.
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}

// lib/openzeppelin-contracts-upgradeable/contracts/utils/ReentrancyGuardUpgradeable.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuardUpgradeable is Initializable {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /// @custom:storage-location erc7201:openzeppelin.storage.ReentrancyGuard
    struct ReentrancyGuardStorage {
        uint256 _status;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant ReentrancyGuardStorageLocation = 0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    function _getReentrancyGuardStorage() private pure returns (ReentrancyGuardStorage storage $) {
        assembly {
            $.slot := ReentrancyGuardStorageLocation
        }
    }

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    function __ReentrancyGuard_init() internal onlyInitializing {
        __ReentrancyGuard_init_unchained();
    }

    function __ReentrancyGuard_init_unchained() internal onlyInitializing {
        ReentrancyGuardStorage storage $ = _getReentrancyGuardStorage();
        $._status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        ReentrancyGuardStorage storage $ = _getReentrancyGuardStorage();
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if ($._status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        $._status = ENTERED;
    }

    function _nonReentrantAfter() private {
        ReentrancyGuardStorage storage $ = _getReentrancyGuardStorage();
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        $._status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        ReentrancyGuardStorage storage $ = _getReentrancyGuardStorage();
        return $._status == ENTERED;
    }
}

// lib/openzeppelin-contracts/contracts/proxy/Clones.sol

// OpenZeppelin Contracts (last updated v5.3.0) (proxy/Clones.sol)

/**
 * @dev https://eips.ethereum.org/EIPS/eip-1167[ERC-1167] is a standard for
 * deploying minimal proxy contracts, also known as "clones".
 *
 * > To simply and cheaply clone contract functionality in an immutable way, this standard specifies
 * > a minimal bytecode implementation that delegates all calls to a known, fixed address.
 *
 * The library includes functions to deploy a proxy using either `create` (traditional deployment) or `create2`
 * (salted deterministic deployment). It also includes functions to predict the addresses of clones deployed using the
 * deterministic method.
 */
library Clones {
    error CloneArgumentsTooLong();

    /**
     * @dev Deploys and returns the address of a clone that mimics the behavior of `implementation`.
     *
     * This function uses the create opcode, which should never revert.
     */
    function clone(address implementation) internal returns (address instance) {
        return clone(implementation, 0);
    }

    /**
     * @dev Same as {xref-Clones-clone-address-}[clone], but with a `value` parameter to send native currency
     * to the new contract.
     *
     * NOTE: Using a non-zero value at creation will require the contract using this function (e.g. a factory)
     * to always have enough balance for new deployments. Consider exposing this function under a payable method.
     */
    function clone(address implementation, uint256 value) internal returns (address instance) {
        if (address(this).balance < value) {
            revert Errors.InsufficientBalance(address(this).balance, value);
        }
        assembly ("memory-safe") {
            // Cleans the upper 96 bits of the `implementation` word, then packs the first 3 bytes
            // of the `implementation` address with the bytecode before the address.
            mstore(0x00, or(shr(0xe8, shl(0x60, implementation)), 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000))
            // Packs the remaining 17 bytes of `implementation` with the bytecode after the address.
            mstore(0x20, or(shl(0x78, implementation), 0x5af43d82803e903d91602b57fd5bf3))
            instance := create(value, 0x09, 0x37)
        }
        if (instance == address(0)) {
            revert Errors.FailedDeployment();
        }
    }

    /**
     * @dev Deploys and returns the address of a clone that mimics the behavior of `implementation`.
     *
     * This function uses the create2 opcode and a `salt` to deterministically deploy
     * the clone. Using the same `implementation` and `salt` multiple times will revert, since
     * the clones cannot be deployed twice at the same address.
     */
    function cloneDeterministic(address implementation, bytes32 salt) internal returns (address instance) {
        return cloneDeterministic(implementation, salt, 0);
    }

    /**
     * @dev Same as {xref-Clones-cloneDeterministic-address-bytes32-}[cloneDeterministic], but with
     * a `value` parameter to send native currency to the new contract.
     *
     * NOTE: Using a non-zero value at creation will require the contract using this function (e.g. a factory)
     * to always have enough balance for new deployments. Consider exposing this function under a payable method.
     */
    function cloneDeterministic(
        address implementation,
        bytes32 salt,
        uint256 value
    ) internal returns (address instance) {
        if (address(this).balance < value) {
            revert Errors.InsufficientBalance(address(this).balance, value);
        }
        assembly ("memory-safe") {
            // Cleans the upper 96 bits of the `implementation` word, then packs the first 3 bytes
            // of the `implementation` address with the bytecode before the address.
            mstore(0x00, or(shr(0xe8, shl(0x60, implementation)), 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000))
            // Packs the remaining 17 bytes of `implementation` with the bytecode after the address.
            mstore(0x20, or(shl(0x78, implementation), 0x5af43d82803e903d91602b57fd5bf3))
            instance := create2(value, 0x09, 0x37, salt)
        }
        if (instance == address(0)) {
            revert Errors.FailedDeployment();
        }
    }

    /**
     * @dev Computes the address of a clone deployed using {Clones-cloneDeterministic}.
     */
    function predictDeterministicAddress(
        address implementation,
        bytes32 salt,
        address deployer
    ) internal pure returns (address predicted) {
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            mstore(add(ptr, 0x38), deployer)
            mstore(add(ptr, 0x24), 0x5af43d82803e903d91602b57fd5bf3ff)
            mstore(add(ptr, 0x14), implementation)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73)
            mstore(add(ptr, 0x58), salt)
            mstore(add(ptr, 0x78), keccak256(add(ptr, 0x0c), 0x37))
            predicted := and(keccak256(add(ptr, 0x43), 0x55), 0xffffffffffffffffffffffffffffffffffffffff)
        }
    }

    /**
     * @dev Computes the address of a clone deployed using {Clones-cloneDeterministic}.
     */
    function predictDeterministicAddress(
        address implementation,
        bytes32 salt
    ) internal view returns (address predicted) {
        return predictDeterministicAddress(implementation, salt, address(this));
    }

    /**
     * @dev Deploys and returns the address of a clone that mimics the behavior of `implementation` with custom
     * immutable arguments. These are provided through `args` and cannot be changed after deployment. To
     * access the arguments within the implementation, use {fetchCloneArgs}.
     *
     * This function uses the create opcode, which should never revert.
     */
    function cloneWithImmutableArgs(address implementation, bytes memory args) internal returns (address instance) {
        return cloneWithImmutableArgs(implementation, args, 0);
    }

    /**
     * @dev Same as {xref-Clones-cloneWithImmutableArgs-address-bytes-}[cloneWithImmutableArgs], but with a `value`
     * parameter to send native currency to the new contract.
     *
     * NOTE: Using a non-zero value at creation will require the contract using this function (e.g. a factory)
     * to always have enough balance for new deployments. Consider exposing this function under a payable method.
     */
    function cloneWithImmutableArgs(
        address implementation,
        bytes memory args,
        uint256 value
    ) internal returns (address instance) {
        if (address(this).balance < value) {
            revert Errors.InsufficientBalance(address(this).balance, value);
        }
        bytes memory bytecode = _cloneCodeWithImmutableArgs(implementation, args);
        assembly ("memory-safe") {
            instance := create(value, add(bytecode, 0x20), mload(bytecode))
        }
        if (instance == address(0)) {
            revert Errors.FailedDeployment();
        }
    }

    /**
     * @dev Deploys and returns the address of a clone that mimics the behavior of `implementation` with custom
     * immutable arguments. These are provided through `args` and cannot be changed after deployment. To
     * access the arguments within the implementation, use {fetchCloneArgs}.
     *
     * This function uses the create2 opcode and a `salt` to deterministically deploy the clone. Using the same
     * `implementation`, `args` and `salt` multiple times will revert, since the clones cannot be deployed twice
     * at the same address.
     */
    function cloneDeterministicWithImmutableArgs(
        address implementation,
        bytes memory args,
        bytes32 salt
    ) internal returns (address instance) {
        return cloneDeterministicWithImmutableArgs(implementation, args, salt, 0);
    }

    /**
     * @dev Same as {xref-Clones-cloneDeterministicWithImmutableArgs-address-bytes-bytes32-}[cloneDeterministicWithImmutableArgs],
     * but with a `value` parameter to send native currency to the new contract.
     *
     * NOTE: Using a non-zero value at creation will require the contract using this function (e.g. a factory)
     * to always have enough balance for new deployments. Consider exposing this function under a payable method.
     */
    function cloneDeterministicWithImmutableArgs(
        address implementation,
        bytes memory args,
        bytes32 salt,
        uint256 value
    ) internal returns (address instance) {
        bytes memory bytecode = _cloneCodeWithImmutableArgs(implementation, args);
        return Create2.deploy(value, salt, bytecode);
    }

    /**
     * @dev Computes the address of a clone deployed using {Clones-cloneDeterministicWithImmutableArgs}.
     */
    function predictDeterministicAddressWithImmutableArgs(
        address implementation,
        bytes memory args,
        bytes32 salt,
        address deployer
    ) internal pure returns (address predicted) {
        bytes memory bytecode = _cloneCodeWithImmutableArgs(implementation, args);
        return Create2.computeAddress(salt, keccak256(bytecode), deployer);
    }

    /**
     * @dev Computes the address of a clone deployed using {Clones-cloneDeterministicWithImmutableArgs}.
     */
    function predictDeterministicAddressWithImmutableArgs(
        address implementation,
        bytes memory args,
        bytes32 salt
    ) internal view returns (address predicted) {
        return predictDeterministicAddressWithImmutableArgs(implementation, args, salt, address(this));
    }

    /**
     * @dev Get the immutable args attached to a clone.
     *
     * - If `instance` is a clone that was deployed using `clone` or `cloneDeterministic`, this
     *   function will return an empty array.
     * - If `instance` is a clone that was deployed using `cloneWithImmutableArgs` or
     *   `cloneDeterministicWithImmutableArgs`, this function will return the args array used at
     *   creation.
     * - If `instance` is NOT a clone deployed using this library, the behavior is undefined. This
     *   function should only be used to check addresses that are known to be clones.
     */
    function fetchCloneArgs(address instance) internal view returns (bytes memory) {
        bytes memory result = new bytes(instance.code.length - 45); // revert if length is too short
        assembly ("memory-safe") {
            extcodecopy(instance, add(result, 32), 45, mload(result))
        }
        return result;
    }

    /**
     * @dev Helper that prepares the initcode of the proxy with immutable args.
     *
     * An assembly variant of this function requires copying the `args` array, which can be efficiently done using
     * `mcopy`. Unfortunately, that opcode is not available before cancun. A pure solidity implementation using
     * abi.encodePacked is more expensive but also more portable and easier to review.
     *
     * NOTE: https://eips.ethereum.org/EIPS/eip-170[EIP-170] limits the length of the contract code to 24576 bytes.
     * With the proxy code taking 45 bytes, that limits the length of the immutable args to 24531 bytes.
     */
    function _cloneCodeWithImmutableArgs(
        address implementation,
        bytes memory args
    ) private pure returns (bytes memory) {
        if (args.length > 24531) revert CloneArgumentsTooLong();
        return
            abi.encodePacked(
                hex"61",
                uint16(args.length + 45),
                hex"3d81600a3d39f3363d3d373d3d3d363d73",
                implementation,
                hex"5af43d82803e903d91602b57fd5bf3",
                args
            );
    }
}

// lib/openzeppelin-contracts-upgradeable/contracts/utils/introspection/ERC165Upgradeable.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/ERC165.sol)

/**
 * @dev Implementation of the {IERC165} interface.
 *
 * Contracts that want to implement ERC-165 should inherit from this contract and override {supportsInterface} to check
 * for the additional interface id that will be supported. For example:
 *
 * ```solidity
 * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
 *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
 * }
 * ```
 */
abstract contract ERC165Upgradeable is Initializable, IERC165 {
    function __ERC165_init() internal onlyInitializing {
    }

    function __ERC165_init_unchained() internal onlyInitializing {
    }
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

// lib/openzeppelin-contracts-upgradeable/contracts/utils/PausableUpgradeable.sol

// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract PausableUpgradeable is Initializable, ContextUpgradeable {
    /// @custom:storage-location erc7201:openzeppelin.storage.Pausable
    struct PausableStorage {
        bool _paused;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Pausable")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant PausableStorageLocation = 0xcd5ed15c6e187e77e9aee88184c21f4f2182ab5827cb3b7e07fbedcd63f03300;

    function _getPausableStorage() private pure returns (PausableStorage storage $) {
        assembly {
            $.slot := PausableStorageLocation
        }
    }

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    function __Pausable_init() internal onlyInitializing {
    }

    function __Pausable_init_unchained() internal onlyInitializing {
    }
    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        PausableStorage storage $ = _getPausableStorage();
        return $._paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        PausableStorage storage $ = _getPausableStorage();
        $._paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        PausableStorage storage $ = _getPausableStorage();
        $._paused = false;
        emit Unpaused(_msgSender());
    }
}

// lib/openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol

// OpenZeppelin Contracts (last updated v5.3.0) (access/AccessControl.sol)

/**
 * @dev Contract module that allows children to implement role-based access
 * control mechanisms. This is a lightweight version that doesn't allow enumerating role
 * members except through off-chain means by accessing the contract event logs. Some
 * applications may benefit from on-chain enumerability, for those cases see
 * {AccessControlEnumerable}.
 *
 * Roles are referred to by their `bytes32` identifier. These should be exposed
 * in the external API and be unique. The best way to achieve this is by
 * using `public constant` hash digests:
 *
 * ```solidity
 * bytes32 public constant MY_ROLE = keccak256("MY_ROLE");
 * ```
 *
 * Roles can be used to represent a set of permissions. To restrict access to a
 * function call, use {hasRole}:
 *
 * ```solidity
 * function foo() public {
 *     require(hasRole(MY_ROLE, msg.sender));
 *     ...
 * }
 * ```
 *
 * Roles can be granted and revoked dynamically via the {grantRole} and
 * {revokeRole} functions. Each role has an associated admin role, and only
 * accounts that have a role's admin role can call {grantRole} and {revokeRole}.
 *
 * By default, the admin role for all roles is `DEFAULT_ADMIN_ROLE`, which means
 * that only accounts with this role will be able to grant or revoke other
 * roles. More complex role relationships can be created by using
 * {_setRoleAdmin}.
 *
 * WARNING: The `DEFAULT_ADMIN_ROLE` is also its own admin: it has permission to
 * grant and revoke this role. Extra precautions should be taken to secure
 * accounts that have been granted it. We recommend using {AccessControlDefaultAdminRules}
 * to enforce additional security measures for this role.
 */
abstract contract AccessControlUpgradeable is Initializable, ContextUpgradeable, IAccessControl, ERC165Upgradeable {
    struct RoleData {
        mapping(address account => bool) hasRole;
        bytes32 adminRole;
    }

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /// @custom:storage-location erc7201:openzeppelin.storage.AccessControl
    struct AccessControlStorage {
        mapping(bytes32 role => RoleData) _roles;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.AccessControl")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant AccessControlStorageLocation = 0x02dd7bc7dec4dceedda775e58dd541e08a116c6c53815c0bd028192f7b626800;

    function _getAccessControlStorage() private pure returns (AccessControlStorage storage $) {
        assembly {
            $.slot := AccessControlStorageLocation
        }
    }

    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with an {AccessControlUnauthorizedAccount} error including the required role.
     */
    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    function __AccessControl_init() internal onlyInitializing {
    }

    function __AccessControl_init_unchained() internal onlyInitializing {
    }
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAccessControl).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        return $._roles[role].hasRole[account];
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `_msgSender()`
     * is missing `role`. Overriding this function changes the behavior of the {onlyRole} modifier.
     */
    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `account`
     * is missing `role`.
     */
    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert AccessControlUnauthorizedAccount(account, role);
        }
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) public view virtual returns (bytes32) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        return $._roles[role].adminRole;
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleGranted} event.
     */
    function grantRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleRevoked} event.
     */
    function revokeRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been revoked `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     *
     * May emit a {RoleRevoked} event.
     */
    function renounceRole(bytes32 role, address callerConfirmation) public virtual {
        if (callerConfirmation != _msgSender()) {
            revert AccessControlBadConfirmation();
        }

        _revokeRole(role, callerConfirmation);
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     *
     * Emits a {RoleAdminChanged} event.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        AccessControlStorage storage $ = _getAccessControlStorage();
        bytes32 previousAdminRole = getRoleAdmin(role);
        $._roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    /**
     * @dev Attempts to grant `role` to `account` and returns a boolean indicating if `role` was granted.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleGranted} event.
     */
    function _grantRole(bytes32 role, address account) internal virtual returns (bool) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        if (!hasRole(role, account)) {
            $._roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Attempts to revoke `role` from `account` and returns a boolean indicating if `role` was revoked.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleRevoked} event.
     */
    function _revokeRole(bytes32 role, address account) internal virtual returns (bool) {
        AccessControlStorage storage $ = _getAccessControlStorage();
        if (hasRole(role, account)) {
            $._roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }
}

// lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Utils.sol

// OpenZeppelin Contracts (last updated v5.2.0) (proxy/ERC1967/ERC1967Utils.sol)

/**
 * @dev This library provides getters and event emitting update functions for
 * https://eips.ethereum.org/EIPS/eip-1967[ERC-1967] slots.
 */
library ERC1967Utils {
    /**
     * @dev Storage slot with the address of the current implementation.
     * This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1.
     */
    // solhint-disable-next-line private-vars-leading-underscore
    bytes32 internal constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    /**
     * @dev The `implementation` of the proxy is invalid.
     */
    error ERC1967InvalidImplementation(address implementation);

    /**
     * @dev The `admin` of the proxy is invalid.
     */
    error ERC1967InvalidAdmin(address admin);

    /**
     * @dev The `beacon` of the proxy is invalid.
     */
    error ERC1967InvalidBeacon(address beacon);

    /**
     * @dev An upgrade function sees `msg.value > 0` that may be lost.
     */
    error ERC1967NonPayable();

    /**
     * @dev Returns the current implementation address.
     */
    function getImplementation() internal view returns (address) {
        return StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value;
    }

    /**
     * @dev Stores a new address in the ERC-1967 implementation slot.
     */
    function _setImplementation(address newImplementation) private {
        if (newImplementation.code.length == 0) {
            revert ERC1967InvalidImplementation(newImplementation);
        }
        StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value = newImplementation;
    }

    /**
     * @dev Performs implementation upgrade with additional setup call if data is nonempty.
     * This function is payable only if the setup call is performed, otherwise `msg.value` is rejected
     * to avoid stuck value in the contract.
     *
     * Emits an {IERC1967-Upgraded} event.
     */
    function upgradeToAndCall(address newImplementation, bytes memory data) internal {
        _setImplementation(newImplementation);
        emit IERC1967.Upgraded(newImplementation);

        if (data.length > 0) {
            Address.functionDelegateCall(newImplementation, data);
        } else {
            _checkNonPayable();
        }
    }

    /**
     * @dev Storage slot with the admin of the contract.
     * This is the keccak-256 hash of "eip1967.proxy.admin" subtracted by 1.
     */
    // solhint-disable-next-line private-vars-leading-underscore
    bytes32 internal constant ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    /**
     * @dev Returns the current admin.
     *
     * TIP: To get this value clients can read directly from the storage slot shown below (specified by ERC-1967) using
     * the https://eth.wiki/json-rpc/API#eth_getstorageat[`eth_getStorageAt`] RPC call.
     * `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`
     */
    function getAdmin() internal view returns (address) {
        return StorageSlot.getAddressSlot(ADMIN_SLOT).value;
    }

    /**
     * @dev Stores a new address in the ERC-1967 admin slot.
     */
    function _setAdmin(address newAdmin) private {
        if (newAdmin == address(0)) {
            revert ERC1967InvalidAdmin(address(0));
        }
        StorageSlot.getAddressSlot(ADMIN_SLOT).value = newAdmin;
    }

    /**
     * @dev Changes the admin of the proxy.
     *
     * Emits an {IERC1967-AdminChanged} event.
     */
    function changeAdmin(address newAdmin) internal {
        emit IERC1967.AdminChanged(getAdmin(), newAdmin);
        _setAdmin(newAdmin);
    }

    /**
     * @dev The storage slot of the UpgradeableBeacon contract which defines the implementation for this proxy.
     * This is the keccak-256 hash of "eip1967.proxy.beacon" subtracted by 1.
     */
    // solhint-disable-next-line private-vars-leading-underscore
    bytes32 internal constant BEACON_SLOT = 0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50;

    /**
     * @dev Returns the current beacon.
     */
    function getBeacon() internal view returns (address) {
        return StorageSlot.getAddressSlot(BEACON_SLOT).value;
    }

    /**
     * @dev Stores a new beacon in the ERC-1967 beacon slot.
     */
    function _setBeacon(address newBeacon) private {
        if (newBeacon.code.length == 0) {
            revert ERC1967InvalidBeacon(newBeacon);
        }

        StorageSlot.getAddressSlot(BEACON_SLOT).value = newBeacon;

        address beaconImplementation = IBeacon(newBeacon).implementation();
        if (beaconImplementation.code.length == 0) {
            revert ERC1967InvalidImplementation(beaconImplementation);
        }
    }

    /**
     * @dev Change the beacon and trigger a setup call if data is nonempty.
     * This function is payable only if the setup call is performed, otherwise `msg.value` is rejected
     * to avoid stuck value in the contract.
     *
     * Emits an {IERC1967-BeaconUpgraded} event.
     *
     * CAUTION: Invoking this function has no effect on an instance of {BeaconProxy} since v5, since
     * it uses an immutable beacon without looking at the value of the ERC-1967 beacon slot for
     * efficiency.
     */
    function upgradeBeaconToAndCall(address newBeacon, bytes memory data) internal {
        _setBeacon(newBeacon);
        emit IERC1967.BeaconUpgraded(newBeacon);

        if (data.length > 0) {
            Address.functionDelegateCall(IBeacon(newBeacon).implementation(), data);
        } else {
            _checkNonPayable();
        }
    }

    /**
     * @dev Reverts if `msg.value` is not zero. It can be used to avoid `msg.value` stuck in the contract
     * if an upgrade doesn't perform an initialization call.
     */
    function _checkNonPayable() private {
        if (msg.value > 0) {
            revert ERC1967NonPayable();
        }
    }
}

// lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol

// OpenZeppelin Contracts (last updated v5.3.0) (proxy/utils/UUPSUpgradeable.sol)

/**
 * @dev An upgradeability mechanism designed for UUPS proxies. The functions included here can perform an upgrade of an
 * {ERC1967Proxy}, when this contract is set as the implementation behind such a proxy.
 *
 * A security mechanism ensures that an upgrade does not turn off upgradeability accidentally, although this risk is
 * reinstated if the upgrade retains upgradeability but removes the security mechanism, e.g. by replacing
 * `UUPSUpgradeable` with a custom implementation of upgrades.
 *
 * The {_authorizeUpgrade} function must be overridden to include access restriction to the upgrade mechanism.
 */
abstract contract UUPSUpgradeable is Initializable, IERC1822Proxiable {
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address private immutable __self = address(this);

    /**
     * @dev The version of the upgrade interface of the contract. If this getter is missing, both `upgradeTo(address)`
     * and `upgradeToAndCall(address,bytes)` are present, and `upgradeTo` must be used if no function should be called,
     * while `upgradeToAndCall` will invoke the `receive` function if the second argument is the empty byte string.
     * If the getter returns `"5.0.0"`, only `upgradeToAndCall(address,bytes)` is present, and the second argument must
     * be the empty byte string if no function should be called, making it impossible to invoke the `receive` function
     * during an upgrade.
     */
    string public constant UPGRADE_INTERFACE_VERSION = "5.0.0";

    /**
     * @dev The call is from an unauthorized context.
     */
    error UUPSUnauthorizedCallContext();

    /**
     * @dev The storage `slot` is unsupported as a UUID.
     */
    error UUPSUnsupportedProxiableUUID(bytes32 slot);

    /**
     * @dev Check that the execution is being performed through a delegatecall call and that the execution context is
     * a proxy contract with an implementation (as defined in ERC-1967) pointing to self. This should only be the case
     * for UUPS and transparent proxies that are using the current contract as their implementation. Execution of a
     * function through ERC-1167 minimal proxies (clones) would not normally pass this test, but is not guaranteed to
     * fail.
     */
    modifier onlyProxy() {
        _checkProxy();
        _;
    }

    /**
     * @dev Check that the execution is not being performed through a delegate call. This allows a function to be
     * callable on the implementing contract but not through proxies.
     */
    modifier notDelegated() {
        _checkNotDelegated();
        _;
    }

    function __UUPSUpgradeable_init() internal onlyInitializing {
    }

    function __UUPSUpgradeable_init_unchained() internal onlyInitializing {
    }
    /**
     * @dev Implementation of the ERC-1822 {proxiableUUID} function. This returns the storage slot used by the
     * implementation. It is used to validate the implementation's compatibility when performing an upgrade.
     *
     * IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks
     * bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this
     * function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.
     */
    function proxiableUUID() external view virtual notDelegated returns (bytes32) {
        return ERC1967Utils.IMPLEMENTATION_SLOT;
    }

    /**
     * @dev Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call
     * encoded in `data`.
     *
     * Calls {_authorizeUpgrade}.
     *
     * Emits an {Upgraded} event.
     *
     * @custom:oz-upgrades-unsafe-allow-reachable delegatecall
     */
    function upgradeToAndCall(address newImplementation, bytes memory data) public payable virtual onlyProxy {
        _authorizeUpgrade(newImplementation);
        _upgradeToAndCallUUPS(newImplementation, data);
    }

    /**
     * @dev Reverts if the execution is not performed via delegatecall or the execution
     * context is not of a proxy with an ERC-1967 compliant implementation pointing to self.
     */
    function _checkProxy() internal view virtual {
        if (
            address(this) == __self || // Must be called through delegatecall
            ERC1967Utils.getImplementation() != __self // Must be called through an active proxy
        ) {
            revert UUPSUnauthorizedCallContext();
        }
    }

    /**
     * @dev Reverts if the execution is performed via delegatecall.
     * See {notDelegated}.
     */
    function _checkNotDelegated() internal view virtual {
        if (address(this) != __self) {
            // Must not be called through delegatecall
            revert UUPSUnauthorizedCallContext();
        }
    }

    /**
     * @dev Function that should revert when `msg.sender` is not authorized to upgrade the contract. Called by
     * {upgradeToAndCall}.
     *
     * Normally, this function will use an xref:access.adoc[access control] modifier such as {Ownable-onlyOwner}.
     *
     * ```solidity
     * function _authorizeUpgrade(address) internal onlyOwner {}
     * ```
     */
    function _authorizeUpgrade(address newImplementation) internal virtual;

    /**
     * @dev Performs an implementation upgrade with a security check for UUPS proxies, and additional setup call.
     *
     * As a security check, {proxiableUUID} is invoked in the new implementation, and the return value
     * is expected to be the implementation slot in ERC-1967.
     *
     * Emits an {IERC1967-Upgraded} event.
     */
    function _upgradeToAndCallUUPS(address newImplementation, bytes memory data) private {
        try IERC1822Proxiable(newImplementation).proxiableUUID() returns (bytes32 slot) {
            if (slot != ERC1967Utils.IMPLEMENTATION_SLOT) {
                revert UUPSUnsupportedProxiableUUID(slot);
            }
            ERC1967Utils.upgradeToAndCall(newImplementation, data);
        } catch {
            // The implementation is not UUPS
            revert ERC1967Utils.ERC1967InvalidImplementation(newImplementation);
        }
    }
}

// src/core/RyzerRegistry.sol

/// @title RyzerRegistry
/// @notice Manages company and project metadata for real estate tokenization in the Ryzer ecosystem
/// @dev Uses UUPS upgradeable pattern for modularity and upgradability
contract RyzerRegistry is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    /*//////////////////////////////////////////////////////////////
                           ERRORS
    //////////////////////////////////////////////////////////////*/
    error InvalidAddress(address addr);
    error InvalidChainId(uint16 chainId);
    error InvalidParameter(string parameter);
    error InvalidCompanyId(uint256 companyId);
    error InvalidProjectId(uint256 projectId);
    error EtherNotAccepted();

    /*//////////////////////////////////////////////////////////////
                           TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/
    // Enums
    enum CompanyType {
        LLC,
        PrivateLimited,
        DAOLLC,
        Corporation,
        PublicEntity,
        Partnership
    }
    enum AssetType {
        Commercial,
        Residential,
        Holiday,
        Land
    }

    // Structs
    struct Company {
        address owner;
        string name;
        CompanyType companyType;
        string jurisdiction;
        bool isActive;
    }

    struct Project {
        address projectAddress;
        address escrow;
        address orderManager;
        address dao;
        string name;
        string symbol;
        string metadataCID;
        AssetType assetType;
        string legalMetadataCID;
        bool isActive;
    }

    struct ProjectParams {
        string name;
        string symbol;
        string metadataCID;
        AssetType assetType;
        string legalMetadataCID;
        address projectAddress;
        address escrow;
        address orderManager;
        address dao;
    }

    struct ProjectDetails {
        address projectAddress;
        address escrow;
        address orderManager;
        address dao;
        string name;
        string symbol;
        string metadataCID;
        AssetType assetType;
        string legalMetadataCID;
        bool isActive;
    }

    struct BatchProjectResponse {
        uint256[] projectIds;
        ProjectDetails[] projectDetails;
    }

    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    // Role identifiers
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REGISTRY_ADMIN_ROLE =
        keccak256("REGISTRY_ADMIN_ROLE");

    // Constants
    uint256 public constant MAX_STRING_LENGTH = 100;
    uint256 public constant MAX_SYMBOL_LENGTH = 32;
    uint256 public constant MAX_BATCH_SIZE = 50;
    string public constant CONTRACT_VERSION = "1.0.0";

    // Core state
    address public factory;
    uint16 public chainId;
    uint256 public companyCount;
    uint256 public projectCount;

    // Mappings
    mapping(uint256 => Company) public companies;
    mapping(address => uint256) public companyIdForAddress;
    mapping(uint256 => mapping(uint256 => Project)) public projects;
    mapping(uint256 => uint256[]) public companyProjectIds;

    /*//////////////////////////////////////////////////////////////
                           EVENTS
    //////////////////////////////////////////////////////////////*/
    event RegistryInitialized(uint16 chainId);
    event FactoryUpdated(address factory);
    event CompanyRegistered(
        uint256 indexed companyId,
        address indexed owner,
        string name,
        CompanyType companyType,
        string jurisdiction
    );
    event ProjectRegistered(
        uint256 indexed companyId,
        uint256 indexed projectId,
        address indexed projectAddress
    );
    event BatchProjectRegistered(
        uint256 indexed companyId,
        uint256[] projectIds
    );
    event ProjectDeactivated(
        uint256 indexed companyId,
        uint256 indexed projectId
    );
    event MetadataUpdated(
        uint256 indexed companyId,
        uint256 indexed projectId,
        string metadataType,
        string newCID
    );

    /*//////////////////////////////////////////////////////////////
                           MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier onlyValidCompany(uint256 companyId) {
        if (
            companyId == 0 ||
            companyId > companyCount ||
            !companies[companyId].isActive
        ) {
            revert InvalidCompanyId(companyId);
        }
        _;
    }

    modifier onlyValidProject(uint256 companyId, uint256 projectId) {
        if (
            projectId == 0 ||
            projectId > projectCount ||
            projects[companyId][projectId].projectAddress == address(0)
        ) {
            revert InvalidProjectId(projectId);
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Prevents direct Ether transfers
    receive() external payable {
        revert EtherNotAccepted();
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the registry
    /// @param _chainId Chain ID
    function initialize(uint16 _chainId) external initializer {
        if (_chainId == 0 || _chainId != uint16(block.chainid)) {
            revert InvalidChainId(_chainId);
        }

        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        chainId = _chainId;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(REGISTRY_ADMIN_ROLE, ADMIN_ROLE);
        _grantRole(REGISTRY_ADMIN_ROLE, msg.sender);

        emit RegistryInitialized(_chainId);
    }

    /// @notice Sets the factory address
    /// @param _factory New factory address
    function setFactory(address _factory) external onlyRole(ADMIN_ROLE) {
        if (_factory == address(0)) revert InvalidAddress(_factory);
        factory = _factory;
        emit FactoryUpdated(factory);
    }

    // Added to get unexpected transfers
    // function withdraw() external nonReentrant onlyRole(ADMIN_ROLE) {
    //     uint256 balance = address(this).balance;

    //     address admin = _msgSender();
    //     require(balance > 0, "No Ether to withdraw");

    //     (bool success,) = admin.call{value: balance}("");
    //     require(success, "Transfer failed");
    // }

    /// @notice Registers a new company
    /// @param owner Company owner
    /// @param name Company name
    /// @param companyType Company type
    /// @param jurisdiction Company jurisdiction
    /// @return New company ID
    function registerCompany(
        address owner,
        string calldata name,
        string calldata jurisdiction,
        CompanyType companyType
    )
        external
        nonReentrant
        //onlyRole(REGISTRY_ADMIN_ROLE) //@ask
        whenNotPaused
        returns (uint256)
    {
        _validateCompanyInput(owner, name, jurisdiction);

        uint256 newCompanyId = ++companyCount;
        companies[newCompanyId] = Company({
            owner: owner,
            name: name,
            companyType: companyType,
            jurisdiction: jurisdiction,
            isActive: true
        });
        companyIdForAddress[owner] = newCompanyId;

        emit CompanyRegistered(
            newCompanyId,
            owner,
            name,
            companyType,
            jurisdiction
        );
        return newCompanyId;
    }

    /// @notice Registers a new project
    /// @param companyId Company ID
    /// @param params Project parameters
    /// @return New project ID
    function registerProject(
        uint256 companyId,
        ProjectParams calldata params
    )
        external
        nonReentrant
        //onlyRole(REGISTRY_ADMIN_ROLE)
        onlyValidCompany(companyId)
        whenNotPaused
        returns (uint256)
    {
        _validateProjectInput(params);

        uint256 newProjectId = _createProject(companyId, params);
        emit ProjectRegistered(companyId, newProjectId, params.projectAddress);
        return newProjectId;
    }

    /// @notice Updates project metadata CID
    /// @param companyId Company ID
    /// @param projectId Project ID
    /// @param newCID New metadata CID
    function updateMetadataCID(
        uint256 companyId,
        uint256 projectId,
        string calldata newCID
    )
        external
        onlyRole(REGISTRY_ADMIN_ROLE)
        onlyValidCompany(companyId)
        onlyValidProject(companyId, projectId)
        whenNotPaused
    {
        if (bytes(newCID).length == 0) revert InvalidParameter("metadataCID");
        projects[companyId][projectId].metadataCID = newCID;
        emit MetadataUpdated(companyId, projectId, "metadata", newCID);
    }

    /// @notice Updates project legal metadata CID
    /// @param companyId Company ID
    /// @param projectId Project ID
    /// @param newCID New legal metadata CID
    function updateLegalMetadataCID(
        uint256 companyId,
        uint256 projectId,
        string calldata newCID
    )
        external
        onlyRole(REGISTRY_ADMIN_ROLE)
        onlyValidCompany(companyId)
        onlyValidProject(companyId, projectId)
        whenNotPaused
    {
        if (bytes(newCID).length == 0) {
            revert InvalidParameter("legalMetadataCID");
        }
        projects[companyId][projectId].legalMetadataCID = newCID;
        emit MetadataUpdated(companyId, projectId, "legalMetadata", newCID);
    }

    /// @notice Deactivates a project
    /// @param companyId Company ID
    /// @param projectId Project ID
    function deactivateProject(
        uint256 companyId,
        uint256 projectId
    )
        external
        onlyRole(REGISTRY_ADMIN_ROLE)
        onlyValidCompany(companyId)
        onlyValidProject(companyId, projectId)
        whenNotPaused
    {
        projects[companyId][projectId].isActive = false;
        emit ProjectDeactivated(companyId, projectId);
    }

    /// @notice Pauses the contract
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                           PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Creates a new project
    /// @param companyId Company ID
    /// @param params Project parameters
    /// @return New project ID
    function _createProject(
        uint256 companyId,
        ProjectParams calldata params
    ) private returns (uint256) {
        uint256 newProjectId = ++projectCount;
        projects[companyId][newProjectId] = Project({
            projectAddress: params.projectAddress,
            escrow: params.escrow,
            orderManager: params.orderManager,
            dao: params.dao,
            name: params.name,
            symbol: params.symbol,
            metadataCID: params.metadataCID,
            assetType: params.assetType,
            legalMetadataCID: params.legalMetadataCID,
            isActive: true
        });
        companyProjectIds[companyId].push(newProjectId);
        return newProjectId;
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Authorizes contract upgrades
    /// @param newImplementation New implementation address
    function _authorizeUpgrade(
        address newImplementation
    ) internal view override onlyRole(ADMIN_ROLE) {
        if (
            newImplementation == address(0) ||
            newImplementation.code.length == 0
        ) {
            revert InvalidAddress(newImplementation);
        }
    }

    /*//////////////////////////////////////////////////////////////
                           PRIVATE PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Validates company input parameters
    /// @param owner Company owner
    /// @param name Company name
    /// @param jurisdiction Company jurisdiction
    function _validateCompanyInput(
        address owner,
        string memory name,
        string memory jurisdiction
    ) private pure {
        if (owner == address(0)) revert InvalidAddress(owner);
        if (bytes(name).length == 0 || bytes(name).length > MAX_STRING_LENGTH) {
            revert InvalidParameter("name");
        }
        if (
            bytes(jurisdiction).length == 0 ||
            bytes(jurisdiction).length > MAX_STRING_LENGTH
        ) {
            revert InvalidParameter("jurisdiction");
        }
    }

    /// @notice Validates project input parameters
    /// @param params Project parameters
    function _validateProjectInput(ProjectParams calldata params) private pure {
        if (
            bytes(params.name).length == 0 ||
            bytes(params.name).length > MAX_STRING_LENGTH
        ) {
            revert InvalidParameter("name");
        }
        if (
            bytes(params.symbol).length == 0 ||
            bytes(params.symbol).length > MAX_SYMBOL_LENGTH
        ) {
            revert InvalidParameter("symbol");
        }
        if (bytes(params.metadataCID).length == 0) {
            revert InvalidParameter("metadataCID");
        }
        if (bytes(params.legalMetadataCID).length == 0) {
            revert InvalidParameter("legalMetadataCID");
        }
        if (params.projectAddress == address(0)) {
            revert InvalidAddress(params.projectAddress);
        }
        if (
            params.escrow == address(0) ||
            params.orderManager == address(0) ||
            params.dao == address(0)
        ) {
            revert InvalidAddress(address(0));
        }
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL VIEW/PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Gets company details
    /// @param companyId Company ID
    /// @return owner Company owner
    /// @return name Company name
    /// @return companyType Company type
    /// @return jurisdiction Company jurisdiction
    /// @return isActive Active status
    /// @return projectIds Project IDs
    function getCompanyDetails(
        uint256 companyId
    )
        external
        view
        onlyValidCompany(companyId)
        returns (
            address owner,
            string memory name,
            CompanyType companyType,
            string memory jurisdiction,
            bool isActive,
            uint256[] memory projectIds
        )
    {
        Company storage company = companies[companyId];
        return (
            company.owner,
            company.name,
            company.companyType,
            company.jurisdiction,
            company.isActive,
            companyProjectIds[companyId]
        );
    }

    /// @notice Gets project details
    /// @param companyId Company ID
    /// @param projectId Project ID
    /// @return Project details
    function getProjectDetails(
        uint256 companyId,
        uint256 projectId
    )
        external
        view
        onlyValidCompany(companyId)
        onlyValidProject(companyId, projectId)
        returns (ProjectDetails memory)
    {
        Project storage project = projects[companyId][projectId];
        return
            ProjectDetails({
                projectAddress: project.projectAddress,
                escrow: project.escrow,
                orderManager: project.orderManager,
                dao: project.dao,
                name: project.name,
                symbol: project.symbol,
                metadataCID: project.metadataCID,
                assetType: project.assetType,
                legalMetadataCID: project.legalMetadataCID,
                isActive: project.isActive
            });
    }

    /// @notice Gets batch project details
    /// @param companyId Company ID
    /// @param startIndex Start index
    /// @param count Number of projects
    /// @return Batch project response
    function getBatchProjects(
        uint256 companyId,
        uint256 startIndex,
        uint256 count
    )
        external
        view
        onlyValidCompany(companyId)
        returns (BatchProjectResponse memory)
    {
        if (count > MAX_BATCH_SIZE) revert InvalidParameter("batch size");
        uint256[] memory projIds = companyProjectIds[companyId];
        uint256 length = count;

        if (startIndex + count > projIds.length) {
            length = projIds.length > startIndex
                ? projIds.length - startIndex
                : 0;
        }

        uint256[] memory ids = new uint256[](length);
        ProjectDetails[] memory details = new ProjectDetails[](length);

        for (uint256 i = 0; i < length; i++) {
            uint256 projId = projIds[startIndex + i];
            Project storage project = projects[companyId][projId];
            ids[i] = projId;
            details[i] = ProjectDetails({
                projectAddress: project.projectAddress,
                escrow: project.escrow,
                orderManager: project.orderManager,
                dao: project.dao,
                name: project.name,
                symbol: project.symbol,
                metadataCID: project.metadataCID,
                assetType: project.assetType,
                legalMetadataCID: project.legalMetadataCID,
                isActive: project.isActive
            });
        }

        return BatchProjectResponse({projectIds: ids, projectDetails: details});
    }

    /// @notice Gets contract version
    /// @return Contract version
    function getContractVersion() external pure returns (string memory) {
        return CONTRACT_VERSION;
    }
}

// src/core/RyzerFactory.sol

// Minimal IRyzerRegistry interface to resolve type errors
interface IRyzerRegistry {
    enum CompanyType {
        LLC,
        CORP,
        PARTNERSHIP
    }

    function registerCompany(
        address owner,
        string memory name,
        string memory jurisdiction,
        CompanyType companyType
    ) external returns (uint256);
    function registerProject(
        uint256 companyId,
        RyzerRegistry.ProjectParams calldata params
    ) external;
}

// Updated IRyzerProject interface to include eoiPct
interface IRyzerProject {
    struct ProjectInitParams {
        string name;
        string symbol;
        uint256 maxSupply;
        uint256 tokenPrice;
        uint256 cancelDelay;
        address projectOwner;
        address factory;
        bytes32 companyId;
        bytes32 assetId;
        bytes32 metadataCID;
        bytes32 assetType;
        bytes32 legalMetadataCID;
        uint16 chainId;
        uint256 dividendPct;
        uint256 premintAmount;
        uint256 minInvestment;
        uint256 maxInvestment;
        uint256 eoiPct;
    }

    struct ProjectDetails {
        string name;
        string symbol;
        uint256 maxSupply;
        uint256 tokenPrice;
        uint256 cancelDelay;
        uint256 dividendPct;
        uint256 minInvestment;
        uint256 maxInvestment;
        bytes32 assetType;
        bytes32 metadataCID;
        bytes32 legalMetadataCID;
        bytes32 companyId;
        bytes32 assetId;
        address projectOwner;
        address factoryOwner;
        address escrow;
        address orderManager;
        address dao;
        address owner;
        uint16 chainId;
        bool isActive;
    }

    function initialize(bytes memory initData) external;
    function setUsdtToken(address _usdtToken) external;
    function setProjectContractsAndPreMint(
        address _escrow,
        address _orderManager,
        address _dao,
        uint256 _premintAmount
    ) external;
    function proposeMetadataUpdate(bytes32 newCID, bool isLegal) external;
    function approveMetadataUpdate(uint256 updateId) external;
    function pause() external;
    function unpause() external;
    function getProjectDetails() external view returns (ProjectDetails memory);
    function lockUntil(address user) external view returns (uint48);
    function owner() external view returns (address);
    function getIsActive() external view returns (bool);
    function getInvestmentLimits()
        external
        view
        returns (uint256 minInvestment, uint256 maxInvestment);
    function tokenPrice() external view returns (uint256);
    function eoiPct() external view returns (uint256);
    function dividendPct() external view returns (uint256);
}

interface IRyzerEscrow {
    function initialize(
        address usdtToken,
        address project,
        uint16 chainId,
        address owner
    ) external;
    function setCoreContracts(
        address _usdtToken,
        address _projectContract,
        uint16 _chainId
    ) external;
}

interface IRyzerOrderManager {
    function initialize(
        address usdtToken,
        address escrow,
        address project,
        uint16 chainId,
        address owner
    ) external;
    function setProjectContracts(
        address usdtToken,
        address escrow,
        address project
    ) external;
}

// Assumed IRyzerDAO interface with 6 arguments for initialize
interface IRyzerDAO {
    function initialize(
        address project,
        address ryzerXToken,
        uint16 chainId,
        uint256 quorumThreshold
    ) external;
}

/// @title RyzerFactory
/// @notice Manages company registration and project creation for RWA tokenization in the Ryzer ecosystem
/// @dev Uses UUPS upgradeable pattern with multi-signature template updates
contract RyzerFactory is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    /*//////////////////////////////////////////////////////////////
                           ERRORS
    //////////////////////////////////////////////////////////////*/
    error InvalidAddress(address addr);
    error AddressAlreadyOwnsCompany(address addr);
    error InvalidCompanyType();
    error InvalidNameLength();
    error InvalidJurisdictionLength();
    error InvalidAssetType();
    error InvalidParameter(string parameter);
    error DeploymentFailed(string reason);
    // error InvalidTemplateType();
    // error InvalidDelay();
    error InsufficientBalance();
    //error InvalidCompany();
    error NotCompanyOwner();
    // error ProposalNotFound();
    // error VotingPeriodEnded();
    // error AlreadySigned();
    // error QuorumNotMet();
    // error InsufficientSignatures();
    // error ProposalExpired();
    error InvalidSignatureCount();
    error InvalidTokenDecimals(string token, uint8 decimals);

    /*//////////////////////////////////////////////////////////////
                         TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/
    enum CompanyType {
        LLC,
        CORP,
        PARTNERSHIP
    }

    enum TemplateType {
        PROJECT,
        ESCROW,
        ORDER_MANAGER,
        DAO
    }

    struct CompanyParams {
        string name;
        string jurisdiction;
        CompanyType companyType;
    }

    struct ProjectParams {
        string name;
        string symbol;
        bytes32 assetType;
        uint16 chainId;
        uint256 minInvestment;
        uint256 maxInvestment;
        uint256 totalSupply;
        bytes32 assetId;
        uint256 requiredSignatures;
        uint256 tokenPrice;
        uint256 cancelDelay;
        uint256 eoiPct;
        uint256 dividendPct;
        uint256 premintAmount;
        bytes32 metadataCID;
        bytes32 legalMetadataCID;
        address projectOwner;
        address factory;
    }

    struct TemplateProposal {
        address templateAddress;
        TemplateType templateType;
        uint48 startTime;
        uint48 endTime;
        uint48 deadline;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        uint256 signatureCount;
    }

    struct Contracts {
        address project;
        address escrow;
        address orderManager;
        address dao;
    }

    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant MIN_NAME_LENGTH = 3;
    uint256 public constant MAX_NAME_LENGTH = 100;
    uint256 public constant MIN_JURISDICTION_LENGTH = 2;
    uint256 public constant MAX_JURISDICTION_LENGTH = 100;
    uint256 public constant MAX_TEMPLATE_UPDATE_DELAY = 7 days;
    uint256 public constant MIN_SIGNATURES = 2;
    uint256 public constant MAX_SIGNATURES = 10;
    uint256 public constant USDT_TOKEN_DECIMAL = 6;
    uint256 public constant RYZERX_TOKEN_DECIMAL = 18;

    IERC20 public usdtToken;
    IERC20 public ryzerXToken;
    IRyzerRegistry public ryzerRegistry;
    address public projectTemplate;
    address public escrowTemplate;
    address public orderManagerTemplate;
    address daoTemplate;
    uint256 public companyCount;
    uint256 public templateProposalCount;
    uint256 public requiredSignatures;

    mapping(uint256 => address[]) public companyProjects;
    mapping(address => uint256) public ownerToCompany;
    mapping(uint256 => TemplateProposal) public templateProposals;
    mapping(uint256 => mapping(address => bool)) public proposalSigners;
    mapping(uint256 => mapping(address => address)) public projectEscrows;
    mapping(uint256 => mapping(address => address)) public projectOrderManagers;
    mapping(uint256 => mapping(address => address)) public projectDAOs;

    /*//////////////////////////////////////////////////////////////
                           EVENTS
    //////////////////////////////////////////////////////////////*/
    event FactoryInitialized(
        address indexed usdtToken,
        address indexed registry
    );
    event CompanyRegistered(
        uint256 indexed companyId,
        address indexed owner,
        string name,
        string jurisdiction,
        CompanyType companyType
    );
    event CompanyDetailsUpdated(
        uint256 indexed companyId,
        string name,
        string jurisdiction
    );
    event ProjectCreated(
        uint256 indexed companyId,
        address indexed project,
        address indexed escrow,
        address orderManager,
        address dao,
        bytes32 assetId,
        string name
    );
    event TemplateUpdateProposed(
        uint256 indexed proposalId,
        address indexed templateAddress,
        TemplateType templateType
    );
    event TemplateUpdateSigned(
        uint256 indexed proposalId,
        address indexed signer
    );
    event TemplateUpdated(
        address indexed templateAddress,
        TemplateType templateType
    );
    event CoreContractsSet(
        address indexed usdtToken,
        address indexed ryzerXToken,
        address indexed registry
    );

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the factory contract
    function initialize(
        address _usdtToken,
        address _registry,
        address _projectTemplate,
        address _escrowTemplate,
        address _orderManagerTemplate,
        address _daoTemplate
    ) external initializer {
        if (
            _usdtToken == address(0) ||
            _registry == address(0) ||
            _projectTemplate == address(0) ||
            _escrowTemplate == address(0) ||
            _orderManagerTemplate == address(0) ||
            _daoTemplate == address(0)
        ) revert InvalidAddress(address(0));
        if (
            _registry.code.length == 0 ||
            _projectTemplate.code.length == 0 ||
            _escrowTemplate.code.length == 0 ||
            _orderManagerTemplate.code.length == 0 ||
            _daoTemplate.code.length == 0
        ) revert InvalidAddress(address(0));
        if (IERC20Metadata(_usdtToken).decimals() != USDT_TOKEN_DECIMAL) {
            revert InvalidTokenDecimals(
                "USDT",
                IERC20Metadata(_usdtToken).decimals()
            );
        }

        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        usdtToken = IERC20(_usdtToken);
        ryzerRegistry = IRyzerRegistry(_registry);
        projectTemplate = _projectTemplate;
        escrowTemplate = _escrowTemplate;
        orderManagerTemplate = _orderManagerTemplate;
        daoTemplate = _daoTemplate;
        requiredSignatures = MIN_SIGNATURES;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        emit FactoryInitialized(address(usdtToken), address(ryzerRegistry));
    }

    /// @notice Sets core contract addresses
    function setCoreContracts(
        address _usdtToken,
        address _ryzerXToken,
        address _registry
    ) external onlyRole(ADMIN_ROLE) {
        if (
            _usdtToken == address(0) ||
            _ryzerXToken == address(0) ||
            _registry == address(0)
        ) {
            revert InvalidAddress(address(0));
        }
        if (_registry.code.length == 0) revert InvalidAddress(_registry);

        if (IERC20Metadata(_usdtToken).decimals() != USDT_TOKEN_DECIMAL) {
            revert InvalidTokenDecimals(
                "USDT",
                IERC20Metadata(_usdtToken).decimals()
            );
        }
        if (IERC20Metadata(_ryzerXToken).decimals() != RYZERX_TOKEN_DECIMAL) {
            revert InvalidTokenDecimals(
                "RyzerX",
                IERC20Metadata(_ryzerXToken).decimals()
            );
        }

        usdtToken = IERC20(_usdtToken);
        ryzerXToken = IERC20(_ryzerXToken);
        ryzerRegistry = IRyzerRegistry(_registry);
        emit CoreContractsSet(_usdtToken, _ryzerXToken, _registry);
    }

    /// @notice Authorizes contract upgrades
    function _authorizeUpgrade(
        address newImplementation
    ) internal view override onlyRole(ADMIN_ROLE) {
        if (
            newImplementation == address(0) ||
            newImplementation.code.length == 0
        ) {
            revert InvalidAddress(newImplementation);
        }
    }

    /// @notice Registers a new company
    function registerCompany(
        CompanyParams calldata params
    ) external nonReentrant whenNotPaused returns (uint256) {
        if (
            bytes(params.name).length < MIN_NAME_LENGTH ||
            bytes(params.name).length > MAX_NAME_LENGTH
        ) {
            revert InvalidNameLength();
        }
        if (
            bytes(params.jurisdiction).length < MIN_JURISDICTION_LENGTH ||
            bytes(params.jurisdiction).length > MAX_JURISDICTION_LENGTH
        ) revert InvalidJurisdictionLength();
        if (uint256(params.companyType) > uint256(CompanyType.PARTNERSHIP)) {
            revert InvalidCompanyType();
        }

        uint256 newCompanyId = ryzerRegistry.registerCompany(
            msg.sender,
            params.name,
            params.jurisdiction,
            IRyzerRegistry.CompanyType(uint256(params.companyType))
        );
        ownerToCompany[msg.sender] = newCompanyId;
        companyCount = newCompanyId;

        emit CompanyRegistered(
            newCompanyId,
            msg.sender,
            params.name,
            params.jurisdiction,
            params.companyType
        );
        return newCompanyId;
    }

    /// @notice Creates a new RWA project
    function createProject(
        uint256 companyId,
        ProjectParams calldata params
    )
        external
        nonReentrant
        whenNotPaused
        returns (address, address, address, address)
    {
        if (ownerToCompany[msg.sender] != companyId) revert NotCompanyOwner();
        _validateProjectParams(companyId, params);

        uint16 chainId = params.chainId;
        Contracts memory contracts;
        contracts.project = Clones.clone(projectTemplate);
        contracts.escrow = Clones.clone(escrowTemplate);
        contracts.orderManager = Clones.clone(orderManagerTemplate);
        contracts.dao = Clones.clone(daoTemplate);

        if (
            contracts.project == address(0) ||
            contracts.escrow == address(0) ||
            contracts.orderManager == address(0) ||
            contracts.dao == address(0)
        ) revert DeploymentFailed("clone failed");
        if (
            contracts.project.code.length == 0 ||
            contracts.escrow.code.length == 0 ||
            contracts.orderManager.code.length == 0 ||
            contracts.dao.code.length == 0
        ) revert DeploymentFailed("invalid clone code");

        // Initialize Project
        try
            IRyzerProject(contracts.project).initialize(
                abi.encode(
                    IRyzerProject.ProjectInitParams({
                        name: params.name,
                        symbol: string(
                            (abi.encodePacked("RYZX-", params.symbol))
                        ), // fix collisions (need to be unique)
                        maxSupply: params.totalSupply,
                        tokenPrice: params.tokenPrice,
                        cancelDelay: params.cancelDelay,
                        projectOwner: params.projectOwner,
                        factory: params.factory,
                        companyId: bytes32(companyId),
                        assetId: params.assetId,
                        metadataCID: params.metadataCID,
                        assetType: params.assetType,
                        legalMetadataCID: params.legalMetadataCID,
                        chainId: chainId,
                        dividendPct: params.dividendPct,
                        premintAmount: params.premintAmount,
                        minInvestment: params.minInvestment,
                        maxInvestment: params.maxInvestment,
                        eoiPct: params.eoiPct
                    })
                )
            )
        {
            // Initialize Escrow
            try
                IRyzerEscrow(contracts.escrow).initialize(
                    address(usdtToken),
                    contracts.project,
                    chainId,
                    params.projectOwner
                )
            {} catch {
                revert DeploymentFailed("escrow initialization failed");
            }

            // Initialize Order Manager
            try
                IRyzerOrderManager(contracts.orderManager).initialize(
                    address(usdtToken),
                    contracts.escrow,
                    contracts.project,
                    chainId,
                    params.projectOwner
                )
            {} catch {
                revert DeploymentFailed("order manager initialization failed");
            }

            // Initialize DAO
            try
                IRyzerDAO(contracts.dao).initialize(
                    contracts.project,
                    address(ryzerXToken),
                    chainId,
                    60 // change it
                )
            {} catch {
                revert DeploymentFailed("DAO initialization failed");
            }

            // Set project contracts
            try
                IRyzerProject(contracts.project).setProjectContractsAndPreMint(
                    contracts.escrow,
                    contracts.orderManager,
                    contracts.dao,
                    params.premintAmount
                )
            {} catch {
                revert DeploymentFailed("project contract setup failed");
            }

            try
                IRyzerEscrow(contracts.escrow).setCoreContracts(
                    address(usdtToken),
                    contracts.project,
                    uint16(block.chainid)
                )
            {} catch {
                revert DeploymentFailed("core contract setup failed");
            }

            try
                IRyzerOrderManager(contracts.orderManager).setProjectContracts(
                    address(usdtToken),
                    contracts.escrow,
                    contracts.project
                )
            {} catch {
                revert DeploymentFailed("core contract setup failed");
            }

            // Set USDT token
            try
                IRyzerProject(contracts.project).setUsdtToken(
                    address(usdtToken)
                )
            {} catch {
                revert DeploymentFailed("USDT token setup failed");
            }

            RyzerRegistry.ProjectParams memory projectParams = RyzerRegistry
                .ProjectParams({
                    name: params.name,
                    symbol: string((abi.encodePacked("RYZX-", params.symbol))),
                    metadataCID: string(abi.encodePacked(params.metadataCID)),
                    assetType: RyzerRegistry.AssetType.Commercial,
                    legalMetadataCID: string(
                        abi.encodePacked(params.legalMetadataCID)
                    ),
                    projectAddress: contracts.project,
                    escrow: contracts.escrow,
                    orderManager: contracts.orderManager,
                    dao: contracts.dao
                });

            // Register project in registry
            ryzerRegistry.registerProject(companyId, projectParams);

            // Update storage
            companyProjects[companyId].push(contracts.project);
            projectEscrows[companyId][contracts.project] = contracts.escrow;
            projectOrderManagers[companyId][contracts.project] = contracts
                .orderManager;
            projectDAOs[companyId][contracts.project] = contracts.dao;

            emit ProjectCreated(
                companyId,
                contracts.project,
                contracts.escrow,
                contracts.orderManager,
                contracts.dao,
                params.assetId,
                params.name
            );
            return (
                contracts.project,
                contracts.escrow,
                contracts.orderManager,
                contracts.dao
            );
        } catch {
            revert DeploymentFailed("project initialization failed");
        }
    }

    /// @notice Pauses the contract
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                           PRIVATE VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /// @notice Validates project parameters
    function _validateProjectParams(
        uint256 companyId,
        ProjectParams calldata params
    ) private view {
        if (companyId == 0) revert InvalidParameter("companyId");
        if (
            bytes(params.name).length < MIN_NAME_LENGTH ||
            bytes(params.name).length > MAX_NAME_LENGTH
        ) {
            revert InvalidNameLength();
        }
        if (
            params.minInvestment == 0 ||
            params.maxInvestment < params.minInvestment ||
            params.totalSupply == 0 ||
            params.tokenPrice == 0 ||
            params.cancelDelay == 0 ||
            params.eoiPct == 0 ||
            params.eoiPct > 50 ||
            params.dividendPct > 50 ||
            params.premintAmount > params.totalSupply ||
            params.metadataCID == bytes32(0) ||
            params.legalMetadataCID == bytes32(0) ||
            params.projectOwner == address(0) ||
            params.factory != address(this)
        ) revert InvalidParameter("invalid project parameter");
        if (
            params.requiredSignatures < MIN_SIGNATURES ||
            params.requiredSignatures > MAX_SIGNATURES
        ) {
            revert InvalidSignatureCount();
        }
        if (params.chainId != uint16(block.chainid)) {
            revert InvalidParameter("chainId");
        }
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /// @notice Gets project contracts for a company
    function getProjectContracts(
        uint256 companyId,
        address project
    ) external view returns (Contracts memory contracts) {
        contracts = Contracts({
            project: project,
            escrow: projectEscrows[companyId][project],
            orderManager: projectOrderManagers[companyId][project],
            dao: projectDAOs[companyId][project]
        });
    }
}

