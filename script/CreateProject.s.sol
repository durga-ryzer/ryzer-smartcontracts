// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.29;

import "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {RyzerRegistry} from "src/core/RyzerRegistry.sol";
import {RyzerFactory} from "src/core/RyzerFactory.sol";
import {RyzerRealEstateToken} from "src/core/RyzerRealEstateToken.sol";
import {RyzerEscrow} from "src/core/RyzerEscrow.sol";
import {RyzerOrderManager} from "src/core/RyzerOrderManager.sol";
import {RyzerDAO} from "src/core/RyzerDAO.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract CreateProject is Script {
    address factoryProxy = 0xC2bD23767E9cA47C9362E9059EDae151dD07ef9e; // xrpl
    RyzerFactory ryzerFactory = RyzerFactory(factoryProxy);

    string projectName = "Akash Project";
    string projectSymbol = "AK47";

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
            onchainID: address(0),
            name: projectName,
            symbol: projectSymbol,
            decimals: 18,
            maxSupply: 100e18,
            tokenPrice: 100e6,
            cancelDelay: 86400,
            projectOwner: owner, // we have to check once
            assetId: bytes32("1"),
            assetType: bytes32("Commercial"),
            metadataCID: bytes32("1"),
            legalMetadataCID: bytes32("1"),
            minInvestment: 10e18, // decimal attached
            maxInvestment: 80e18,
            eoiPct: 10, // 10% of the total amount // check once
            dividendPct: 10,
            premintAmount: 100e18,
            requiredSignatures: 3,
            lockPeriod: 365 days
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
    address factoryProxy = 0xC2bD23767E9cA47C9362E9059EDae151dD07ef9e;
    RyzerFactory ryzerFactory = RyzerFactory(factoryProxy);

    function run() external {
        address deployer = 0x3c5a809e712D30D932b71EdB066FA2EEDEE6Ad58;

        vm.startBroadcast(deployer);

        uint256 companyId = _registerCompany(deployer, "Amazon", "India");

        vm.stopBroadcast();
        console.log("Company Id", companyId);
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
