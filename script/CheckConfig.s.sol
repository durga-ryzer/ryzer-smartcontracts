// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.29;

import "forge-std/Script.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract CheckConfig is Script {
    function run() external returns (HelperConfig) {
        HelperConfig _helperConfig = new HelperConfig();

        (address usdt, address ryzerToken, address deployer) = _helperConfig
            .activeNetworkConfig();

        console.log("USDT: ", usdt);
        console.log("Ryzer Token: ", ryzerToken);
        console.log("Deployer: ", deployer);
        return _helperConfig;
    }
}
