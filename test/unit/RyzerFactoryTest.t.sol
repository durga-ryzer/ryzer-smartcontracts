// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Test, console} from "forge-std/Test.sol";
import {DeployRyzerCore} from "script/DeployRyzerCore.s.sol";
import {RyzerFactory} from "src/core/RyzerFactory.sol";
import {RyzerRegistry} from "src/core/RyzerRegistry.sol";

import {HelperConfig} from "script/HelperConfig.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract RyzerFactoryTest is Test {
    DeployRyzerCore deployerCore;
    RyzerFactory ryzerFactory;
    ERC1967Proxy factoryProxy;
    RyzerRegistry ryzerRegistry;
    ERC1967Proxy registryProxy;
    HelperConfig helperConfig;

    address deployer;

    address user = makeAddr("user");

    string public companyName = "Google";
    string public jurisdiction = "USA";

    function setUp() external {
        helperConfig = new HelperConfig();
        (, deployer) = helperConfig.activeNetworkConfig();
        deployerCore = new DeployRyzerCore();
        (registryProxy,, factoryProxy,,,,,,) = deployerCore.run();
        vm.startPrank(deployer);
        ryzerFactory = RyzerFactory(address(factoryProxy));
        ryzerRegistry = RyzerRegistry(payable(registryProxy));
        vm.stopPrank();
    }

    function testRegisterCompany_Success() public {
        RyzerFactory.CompanyParams memory params = RyzerFactory.CompanyParams({
            name: companyName,
            jurisdiction: jurisdiction,
            companyType: RyzerFactory.CompanyType.LLC
        });

        // Expect the event
        vm.startPrank(deployer); // need to check
        vm.expectEmit(true, true, true, true);
        emit RyzerFactory.CompanyRegistered({
            companyId: 1,
            owner: deployer,
            name: companyName,
            jurisdiction: jurisdiction,
            companyType: RyzerFactory.CompanyType.LLC
        });

        ryzerFactory.registerCompany(params);
        vm.stopPrank();

        assertEq(ryzerFactory.ownerToCompany(deployer), 1);
        assertEq(ryzerFactory.companyCount(), 1);
    }
}
