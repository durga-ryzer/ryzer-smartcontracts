// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

library MerkleTreeLib {
    function createMerkleRoot(address[] memory leaves) internal pure returns (bytes32) {
        require(leaves.length > 0, "No leaves provided");
        bytes32[] memory nodes = new bytes32[](leaves.length);
        for (uint i = 0; i < leaves.length; i++) {
            nodes[i] = keccak256(abi.encodePacked(leaves[i]));
        }

        while (nodes.length > 1) {
            bytes32[] memory nextLevel = new bytes32[]((nodes.length + 1) / 2);
            for (uint i = 0; i < nodes.length; i += 2) {
                if (i + 1 < nodes.length) {
                    nextLevel[i / 2] = keccak256(abi.encodePacked(
                        nodes[i] < nodes[i + 1] ? nodes[i] : nodes[i + 1],
                        nodes[i] < nodes[i + 1] ? nodes[i + 1] : nodes[i]
                    ));
                } else {
                    nextLevel[i / 2] = nodes[i];
                }
            }
            nodes = nextLevel;
        }
        return nodes[0];
    }

    function generateProof(address[] memory leaves, uint256 index) internal pure returns (bytes32[] memory) {
        require(index < leaves.length, "Invalid index");
        bytes32[] memory nodes = new bytes32[](leaves.length);
        for (uint i = 0; i < leaves.length; i++) {
            nodes[i] = keccak256(abi.encodePacked(leaves[i]));
        }

        bytes32[] memory proof;
        uint256 depth = 0;
        while ((leaves.length + (1 << depth) - 1) / (1 << depth) > 1) {
            depth++;
        }
        proof = new bytes32[](depth);

        uint256 currentIndex = index;
        uint256 levelLength = leaves.length;
        for (uint i = 0; i < depth; i++) {
            if (currentIndex % 2 == 0 && currentIndex + 1 < levelLength) {
                proof[i] = nodes[currentIndex + 1];
            } else if (currentIndex % 2 == 1) {
                proof[i] = nodes[currentIndex - 1];
            } else {
                proof[i] = bytes32(0);
            }

            bytes32[] memory nextLevel = new bytes32[]((levelLength + 1) / 2);
            for (uint j = 0; j < levelLength; j += 2) {
                if (j + 1 < levelLength) {
                    nextLevel[j / 2] = keccak256(abi.encodePacked(
                        nodes[j] < nodes[j + 1] ? nodes[j] : nodes[j + 1],
                        nodes[j] < nodes[j + 1] ? nodes[j + 1] : nodes[j]
                    ));
                } else {
                    nextLevel[j / 2] = nodes[j];
                }
            }
            nodes = nextLevel;
            levelLength = (levelLength + 1) / 2;
            currentIndex /= 2;
        }
        return proof;
    }

    function updateMerkleRoot(address[] memory currentLeaves, address newLeaf, bool add, uint256 index) internal pure returns (bytes32) {
        require(currentLeaves.length > 0, "No leaves provided");
        address[] memory updatedLeaves = new address[](add ? currentLeaves.length + 1 : currentLeaves.length - 1);
        if (add) {
            for (uint i = 0; i < currentLeaves.length; i++) {
                updatedLeaves[i] = currentLeaves[i];
            }
            updatedLeaves[currentLeaves.length] = newLeaf;
        } else {
            require(index < currentLeaves.length, "Invalid index");
            uint j = 0;
            for (uint i = 0; i < currentLeaves.length; i++) {
                if (i == index) continue;
                updatedLeaves[j] = currentLeaves[i];
                j++;
            }
        }
        return createMerkleRoot(updatedLeaves);
    }
}