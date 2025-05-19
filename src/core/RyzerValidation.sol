// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "./IRyzerRegistry.sol";

library RyzerValidation {
    error InvalidAddress(address addr);
    error InvalidStringLength();
    error InvalidMetadataCID();

    function validateCompanyInput(
        address owner,
        string memory name,
        string memory jurisdiction,
        uint256 maxStringLength
    ) internal pure {
        if (owner == address(0)) revert InvalidAddress(owner);
        if (bytes(name).length == 0 || bytes(name).length > maxStringLength) {
            revert InvalidStringLength();
        }
        if (bytes(jurisdiction).length == 0 || bytes(jurisdiction).length > maxStringLength) {
            revert InvalidStringLength();
        }
    }

    function validateProjectInput(
        IRyzerRegistry.ProjectParams memory params,
        uint256 maxStringLength,
        uint256 maxSymbolLength
    ) internal pure {
        if (bytes(params.name).length == 0 || bytes(params.name).length > maxStringLength) {
            revert InvalidStringLength();
        }
        if (bytes(params.symbol).length == 0 || bytes(params.symbol).length > maxSymbolLength) {
            revert InvalidStringLength();
        }
        if (
            params.projectAddress == address(0) || params.escrow == address(0) || params.orderManager == address(0)
                || params.dao == address(0)
        ) {
            revert InvalidAddress(params.projectAddress);
        }
    }
}
