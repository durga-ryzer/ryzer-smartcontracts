// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Script} from "forge-std/Script.sol";
import {UsdtMock} from "src/core/UsdtMock.sol";

import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

contract HelperConfig is Script {
    NetworkConfig public activeNetworkConfig;

    uint256 public constant XDC_MAINNET_NETWORK = 50;
    uint256 public constant XDC_APOTHEM_NETWORK = 51;

    address public FOUNDRY_DEFAULT_DEPLOYER = makeAddr("deployer");

    struct NetworkConfig {
        address usdt;
        address ryzerToken;
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

    function getXdcMainnetConfig()
        public
        pure
        returns (NetworkConfig memory xdcMainnetNetworkConfig)
    {
        xdcMainnetNetworkConfig = NetworkConfig({
            usdt: 0x8EBe3F72cBbc78bF0802180a72D73cCE82f821c2, // need to check
            ryzerToken: address(1),
            deployer: 0x3c5a809e712D30D932b71EdB066FA2EEDEE6Ad58
        });
    }

    function getXdcApothemConfig()
        public
        pure
        returns (NetworkConfig memory xdcApothemNetworkConfig)
    {
        xdcApothemNetworkConfig = NetworkConfig({
            usdt: 0x8EBe3F72cBbc78bF0802180a72D73cCE82f821c2,
            ryzerToken: 0xDF40382D86Fc26ac8938Cd23f7d4ba58BC32c608,
            deployer: 0x3c5a809e712D30D932b71EdB066FA2EEDEE6Ad58
        });
    }

    function getOrCreateAnvilConfig()
        public
        returns (NetworkConfig memory anvilNetworkConfig)
    {
        // Check to see if we set an active network config
        if (activeNetworkConfig.deployer != address(0)) {
            return activeNetworkConfig;
        }

        vm.startBroadcast(FOUNDRY_DEFAULT_DEPLOYER);
        UsdtMock _usdt = new UsdtMock();
        ERC20Mock _ryzerToken = new ERC20Mock();
        vm.stopBroadcast();

        anvilNetworkConfig = NetworkConfig({
            usdt: address(_usdt),
            ryzerToken: address(_ryzerToken),
            deployer: FOUNDRY_DEFAULT_DEPLOYER
        });
    }
}
