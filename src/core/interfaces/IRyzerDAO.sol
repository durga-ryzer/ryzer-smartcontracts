// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

interface IRyzerDAO {
    struct Proposal {
        string description;
        uint48 startTime;
        uint48 endTime;
        uint48 deadline;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 signatureCount;
        bool executed;
    }

    // Events
    event DAOInitialized(
        address indexed ryzerXToken,
        address indexed project,
        uint16 chainId,
        uint256 requiredSignatures,
        uint256 quorumThreshold
    );
    event CoreContractsSet(address indexed ryzerXToken, address indexed project, uint16 chainId);
    event ProposalCreated(
        uint256 indexed proposalId, address indexed proposer, string description, uint48 delay, uint16 chainId
    );
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight, uint16 chainId);
    event ProposalSigned(uint256 indexed proposalId, address indexed signer, uint16 chainId);
    event ProposalExecuted(uint256 indexed proposalId, uint16 chainId);
    event FallbackExecution(uint256 indexed proposalId, uint16 chainId);
    event SignerAdded(address indexed signer, uint16 chainId);
    event SignerRevoked(address indexed signer, uint16 chainId);
    event GovernanceParamsSet(uint256 requiredSignatures, uint256 quorumThreshold, uint16 chainId);

    // External functions
    function initialize(
        address _project,
        address _ryzerXToken,
        uint16 _chainId,
        address[] memory initialSigners,
        uint256 _requiredSignatures,
        uint256 _quorumThreshold
    ) external;

    function setCoreContracts(address _ryzerXToken, address _project, uint16 _chainId) external;

    function setGovernanceParams(uint256 _requiredSignatures, uint256 _quorumThreshold) external;

    function propose(string calldata description, uint48 delay) external;

    function vote(uint256 proposalId, bool support) external;

    function signProposal(uint256 proposalId) external;

    function executeFallback(uint256 proposalId) external;

    function addSigner(address signer) external;

    function revokeSigner(address signer) external;

    function pause() external;

    function unpause() external;

    function getProposalStatus(uint256 proposalId) external view returns (Proposal memory);

    // View functions
    function ryzerXToken() external view returns (address);
    function project() external view returns (address);
    function chainId() external view returns (uint16);
    function proposalCount() external view returns (uint256);
    function requiredSignatures() external view returns (uint256);
    function quorumThreshold() external view returns (uint256);
    function proposals(uint256)
        external
        view
        returns (
            string memory description,
            uint48 startTime,
            uint48 endTime,
            uint48 deadline,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 signatureCount,
            bool executed
        );
    function proposalVoters(uint256 proposalId, address voter) external view returns (bool);
    function proposalSigners(uint256 proposalId, address signer) external view returns (bool);
}
