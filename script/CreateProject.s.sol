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

contract CreateProject is Script {
    address factoryProxy = 0x0C91DAEF85FC0a5509D18A7fE8a75baF8DCa9280;
    RyzerFactory ryzerFactory = RyzerFactory(factoryProxy);

    string projectName = "Akash. Project";
    string projectSymbol = "AKASH369";

    function run() external {
        address deployer = 0x3c5a809e712D30D932b71EdB066FA2EEDEE6Ad58;

        vm.startBroadcast(deployer);

        uint256 companyId = 1; //ryzerFactory.ownerToCompany(deployer);

        (
            address expectedProject,
            address expectedEscrow,
            address expectedOrderManager,
            address expectedDao
        ) = _createProject(deployer, companyId, projectName);

        vm.stopBroadcast();

        console.log("Project", expectedProject);
        console.log("Escrow", expectedEscrow);
        console.log("OrderManager", expectedOrderManager);
        console.log("Dao", expectedDao);
    }

    function _createProject(
        address owner,
        uint256 companyId,
        string memory projectName
    )
        internal
        returns (
            address expectedProject,
            address expectedEscrow,
            address expectedOrderManager,
            address expectedDao
        )
    {
        RyzerFactory.ProjectParams memory params = RyzerFactory.ProjectParams({
            name: projectName,
            symbol: projectSymbol,
            assetType: bytes32("Commercial"),
            chainId: uint16(block.chainid),
            minInvestment: 10e18, // decimal attached
            maxInvestment: 100e18,
            totalSupply: 1000e18, // asset token in genral 18 decimal
            assetId: bytes32("1"),
            requiredSignatures: 3, // remove this parameter
            tokenPrice: 100e18, // how much user want to define
            cancelDelay: 86400,
            eoiPct: 10, // 10% of the total amount // check once
            dividendPct: 10,
            premintAmount: 1000e18, // premint = total supply of asset token
            metadataCID: bytes32("1"),
            legalMetadataCID: bytes32("1"),
            projectOwner: owner, // we have to check once
            factory: address(factoryProxy)
        });
        (
            expectedProject,
            expectedEscrow,
            expectedOrderManager,
            expectedDao
        ) = ryzerFactory.createProject(companyId, params);
    }
}

contract RegisterCompany is Script {
    address factoryProxy = 0xBdFE3b3aBE5ac3327A37eE78BC58890b0482b143;
    RyzerFactory ryzerFactory = RyzerFactory(factoryProxy);

    function run() external {
        address deployer = 0x3c5a809e712D30D932b71EdB066FA2EEDEE6Ad58;
        address usdt = 0x8c99B4e51eA9Aa3df5F44FAeF0061f7Ad9Ef5102;
        address ryzerToken = 0x784E7DeBd0690697B69688B6daA684611b6B8079; //0xDF40382D86Fc26ac8938Cd23f7d4ba58BC32c608;
        address registryProxy = 0x370a3b5Cb223d2C047C2666Aa567Cc76D5410f0b;

        vm.startBroadcast(deployer);

        ryzerFactory.setCoreContracts(usdt, ryzerToken, registryProxy);

        // uint256 companyId = _registerCompany(
        //     deployer,
        //     "Sample Company",
        //     "Sample Jurisdiction"
        // );

        vm.stopBroadcast();
        // console.log("Company Id", companyId);
        // console.log(
        //     "Company Registered",
        //     ryzerFactory.ownerToCompany(deployer)
        // );
    }

    function _registerCompany(
        address owner,
        string memory name,
        string memory jurisdiction
    ) internal returns (uint256) {
        RyzerFactory.CompanyParams memory params = RyzerFactory.CompanyParams({
            name: name,
            jurisdiction: jurisdiction,
            companyType: RyzerFactory.CompanyType.LLC
        });

        uint256 companyId = ryzerFactory.registerCompany(params);
        return companyId;
    }
}
