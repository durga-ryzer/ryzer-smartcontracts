// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "./interfaces/IToken.sol";

// ERC1363 Receiver
interface IERC1363Receiver {
    function onTransferReceived(address operator, address from, uint256 value, bytes calldata data)
        external
        returns (bytes4);
}

// ERC777 Recipient
interface IERC777Recipient {
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external;
}

/**
 * ERC3643Support: Basic handler for ERC3643 tokens and compatible callbacks.
 */
abstract contract ERC3643Support is IERC1363Receiver, IERC777Recipient {
    // --- ERC-3643 operations ---

    function setOnchainID(address token, address _onchainID) external virtual {}

    function transferERC3643Token(address token, address to, uint256 amount) external virtual {}

    function onchainID(address token) external view returns (address) {
        return IToken(token).onchainID();
    }

    // --- Token Callbacks ---

    /// @notice Handles ERC1363 token transfers
    function onTransferReceived(address operator, address from, uint256 value, bytes calldata data)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC1363Receiver.onTransferReceived.selector;
    }

    /// @notice Handles ERC777 token transfers
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external pure override {
        // To check
    }
}
