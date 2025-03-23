// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./ClampifyToken.sol"; 

/**
 * @title ClampifyFactory
 * @dev Factory contract for creating new meme tokens with bonding curve and supply locking
 */
contract ClampifyFactory is Ownable, ReentrancyGuard {
    // Fee structure
    uint256 public creationFee = 0.01 ether;
    uint256 public tradingFeePercent = 2; // 2% trading fee
    
    // Token details structure
    struct TokenInfo {
        address tokenAddress;
        address creator;
        uint256 createdAt;
        uint256 lockupPeriod;
        bool liquidityLocked;
        uint256 liquidityUnlockTime;
    }
    
    // Mapping of token address to token info
    mapping(address => TokenInfo) public tokens;
    
    // Array of token addresses
    address[] public allTokens;
    
    // Events
    event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol);
    event FeesUpdated(uint256 creationFee, uint256 tradingFeePercent);
    event FeesCollected(uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create a new token with bonding curve
     * @param creator Address of the token creator
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply of tokens
     * @param maxSupply Maximum supply of tokens
     * @param initialPrice Initial price in wei
     * @param creatorLockupPeriod Period in seconds for creator's tokens to be locked
     * @param lockLiquidity Whether to lock liquidity
     * @param liquidityLockPeriod Period in seconds for liquidity to be locked
     * @return tokenAddress Address of the new token
     */
    function createToken(
        address creator,
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        uint256 initialPrice,
        uint256 creatorLockupPeriod,
        bool lockLiquidity,
        uint256 liquidityLockPeriod
    ) external payable nonReentrant returns (address tokenAddress) {
        // Ensure creation fee is paid
        require(msg.value >= creationFee, "Insufficient fee");
        
        // Create new token contract
        ClampifyToken newToken = new ClampifyToken(
            name,
            symbol,
            initialSupply,
            maxSupply,
            initialPrice,
            creator,
            creatorLockupPeriod,
            address(this)
        );
        
        tokenAddress = address(newToken);
        
        // Store token info
        tokens[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            creator: creator,
            createdAt: block.timestamp,
            lockupPeriod: creatorLockupPeriod,
            liquidityLocked: lockLiquidity,
            liquidityUnlockTime: lockLiquidity ? block.timestamp + liquidityLockPeriod : 0
        });
        
        allTokens.push(tokenAddress);
        
        emit TokenCreated(tokenAddress, creator, name, symbol);
        
        return tokenAddress;
    }
    
    /**
     * @dev Get all tokens created
     * @return Array of token addresses
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    /**
     * @dev Get token count
     * @return Number of tokens created
     */
    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }
    
    /**
     * @dev Update fees
     * @param newCreationFee New creation fee
     * @param newTradingFeePercent New trading fee percent
     */
    function updateFees(uint256 newCreationFee, uint256 newTradingFeePercent) external onlyOwner {
        require(newTradingFeePercent <= 5, "Trading fee too high"); // Cap at 5%
        creationFee = newCreationFee;
        tradingFeePercent = newTradingFeePercent;
        
        emit FeesUpdated(creationFee, tradingFeePercent);
    }
    
    /**
     * @dev Calculate trading fee
     * @param amount Amount to calculate fee for
     * @return Fee amount
     */
    function calculateTradingFee(uint256 amount) public view returns (uint256) {
        return (amount * tradingFeePercent) / 100;
    }
    
    /**
     * @dev Collect fees
     */
    function collectFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to collect");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Fee transfer failed");
        
        emit FeesCollected(balance);
    }
    
    /**
     * @dev Get token info for a specific token
     * @param tokenAddress Address of the token
     * @return creator Address of the token creator
     * @return createdAt Timestamp when the token was created
     * @return lockupPeriod Period in seconds for creator's tokens to be locked
     * @return liquidityLocked Whether liquidity is locked
     * @return liquidityUnlockTime Timestamp when liquidity will be unlocked
     */
    function getTokenInfo(address tokenAddress) external view returns (
        address creator,
        uint256 createdAt,
        uint256 lockupPeriod,
        bool liquidityLocked,
        uint256 liquidityUnlockTime
    ) {
        TokenInfo storage info = tokens[tokenAddress];
        require(info.tokenAddress != address(0), "Token not found");
        
        return (
            info.creator,
            info.createdAt,
            info.lockupPeriod,
            info.liquidityLocked,
            info.liquidityUnlockTime
        );
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}