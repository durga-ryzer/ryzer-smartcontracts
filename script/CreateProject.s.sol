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
    address factoryProxy = 0x50e61c1b9FD2757F233872FdDb039C073C525107;
    RyzerFactory ryzerFactory = RyzerFactory(factoryProxy);

    string projectName = "Gemini";

    function run() external {
        address deployer = 0x3c5a809e712D30D932b71EdB066FA2EEDEE6Ad58;

        vm.startBroadcast(deployer);

        uint256 companyId = ryzerFactory.ownerToCompany(deployer);

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
            assetType: bytes32("Commercial"),
            chainId: uint16(block.chainid),
            minInvestment: 10e18, // decimal attached
            maxInvestment: 80e18,
            totalSupply: 100e18, // asset token in genral 18 decimal
            assetId: bytes32("1"),
            requiredSignatures: 3, // remove this parameter
            tokenPrice: 100e18, // how much user want to define
            cancelDelay: 86400,
            eoiPct: 10, // 10% of the total amount // check once
            dividendPct: 10,
            premintAmount: 100e18, // premint = total supply of asset token
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
