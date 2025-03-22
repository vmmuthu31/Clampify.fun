// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ClampifyDEX
 * @dev DEX integration for Clampify platform with liquidity handling and price discovery
 */
contract ClampifyDEX is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    // Factory reference
    address public immutable factory;
    
    // Liquidity pools structure
    struct LiquidityPool {
        address tokenAddress;
        uint256 tokenReserve;
        uint256 ethReserve;
        uint256 liquidityTokens;
        uint256 lastUpdateTime;
        bool isActive;
        uint256 liquidityLockPeriod;
        mapping(address => uint256) userLiquidity;
        mapping(address => uint256) userLiquidityLockTime;
    }
    
    // Mapping of token address to liquidity pool
    mapping(address => LiquidityPool) public liquidityPools;
    
    // Array of tokens with active pools
    address[] public activePools;
    
    // Events
    event PoolCreated(address indexed tokenAddress, uint256 initialTokens, uint256 initialEth);
    event LiquidityAdded(address indexed provider, address indexed tokenAddress, uint256 tokenAmount, uint256 ethAmount);
    event LiquidityRemoved(address indexed provider, address indexed tokenAddress, uint256 tokenAmount, uint256 ethAmount);
    event TokenSwap(address indexed tokenAddress, address indexed user, bool isBuy, uint256 tokenAmount, uint256 ethAmount);
    
    /**
     * @dev Constructor
     * @param _factory Factory contract address
     */
    constructor(address _factory) Ownable(msg.sender) {
        require(_factory != address(0), "Factory cannot be zero address");
        factory = _factory;
    }
    
    /**
     * @dev Create a new liquidity pool
     * @param tokenAddress Address of the token
     * @param tokenAmount Amount of tokens to add for initial liquidity
     * @param lockPeriod Period in seconds for liquidity to be locked
     */
    function createPool(address tokenAddress, uint256 tokenAmount, uint256 lockPeriod) external payable nonReentrant {
        require(tokenAddress != address(0), "Token cannot be zero address");
        require(tokenAmount > 0, "Token amount must be > 0");
        require(msg.value > 0, "ETH amount must be > 0");
        require(!liquidityPools[tokenAddress].isActive, "Pool already exists");
        
        // Transfer tokens from caller
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), tokenAmount);
        
        // Initialize pool
        LiquidityPool storage pool = liquidityPools[tokenAddress];
        pool.tokenAddress = tokenAddress;
        pool.tokenReserve = tokenAmount;
        pool.ethReserve = msg.value;
        pool.liquidityTokens = sqrt(tokenAmount * msg.value);
        pool.userLiquidity[msg.sender] = pool.liquidityTokens;
        pool.lastUpdateTime = block.timestamp;
        pool.isActive = true;
        pool.liquidityLockPeriod = lockPeriod;
        
        if (lockPeriod > 0) {
            pool.userLiquidityLockTime[msg.sender] = block.timestamp + lockPeriod;
        }
        
        activePools.push(tokenAddress);
        
        emit PoolCreated(tokenAddress, tokenAmount, msg.value);
    }
    
    /**
     * @dev Add liquidity to a pool
     * @param tokenAddress Address of the token
     * @param tokenAmount Amount of tokens to add
     */
    function addLiquidity(address tokenAddress, uint256 tokenAmount) external payable nonReentrant {
        LiquidityPool storage pool = liquidityPools[tokenAddress];
        require(pool.isActive, "Pool does not exist");
        require(tokenAmount > 0, "Token amount must be > 0");
        require(msg.value > 0, "ETH amount must be > 0");
        
        uint256 ethReserve = pool.ethReserve;
        uint256 tokenReserve = pool.tokenReserve;
        
        // Calculate amount of tokens required based on current ratio
        uint256 requiredTokenAmount = (msg.value * tokenReserve) / ethReserve;
        
        // Adjust for slippage (2% buffer)
        require(tokenAmount >= requiredTokenAmount * 98 / 100, "Insufficient token amount");
        
        // Transfer tokens
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), tokenAmount);
        
        // Calculate liquidity tokens to mint
        uint256 liquidityMinted = (pool.liquidityTokens * msg.value) / ethReserve;
        
        // Update pool
        pool.ethReserve += msg.value;
        pool.tokenReserve += tokenAmount;
        pool.liquidityTokens += liquidityMinted;
        pool.userLiquidity[msg.sender] += liquidityMinted;
        pool.lastUpdateTime = block.timestamp;
        
        // Set lock time if applicable
        if (pool.liquidityLockPeriod > 0) {
            pool.userLiquidityLockTime[msg.sender] = block.timestamp + pool.liquidityLockPeriod;
        }
        
        emit LiquidityAdded(msg.sender, tokenAddress, tokenAmount, msg.value);
    }
    
    /**
     * @dev Remove liquidity from a pool
     * @param tokenAddress Address of the token
     * @param liquidityAmount Amount of liquidity tokens to burn
     */
    function removeLiquidity(address tokenAddress, uint256 liquidityAmount) external nonReentrant {
        LiquidityPool storage pool = liquidityPools[tokenAddress];
        require(pool.isActive, "Pool does not exist");
        require(liquidityAmount > 0, "Liquidity amount must be > 0");
        require(pool.userLiquidity[msg.sender] >= liquidityAmount, "Insufficient liquidity");
        
        // Check lock period
        require(
            block.timestamp >= pool.userLiquidityLockTime[msg.sender],
            "Liquidity is locked"
        );
        
        // Calculate tokens and ETH to return
        uint256 tokenAmount = (pool.tokenReserve * liquidityAmount) / pool.liquidityTokens;
        uint256 ethAmount = (pool.ethReserve * liquidityAmount) / pool.liquidityTokens;
        
        // Update pool
        pool.userLiquidity[msg.sender] -= liquidityAmount;
        pool.liquidityTokens -= liquidityAmount;
        pool.tokenReserve -= tokenAmount;
        pool.ethReserve -= ethAmount;
        pool.lastUpdateTime = block.timestamp;
        
        // Transfer assets
        IERC20(tokenAddress).safeTransfer(msg.sender, tokenAmount);
        (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
        require(success, "ETH transfer failed");
        
        emit LiquidityRemoved(msg.sender, tokenAddress, tokenAmount, ethAmount);
    }
    
    /**
     * @dev Swap ETH for tokens
     * @param tokenAddress Address of the token
     * @param minTokensOut Minimum amount of tokens to receive
     */
    function swapETHForTokens(address tokenAddress, uint256 minTokensOut) external payable nonReentrant {
        LiquidityPool storage pool = liquidityPools[tokenAddress];
        require(pool.isActive, "Pool does not exist");
        require(msg.value > 0, "ETH amount must be > 0");
        
        // Calculate tokens to receive
        uint256 tokensOut = getAmountOut(msg.value, pool.ethReserve, pool.tokenReserve);
        require(tokensOut >= minTokensOut, "Insufficient output amount");
        
        // Update pool
        pool.ethReserve += msg.value;
        pool.tokenReserve -= tokensOut;
        pool.lastUpdateTime = block.timestamp;
        
        // Transfer tokens
        IERC20(tokenAddress).safeTransfer(msg.sender, tokensOut);
        
        emit TokenSwap(tokenAddress, msg.sender, true, tokensOut, msg.value);
    }
    
    /**
     * @dev Swap tokens for ETH
     * @param tokenAddress Address of the token
     * @param tokenAmount Amount of tokens to sell
     * @param minETHOut Minimum amount of ETH to receive
     */
    function swapTokensForETH(address tokenAddress, uint256 tokenAmount, uint256 minETHOut) external nonReentrant {
        LiquidityPool storage pool = liquidityPools[tokenAddress];
        require(pool.isActive, "Pool does not exist");
        require(tokenAmount > 0, "Token amount must be > 0");
        
        // Calculate ETH to receive
        uint256 ethOut = getAmountOut(tokenAmount, pool.tokenReserve, pool.ethReserve);
        require(ethOut >= minETHOut, "Insufficient output amount");
        
        // Update pool
        pool.tokenReserve += tokenAmount;
        pool.ethReserve -= ethOut;
        pool.lastUpdateTime = block.timestamp;
        
        // Transfer tokens and ETH
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), tokenAmount);
        (bool success, ) = payable(msg.sender).call{value: ethOut}("");
        require(success, "ETH transfer failed");
        
        emit TokenSwap(tokenAddress, msg.sender, false, tokenAmount, ethOut);
    }
    
    /**
     * @dev Calculate output amount for a swap
     * @param amountIn Amount of input tokens
     * @param reserveIn Reserve of input tokens
     * @param reserveOut Reserve of output tokens
     * @return Output amount
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
        require(amountIn > 0, "Amount in must be > 0");
        require(reserveIn > 0 && reserveOut > 0, "Reserves must be > 0");
        
        // 0.3% fee
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        
        return numerator / denominator;
    }
    
    /**
     * @dev Get liquidity provider info
     * @param tokenAddress Address of the token
     * @param provider Address of the liquidity provider
     * @return Liquidity amount
     * @return Unlock time
     */
    function getLiquidityInfo(address tokenAddress, address provider) external view returns (uint256, uint256) {
        LiquidityPool storage pool = liquidityPools[tokenAddress];
        return (pool.userLiquidity[provider], pool.userLiquidityLockTime[provider]);
    }
    
    /**
     * @dev Get all active pools
     * @return Array of token addresses with active pools
     */
    function getActivePools() external view returns (address[] memory) {
        return activePools;
    }
    
    /**
     * @dev Get liquidity pool data
     * @param tokenAddress Address of the token
     * @return tokenReserve Token reserve
     * @return ethReserve ETH reserve
     * @return liquidityTokens Total liquidity tokens
     * @return lastUpdateTime Last update time
     * @return liquidityLockPeriod Liquidity lock period
     */
    function getPoolData(address tokenAddress) external view returns (
        uint256 tokenReserve,
        uint256 ethReserve,
        uint256 liquidityTokens,
        uint256 lastUpdateTime,
        uint256 liquidityLockPeriod
    ) {
        LiquidityPool storage pool = liquidityPools[tokenAddress];
        return (
            pool.tokenReserve,
            pool.ethReserve,
            pool.liquidityTokens,
            pool.lastUpdateTime,
            pool.liquidityLockPeriod
        );
    }
    
    /**
     * @dev Square root function
     * @param y Input value
     * @return Square root of y
     */
    function sqrt(uint256 y) internal pure returns (uint256) {
        if (y > 3) {
            uint256 z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
            return z;
        } else if (y != 0) {
            return 1;
        } else {
            return 0;
        }
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}