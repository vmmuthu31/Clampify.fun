// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ClampifyGovernance
 * @dev Governance contract for community voting on Clampify platform
 */
contract ClampifyGovernance is ReentrancyGuard, Ownable {
    // Platform factory
    address public factory;
    
    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        uint256 createdAt;
        uint256 votingEndsAt;
        bool executed;
        address targetContract;
        bytes callData;
        uint256 yesVotes;
        uint256 noVotes;
        mapping(address => bool) hasVoted;
    }
    
    // Token-based governance parameters
    struct TokenGovernance {
        address tokenAddress;
        uint256 proposalThreshold;
        uint256 quorum;
        uint256 votingPeriod;
        bool isActive;
    }
    
    // Proposals mapping
    mapping(address => mapping(uint256 => Proposal)) public proposals;
    mapping(address => uint256) public proposalCount;
    
    // Token governance parameters
    mapping(address => TokenGovernance) public tokenGovernance;
    
    // List of tokens with governance
    address[] public governanceTokens;
    
    // Events
    event ProposalCreated(address indexed tokenAddress, uint256 indexed proposalId, string title, address proposer);
    event VoteCast(address indexed tokenAddress, uint256 indexed proposalId, address voter, bool support, uint256 weight);
    event ProposalExecuted(address indexed tokenAddress, uint256 indexed proposalId, bool success);
    event GovernanceActivated(address indexed tokenAddress, uint256 proposalThreshold, uint256 quorum, uint256 votingPeriod);
    
    /**
     * @dev Constructor
     * @param _factory Factory contract address
     */
    constructor(address _factory) Ownable(msg.sender) {
        require(_factory != address(0), "Factory cannot be zero address");
        factory = _factory;
    }
    
    /**
     * @dev Activate governance for a token
     * @param tokenAddress Token address
     * @param proposalThreshold Minimum token balance to create a proposal (in tokens)
     * @param quorum Minimum participation required for a proposal to pass (percentage)
     * @param votingPeriod Voting period in seconds
     */
    function activateGovernance(
        address tokenAddress,
        uint256 proposalThreshold,
        uint256 quorum,
        uint256 votingPeriod
    ) external onlyOwner {
        require(tokenAddress != address(0), "Token cannot be zero address");
        require(quorum > 0 && quorum <= 100, "Quorum must be between 1 and 100");
        require(votingPeriod > 0, "Voting period must be > 0");
        require(!tokenGovernance[tokenAddress].isActive, "Governance already active");
        
        tokenGovernance[tokenAddress] = TokenGovernance({
            tokenAddress: tokenAddress,
            proposalThreshold: proposalThreshold,
            quorum: quorum,
            votingPeriod: votingPeriod,
            isActive: true
        });
        
        governanceTokens.push(tokenAddress);
        
        emit GovernanceActivated(tokenAddress, proposalThreshold, quorum, votingPeriod);
    }
    
    /**
     * @dev Create a proposal
     * @param proposer Proposer address
     * @param tokenAddress Token address
     * @param title Proposal title
     * @param description Proposal description
     * @param targetContract Target contract to call if proposal passes
     * @param callData Call data for the target contract
     * @return Proposal ID
     */
    function createProposal(
        address proposer,
        address tokenAddress,
        string memory title,
        string memory description,
        address targetContract,
        bytes memory callData
    ) external nonReentrant returns (uint256) {
        TokenGovernance storage gov = tokenGovernance[tokenAddress];
        require(gov.isActive, "Governance not active for this token");
        
        // Check if proposer has enough tokens
        uint256 balance = IERC20(tokenAddress).balanceOf(proposer);
        require(balance >= gov.proposalThreshold, "Insufficient tokens to create proposal");
        
        uint256 proposalId = proposalCount[tokenAddress] + 1;
        Proposal storage proposal = proposals[tokenAddress][proposalId];
        
        proposal.id = proposalId;
        proposal.proposer = proposer;
        proposal.title = title;
        proposal.description = description;
        proposal.createdAt = block.timestamp;
        proposal.votingEndsAt = block.timestamp + gov.votingPeriod;
        proposal.executed = false;
        proposal.targetContract = targetContract;
        proposal.callData = callData;
        proposal.yesVotes = 0;
        proposal.noVotes = 0;
        
        proposalCount[tokenAddress] = proposalId;
        
        emit ProposalCreated(tokenAddress, proposalId, title, proposer);
        
        return proposalId;
    }
    
    /**
     * @dev Cast a vote on a proposal
     * @param voter Voter address
     * @param tokenAddress Token address
     * @param proposalId Proposal ID
     * @param support Whether to support the proposal
     */
    function castVote(
        address voter,
        address tokenAddress,
        uint256 proposalId,
        bool support
    ) external nonReentrant {
        require(tokenGovernance[tokenAddress].isActive, "Governance not active for this token");
        require(proposalId > 0 && proposalId <= proposalCount[tokenAddress], "Invalid proposal ID");
        
        Proposal storage proposal = proposals[tokenAddress][proposalId];
        require(block.timestamp < proposal.votingEndsAt, "Voting period ended");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.hasVoted[voter], "Already voted");
        
        // Get voter's token balance
        uint256 weight = IERC20(tokenAddress).balanceOf(voter);
        require(weight > 0, "No voting power");
        
        // Record vote
        proposal.hasVoted[voter] = true;
        
        if (support) {
            proposal.yesVotes += weight;
        } else {
            proposal.noVotes += weight;
        }
        
        emit VoteCast(tokenAddress, proposalId, voter, support, weight);
    }
    
    /**
     * @dev Execute a proposal if it passed
     * @param tokenAddress Token address
     * @param proposalId Proposal ID
     */
    function executeProposal(address tokenAddress, uint256 proposalId) external nonReentrant {
        require(tokenGovernance[tokenAddress].isActive, "Governance not active for this token");
        require(proposalId > 0 && proposalId <= proposalCount[tokenAddress], "Invalid proposal ID");
        
        Proposal storage proposal = proposals[tokenAddress][proposalId];
        require(block.timestamp >= proposal.votingEndsAt, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        
        // Check quorum and result
        uint256 totalSupply = IERC20(tokenAddress).totalSupply();
        uint256 totalVotes = proposal.yesVotes + proposal.noVotes;
        uint256 quorumThreshold = (totalSupply * tokenGovernance[tokenAddress].quorum) / 100;
        
        require(totalVotes >= quorumThreshold, "Quorum not reached");
        require(proposal.yesVotes > proposal.noVotes, "Proposal did not pass");
        
        proposal.executed = true;
        
        // Execute the proposal
        (bool success, ) = proposal.targetContract.call(proposal.callData);
        
        emit ProposalExecuted(tokenAddress, proposalId, success);
    }
    
    /**
     * @dev Get proposal details
     * @param tokenAddress Token address
     * @param proposalId Proposal ID
     * @return Title
     * @return Description
     * @return Proposer
     * @return CreatedAt
     * @return VotingEndsAt
     * @return Executed
     * @return TargetContract
     * @return YesVotes
     * @return NoVotes
     */
    function getProposalDetails(address tokenAddress, uint256 proposalId) external view returns (
        string memory,
        string memory,
        address,
        uint256,
        uint256,
        bool,
        address,
        uint256,
        uint256
    ) {
        Proposal storage proposal = proposals[tokenAddress][proposalId];
        return (
            proposal.title,
            proposal.description,
            proposal.proposer,
            proposal.createdAt,
            proposal.votingEndsAt,
            proposal.executed,
            proposal.targetContract,
            proposal.yesVotes,
            proposal.noVotes
        );
    }
    
    /**
     * @dev Check if an address has voted on a proposal
     * @param tokenAddress Token address
     * @param proposalId Proposal ID
     * @param voter Voter address
     * @return True if the address has voted
     */
    function hasVoted(address tokenAddress, uint256 proposalId, address voter) external view returns (bool) {
        return proposals[tokenAddress][proposalId].hasVoted[voter];
    }
    
    /**
     * @dev Get all governance tokens
     * @return Array of token addresses with governance
     */
    function getGovernanceTokens() external view returns (address[] memory) {
        return governanceTokens;
    }
    
    /**
     * @dev Update governance parameters for a token
     * @param tokenAddress Token address
     * @param proposalThreshold New proposal threshold
     * @param quorum New quorum
     * @param votingPeriod New voting period
     */
    function updateGovernanceParameters(
        address tokenAddress,
        uint256 proposalThreshold,
        uint256 quorum,
        uint256 votingPeriod
    ) external onlyOwner {
        require(tokenGovernance[tokenAddress].isActive, "Governance not active for this token");
        require(quorum > 0 && quorum <= 100, "Quorum must be between 1 and 100");
        require(votingPeriod > 0, "Voting period must be > 0");
        
        TokenGovernance storage gov = tokenGovernance[tokenAddress];
        gov.proposalThreshold = proposalThreshold;
        gov.quorum = quorum;
        gov.votingPeriod = votingPeriod;
        
        emit GovernanceActivated(tokenAddress, proposalThreshold, quorum, votingPeriod);
    }
    
    /**
     * @dev Deactivate governance for a token
     * @param tokenAddress Token address
     */
    function deactivateGovernance(address tokenAddress) external onlyOwner {
        require(tokenGovernance[tokenAddress].isActive, "Governance not active for this token");
        
        tokenGovernance[tokenAddress].isActive = false;
    }
}