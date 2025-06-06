// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Test, console} from "forge-std/Test.sol";
import {DeployRyzerCore} from "script/DeployRyzerCore.s.sol";
import {RyzerFactory} from "src/core/RyzerFactory.sol";
import {RyzerRegistry} from "src/core/RyzerRegistry.sol";
import {RyzerProject} from "src/core/RyzerProject.sol";
import {RyzerEscrow} from "src/core/RyzerEscrow.sol";
import {RyzerOrderManager} from "src/core/RyzerOrderManager.sol";
import {RyzerDAO} from "src/core/RyzerDAO.sol";
import {UsdtMock} from "src/core/UsdtMock.sol";
import {HelperConfig} from "script/HelperConfig.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract RyzerFactoryTest is Test {
    DeployRyzerCore deployerCore;
    RyzerFactory ryzerFactory;
    ERC1967Proxy factoryProxy;
    RyzerRegistry ryzerRegistry;
    ERC1967Proxy registryProxy;
    RyzerProject project;
    RyzerEscrow escrow;
    RyzerDAO dao;
    RyzerOrderManager orderManager;
    HelperConfig helperConfig;

    address deployer;
    address usdt;
    address ryzerToken;

    address user = makeAddr("user");

    string public companyName = "Test Company";
    string public jurisdiction = "Test Jurisdiction";
    string public projectName = "Test Project";

    function setUp() external {
        deployerCore = new DeployRyzerCore();
        (
            registryProxy,
            ,
            factoryProxy,
            ,
            project,
            escrow,
            orderManager,
            dao,
            helperConfig
        ) = deployerCore.run();

        (usdt, ryzerToken, deployer) = helperConfig.activeNetworkConfig();

        ryzerFactory = RyzerFactory(address(factoryProxy));
        ryzerRegistry = RyzerRegistry(payable(registryProxy));

        vm.startPrank(deployer);
        ryzerFactory.setCoreContracts(usdt, ryzerToken, address(registryProxy)); // after  deploying factory we have to call this function
        UsdtMock(usdt).mint(user, 1000e6);
        vm.stopPrank();
    }

    function _registerCompany(
        address owner,
        string memory name,
        string memory jurisdiction
    ) internal {
        RyzerFactory.CompanyParams memory params = RyzerFactory.CompanyParams({
            name: name,
            jurisdiction: jurisdiction,
            companyType: RyzerFactory.CompanyType.LLC
        });

        vm.startPrank(owner);

        // vm.expectEmit(true, true, true, true);
        // emit RyzerFactory.CompanyRegistered({
        //     companyId: 1,
        //     owner: owner,
        //     name: companyName,
        //     jurisdiction: jurisdiction,
        //     companyType: RyzerFactory.CompanyType.LLC
        // });
        ryzerFactory.registerCompany(params);
        vm.stopPrank();
    }
    // role management
    // storage concern
    // decimal if currency changes //
    // variables redundancy

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
            symbol: "RYZX",
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

        vm.prank(owner);
        (
            expectedProject,
            expectedEscrow,
            expectedOrderManager,
            expectedDao
        ) = ryzerFactory.createProject(companyId, params);
    }

    function testRegisterCompany_Success() public {
        _registerCompany(deployer, companyName, jurisdiction);

        _registerCompany(deployer, "Sample Company", "Sample Jurisdiction");

        // assertEq(ryzerFactory.ownerToCompany(deployer), 1);
        assertEq(ryzerFactory.companyCount(), 2);
    }

    function testCreateProject_Success() public {
        _registerCompany(deployer, companyName, jurisdiction);

        uint256 companyId = ryzerFactory.ownerToCompany(deployer);
        _createProject(deployer, companyId, projectName);

        assertEq(companyId, 1);
    }

    function testPlaceOrder_Success() public {
        _registerCompany(deployer, companyName, jurisdiction);

        uint256 companyId = ryzerFactory.ownerToCompany(deployer);
        (
            address projectAddress,
            address escrowAddress,
            address orderManagerAddress,
            address daoAddresss
        ) = _createProject(deployer, companyId, projectName);

        RyzerOrderManager.PlaceOrderParams memory params = RyzerOrderManager
            .PlaceOrderParams({
                _user: user,
                _projectAddress: projectAddress,
                _escrowAddress: escrowAddress,
                _amount: 20e18,
                _assetId: bytes32("1"),
                _currencyPrice: 50e6, // usdt price
                _paymentType: RyzerOrderManager.PaymentType.FULL,
                _currency: RyzerOrderManager.Currency.USDT,
                _fees: 4e6 // reconfirm
            });

        //vm.startPrank(deployer);
        // project.setProjectContracts(
        //     address(escrow),
        //     address(orderManager),
        //     address(dao)
        // );
        // orderManager.setProjectContracts(usdt, address(escrow), projectAddress);
        // escrow.setCoreContracts(usdt, projectAddress, uint16(block.chainid));
        //vm.stopPrank();
        assertTrue(RyzerProject(projectAddress).balanceOf(user) == 0);

        vm.startPrank(user);
        UsdtMock(usdt).approve(escrowAddress, 200e6); // check this // 44
        bytes32 orderId = orderManager.placeOrder(params);
        vm.stopPrank();
        if (params._paymentType == RyzerOrderManager.PaymentType.FULL)
            assertTrue(RyzerProject(projectAddress).balanceOf(user) > 0);

        vm.startPrank(user);
        orderManager.finalizeOrder(
            user,
            projectAddress,
            escrowAddress,
            orderId
        );
        vm.stopPrank();
    }
}
