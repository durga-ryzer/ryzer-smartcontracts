// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title RyzerDAO
/// @notice Governance contract for managing proposals and voting in the Ryzer ecosystem
/// @dev Uses UUPS upgradeable pattern with fallback execution for stalled proposals
contract RyzerDAO is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    /*//////////////////////////////////////////////////////////////
                         ERRORS
    //////////////////////////////////////////////////////////////*/
    error InvalidAddress(address addr);
    error InvalidDelay();
    error InsufficientBalance();
    error ProposalNotFound();
    error VotingPeriodEnded();
    error AlreadyVoted();
    error AlreadySigned();
    error InsufficientQuorum();
    error InsufficientSignatures();
    error ProposalExpired();
    error ProposalNotExpired();
    error InvalidSignatureCount();
    error InvalidParameter(string parameter);
    error CannotModifyAdmin(address addr);

    /*//////////////////////////////////////////////////////////////
                        TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/
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

    /*//////////////////////////////////////////////////////////////
                         STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant MIN_PROPOSAL_DELAY = 1 hours;
    uint256 public constant MAX_PROPOSAL_DELAY = 30 days;
    uint256 public constant VOTING_DURATION = 3 days;
    uint256 public constant EXECUTION_DEADLINE = 7 days;
    uint256 public constant MIN_SIGNATURES = 2;
    uint256 public constant MAX_SIGNATURES = 10;
    uint256 public constant MIN_QUORUM = 10 * 10 ** 18;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;

    IERC20 public ryzerXToken;
    address public project;
    uint256 public proposalCount;
    uint256 public requiredSignatures;
    uint256 public quorumThreshold; // Percentage (e.g., 66 for 66%)
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public proposalVoters;
    mapping(uint256 => mapping(address => bool)) public proposalSigners;

    /*//////////////////////////////////////////////////////////////
                           EVENTS
    //////////////////////////////////////////////////////////////*/

    event DAOInitialized(address indexed ryzerXToken, address indexed project, uint256 quorumThreshold);
    event CoreContractsSet(address indexed ryzerXToken, address indexed project);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, uint48 delay);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalSigned(uint256 indexed proposalId, address indexed signer);
    event ProposalExecuted(uint256 indexed proposalId);
    event FallbackExecution(uint256 indexed proposalId);
    event SignerAdded(address indexed signer);
    event SignerRevoked(address indexed signer);
    event GovernanceParamsSet(uint256 requiredSignatures, uint256 quorumThreshold);

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the DAO
    /// @param _project Project address
    /// @param _ryzerXToken RyzerX token address
    /// @param _quorumThreshold Quorum threshold percentage (e.g., 66 for 66%)
    function initialize(address _project, address _ryzerXToken, uint256 _quorumThreshold) external initializer {
        if (_project == address(0) || _ryzerXToken == address(0)) {
            revert InvalidAddress(address(0));
        }
        if (_project.code.length == 0 || _ryzerXToken.code.length == 0) {
            revert InvalidAddress(_project);
        }

        if (_quorumThreshold < 50 || _quorumThreshold > 100) {
            revert InvalidParameter("quorumThreshold");
        }

        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        project = _project;
        ryzerXToken = IERC20(_ryzerXToken);
        quorumThreshold = _quorumThreshold;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        emit DAOInitialized(_ryzerXToken, _project, _quorumThreshold);
    }

    /// @notice Sets core contract addresses and chain ID
    /// @param _ryzerXToken New RyzerX token address
    /// @param _project New project address
    function setCoreContracts(address _ryzerXToken, address _project) external onlyRole(ADMIN_ROLE) {
        if (_project == address(0) || _ryzerXToken == address(0)) {
            revert InvalidAddress(address(0));
        }
        if (_project.code.length == 0 || _ryzerXToken.code.length == 0) {
            revert InvalidAddress(_project);
        }
        ryzerXToken = IERC20(_ryzerXToken);
        project = _project;
        emit CoreContractsSet(_ryzerXToken, _project);
    }

    /// @notice Sets governance parameters
    /// @param _requiredSignatures Number of required signatures
    /// @param _quorumThreshold Quorum threshold percentage (e.g., 66 for 66%)
    function setGovernanceParams(uint256 _requiredSignatures, uint256 _quorumThreshold) external onlyRole(ADMIN_ROLE) {
        if (_requiredSignatures < MIN_SIGNATURES || _requiredSignatures > MAX_SIGNATURES) {
            revert InvalidSignatureCount();
        }
        if (_quorumThreshold < 50 || _quorumThreshold > 100) {
            revert InvalidParameter("quorumThreshold");
        }

        requiredSignatures = _requiredSignatures;
        quorumThreshold = _quorumThreshold;
        emit GovernanceParamsSet(_requiredSignatures, _quorumThreshold);
    }

    /// @notice Creates a new proposal
    /// @param description Proposal description (1 to 1000 bytes)
    /// @param delay Voting delay (1 hour to 30 days)
    function propose(string calldata description, uint48 delay) external nonReentrant whenNotPaused {
        if (ryzerXToken.balanceOf(msg.sender) < MIN_QUORUM) {
            revert InsufficientBalance();
        }
        if (delay < MIN_PROPOSAL_DELAY || delay > MAX_PROPOSAL_DELAY) {
            revert InvalidDelay();
        }
        uint256 descLength = bytes(description).length;
        if (descLength == 0 || descLength > MAX_DESCRIPTION_LENGTH) {
            revert InvalidParameter("description length");
        }

        proposalCount++;
        Proposal storage proposal = proposals[proposalCount];
        proposal.description = description;
        proposal.startTime = uint48(block.timestamp + delay);
        proposal.endTime = uint48(block.timestamp + delay + VOTING_DURATION);
        proposal.deadline = uint48(block.timestamp + delay + EXECUTION_DEADLINE);

        emit ProposalCreated(proposalCount, msg.sender, description, delay);
    }

    /// @notice Votes on a proposal
    /// @param proposalId Proposal ID
    /// @param support Vote support (true for, false against)
    function vote(uint256 proposalId, bool support) external nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.startTime == 0) revert ProposalNotFound();
        if (block.timestamp < proposal.startTime || block.timestamp > proposal.endTime) revert VotingPeriodEnded();
        if (proposalVoters[proposalId][msg.sender]) revert AlreadyVoted();

        uint256 weight = ryzerXToken.balanceOf(msg.sender);
        if (weight < MIN_QUORUM) revert InsufficientBalance();

        proposalVoters[proposalId][msg.sender] = true;
        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    /// @notice Signs a proposal for execution
    /// @param proposalId Proposal ID
    /// @dev Reverts with AlreadySigned if the sender has already signed
    function signProposal(uint256 proposalId) external nonReentrant onlyRole(ADMIN_ROLE) whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        uint48 startTime = proposal.startTime;
        if (startTime == 0) revert ProposalNotFound();
        if (block.timestamp > proposal.deadline) revert ProposalExpired();
        if (proposalSigners[proposalId][msg.sender]) revert AlreadySigned();
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        if (totalVotes < MIN_QUORUM || (proposal.forVotes * 100) / totalVotes < quorumThreshold) {
            revert InsufficientQuorum();
        }

        proposalSigners[proposalId][msg.sender] = true;
        proposal.signatureCount++;
        uint256 signaturesRequired = requiredSignatures;

        if (proposal.signatureCount >= signaturesRequired && !proposal.executed) {
            proposal.executed = true;
            emit ProposalExecuted(proposalId);
        }

        emit ProposalSigned(proposalId, msg.sender);
    }

    /// @notice Executes a proposal after timeout if signatures are insufficient
    /// @param proposalId Proposal ID
    function executeFallback(uint256 proposalId) external onlyRole(ADMIN_ROLE) whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.startTime == 0) revert ProposalNotFound();
        if (block.timestamp <= proposal.deadline) revert ProposalNotExpired();
        if (proposal.executed) revert ProposalNotFound();
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        if (totalVotes < MIN_QUORUM || (proposal.forVotes * 100) / totalVotes < quorumThreshold) {
            revert InsufficientQuorum();
        }

        proposal.executed = true;
        emit FallbackExecution(proposalId);
    }

    /// @notice Adds a new signer
    /// @param signer New signer address
    function addSigner(address signer) external onlyRole(ADMIN_ROLE) {
        if (signer == address(0)) revert InvalidAddress(signer);
        if (hasRole(DEFAULT_ADMIN_ROLE, signer)) {
            revert CannotModifyAdmin(signer);
        }
        _grantRole(ADMIN_ROLE, signer);
        emit SignerAdded(signer);
    }

    /// @notice Revokes a signer
    /// @param signer Signer address to revoke
    function revokeSigner(address signer) external onlyRole(ADMIN_ROLE) {
        if (signer == address(0) || !hasRole(ADMIN_ROLE, signer)) {
            revert InvalidAddress(signer);
        }
        if (hasRole(DEFAULT_ADMIN_ROLE, signer)) {
            revert CannotModifyAdmin(signer);
        }
        _revokeRole(ADMIN_ROLE, signer);
        emit SignerRevoked(signer);
    }

    /// @notice Pauses the contract
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Authorizes contract upgrades
    /// @param newImplementation New implementation address
    function _authorizeUpgrade(address newImplementation) internal view override onlyRole(ADMIN_ROLE) {
        if (newImplementation == address(0) || newImplementation.code.length == 0) {
            revert InvalidAddress(newImplementation);
        }
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Gets proposal status
    /// @param proposalId Proposal ID
    /// @return proposal Proposal details
    function getProposalStatus(uint256 proposalId) external view returns (Proposal memory proposal) {
        return proposals[proposalId];
    }
}
