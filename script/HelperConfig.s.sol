// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Script} from "forge-std/Script.sol";
import {UsdtMock} from "src/core/UsdtMock.sol";

contract HelperConfig is Script {
    NetworkConfig public activeNetworkConfig;

    uint256 public constant XDC_MAINNET_NETWORK = 50;
    uint256 public constant XDC_APOTHEM_NETWORK = 51;

    address public FOUNDRY_DEFAULT_DEPLOYER = makeAddr("deployer");

    struct NetworkConfig {
        address usdt;
        address deployer; // should be admin
    }

    constructor() {
        if (block.chainid == XDC_MAINNET_NETWORK) {
            activeNetworkConfig = getXdcMainnetConfig();
        } else if (block.chainid == XDC_APOTHEM_NETWORK) {
            activeNetworkConfig = getXdcApothemConfig();
        } else {
            activeNetworkConfig = getOrCreateAnvilConfig();
        }
    }

    function getXdcMainnetConfig() public pure returns (NetworkConfig memory xdcMainnetNetworkConfig) {
        xdcMainnetNetworkConfig = NetworkConfig({
            usdt: 0x8EBe3F72cBbc78bF0802180a72D73cCE82f821c2, // need to check
            deployer: 0x3c5a809e712D30D932b71EdB066FA2EEDEE6Ad58
        });
    }

    function getXdcApothemConfig() public pure returns (NetworkConfig memory xdcApothemNetworkConfig) {
        xdcApothemNetworkConfig = NetworkConfig({
            usdt: 0x8EBe3F72cBbc78bF0802180a72D73cCE82f821c2,
            deployer: 0x3c5a809e712D30D932b71EdB066FA2EEDEE6Ad58
        });
    }

    function getOrCreateAnvilConfig() public returns (NetworkConfig memory anvilNetworkConfig) {
        // Check to see if we set an active network config
        if (activeNetworkConfig.deployer != address(0)) {
            return activeNetworkConfig;
        }

        vm.startBroadcast();
        UsdtMock _usdt = new UsdtMock();
        vm.stopBroadcast();

        anvilNetworkConfig = NetworkConfig({usdt: address(_usdt), deployer: FOUNDRY_DEFAULT_DEPLOYER});
    }
}
