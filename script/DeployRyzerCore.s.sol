// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.29;

import "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {RyzerRegistry} from "src/core/RyzerRegistry.sol";
import {RyzerFactory} from "src/core/RyzerFactory.sol";
import {RyzerProject} from "src/core/RyzerProject.sol";
import {RyzerEscrow} from "src/core/RyzerEscrow.sol";
import {RyzerOrderManager} from "src/core/RyzerOrderManager.sol";
import {RyzerDAO} from "src/core/RyzerDAO.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployRyzerCore is Script {
    function run()
        external
        returns (
            ERC1967Proxy,
            RyzerRegistry,
            ERC1967Proxy,
            RyzerFactory,
            RyzerProject,
            RyzerEscrow,
            RyzerOrderManager,
            RyzerDAO,
            HelperConfig
        )
    {
        HelperConfig _helperConfig = new HelperConfig();

        (address usdt, address ryzerToken, address deployer) = _helperConfig
            .activeNetworkConfig();
        // address usdt = 0x8EBe3F72cBbc78bF0802180a72D73cCE82f821c2;
        // address ryzerToken = 0xDF40382D86Fc26ac8938Cd23f7d4ba58BC32c608;
        // address deployer = 0x3c5a809e712D30D932b71EdB066FA2EEDEE6Ad58;

        vm.startBroadcast(deployer);

        // 1. Deploy the implementation
        RyzerRegistry registryImpl = new RyzerRegistry();

        RyzerFactory factoryImpl = new RyzerFactory();

        RyzerProject _projectTemplate = new RyzerProject();

        RyzerEscrow _escrowTemplate = new RyzerEscrow();

        RyzerOrderManager _orderManagerTemplate = new RyzerOrderManager();

        RyzerDAO _daoTemplate = new RyzerDAO();

        // 2. Encode the call to initialize()
        bytes memory initDataForRegistry = abi.encodeWithSelector(
            registryImpl.initialize.selector,
            block.chainid
        );

        // 3. Deploy ERC1967Proxy (UUPS-compatible)
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            initDataForRegistry
        );

        bytes memory initDataForFactory = abi.encodeWithSelector(
            factoryImpl.initialize.selector,
            usdt,
            registryProxy,
            _projectTemplate,
            _escrowTemplate,
            _orderManagerTemplate,
            _daoTemplate
        );

        ERC1967Proxy factoryProxy = new ERC1967Proxy(
            address(factoryImpl),
            initDataForFactory
        );

        vm.stopBroadcast();

        console.log("Registry impl", address(registryImpl));
        console.log("Factory impl", address(factoryImpl));
        console.log("Project", address(_projectTemplate));
        console.log("Escrow", address(_escrowTemplate));
        console.log("OrderManager", address(_orderManagerTemplate));
        console.log("Dao", address(_daoTemplate));
        console.log("--------------------------------------");
        console.log("Registry proxy:", address(registryProxy));
        console.log("Factory proxy:", address(factoryProxy));

        return (
            registryProxy,
            registryImpl,
            factoryProxy,
            factoryImpl,
            _projectTemplate,
            _escrowTemplate,
            _orderManagerTemplate,
            _daoTemplate,
            _helperConfig
        );
    }
}
