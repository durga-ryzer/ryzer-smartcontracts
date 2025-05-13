"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExtendedContract = createExtendedContract;
const ethers_1 = require("ethers");
// Helper function to create an ExtendedContract
function createExtendedContract(address, abi, provider) {
    return new ethers_1.ethers.Contract(address, abi, provider);
}
