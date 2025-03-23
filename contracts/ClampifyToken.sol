// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title ClampifyToken
 * @dev Enhanced meme token with bonding curve, supply locking mechanisms, and transaction tracking
 */
contract ClampifyToken is ERC20, ERC20Burnable, ReentrancyGuard {
    using Math for uint256;
    
    // Bonding curve parameters
    uint256 public initialPrice;
    uint256 public currentPrice;
    uint256 public maxSupply;
    uint256 public reserveBalance;
    uint256 public initialSupply;
    
    // Market statistics
    uint256 public totalVolume; // Total trading volume in token units
    uint256 public highestPrice; // Highest price reached
    uint256 public lowestPrice; // Lowest price after initial
    uint256 public marketCap; // Current market cap (totalSupply * currentPrice)
    
    // Step function bonding curve parameters
    uint256 public constant STEP_SIZE = 10_000 * 10**18; // 10,000 tokens per step
    uint256 public constant PRICE_INCREASE_PERCENT = 5; // 5% increase per step
    
    // Locking mechanisms
    address public immutable creator;
    uint256 public immutable creatorLockupPeriod;
    uint256 public creatorLockupEnds;
    
    // Large holder locking
    mapping(address => uint256) public holderLockTime;
    uint256 public constant LARGE_HOLDER_THRESHOLD = 5; // 5% of total supply
    uint256 public constant LARGE_HOLDER_LOCK_PERIOD = 24 hours;
    
    // Factory reference
    address public immutable factory;
    
    // Status tracking
    bool public tradingEnabled = true;
    bool public bondingCurveEnabled = true;
    
    // Holder tracking
    struct Holder {
        uint256 balance;
        uint256 percentage; // Multiplied by 100 for precision (e.g., 523 = 5.23%)
    }
    
    address[] public topHolders;
    mapping(address => bool) public isTopHolder;
    uint256 public constant MAX_TOP_HOLDERS = 20;
    
    // Transaction tracking
    struct Transaction {
        address account;
        bool isBuy; // true for buy, false for sell
        uint256 tokenAmount;
        uint256 ethAmount;
        uint256 price; // Price at transaction time
        uint256 timestamp;
    }
    
    Transaction[] public recentTransactions;
    uint256 public constant MAX_RECENT_TRANSACTIONS = 50;
    
    // Candle data for charts (hourly data)
    struct CandleData {
        uint256 timestamp; // Start of hour
        uint256 open;  // Price at start
        uint256 high;  // Highest price during period
        uint256 low;   // Lowest price during period
        uint256 close; // Price at end
        uint256 volume; // Volume during period
    }
    
    mapping(uint256 => CandleData) public hourlyCandles; // Hourly candles (timestamp => data)
    uint256[] public candleTimestamps; // Array of candle timestamps for iteration
    
    // Events
    event TokensPurchased(address indexed buyer, uint256 amountPaid, uint256 tokensMinted, uint256 price);
    event TokensSold(address indexed seller, uint256 amountReceived, uint256 tokensBurned, uint256 price);
    event PriceUpdate(uint256 newPrice, uint256 marketCap);
    event HolderLocked(address indexed holder, uint256 unlockTime);
    event TradingStatusChanged(bool enabled);
    event BondingCurveStatusChanged(bool enabled);
    event TopHolderAdded(address holder, uint256 balance, uint256 percentage);
    event TopHolderRemoved(address holder);
    event CandleUpdated(uint256 timestamp, uint256 open, uint256 high, uint256 low, uint256 close, uint256 volume);
    
    /**
     * @dev Constructor
     * @param name Token name
     * @param symbol Token symbol
     * @param _initialSupply Initial supply of tokens
     * @param _maxSupply Maximum supply of tokens
     * @param _initialPrice Initial price in wei
     * @param _creator Creator address
     * @param _creatorLockupPeriod Period in seconds for creator's tokens to be locked
     * @param _factory Factory contract address
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 _initialSupply,
        uint256 _maxSupply,
        uint256 _initialPrice,
        address _creator,
        uint256 _creatorLockupPeriod,
        address _factory
    ) ERC20(name, symbol) {
        require(_initialPrice > 0, "Initial price must be > 0");
        require(_maxSupply > _initialSupply, "Max supply must be > initial supply");
        require(_creator != address(0), "Creator cannot be zero address");
        require(_factory != address(0), "Factory cannot be zero address");
        
        initialPrice = _initialPrice;
        currentPrice = _initialPrice;
        highestPrice = _initialPrice;
        lowestPrice = _initialPrice;
        maxSupply = _maxSupply;
        creator = _creator;
        creatorLockupPeriod = _creatorLockupPeriod;
        factory = _factory;
        initialSupply = _initialSupply;
        
        if (_initialSupply > 0) {
            _mint(_creator, _initialSupply);
            
            // Calculate initial reserve based on bonding curve formula
            reserveBalance = calculateReserve(_initialSupply);
            
            // Add creator as top holder
            _addTopHolder(_creator, _initialSupply);
            
            // Initialize market cap
            marketCap = _initialSupply * _initialPrice / 10**18;
        }
        
        // Set creator lockup time
        if (creatorLockupPeriod > 0) {
            creatorLockupEnds = block.timestamp + creatorLockupPeriod;
        }
        
        // Initialize first candle
        uint256 hourTimestamp = (block.timestamp / 1 hours) * 1 hours;
        hourlyCandles[hourTimestamp] = CandleData({
            timestamp: hourTimestamp,
            open: _initialPrice,
            high: _initialPrice,
            low: _initialPrice,
            close: _initialPrice,
            volume: 0
        });
        candleTimestamps.push(hourTimestamp);
    }
    
    /**
     * @dev Buy tokens using the bonding curve
     * @param buyer Buyer address
     * @param desiredTokenAmount Desired amount of tokens to buy (may be limited by max supply)
     * @notice Send enough ETH to cover the purchase
     */
    function buyTokens(
        address buyer,
        uint256 desiredTokenAmount
    ) public payable nonReentrant returns (uint256 actualTokenAmount) {
        require(tradingEnabled, "Trading is disabled");
        require(bondingCurveEnabled, "Bonding curve is disabled");
        require(msg.value > 0, "Must send ETH to buy tokens");
        require(desiredTokenAmount > 0, "Token amount must be > 0");
        
        uint256 remainingSupply = maxSupply - totalSupply();
        require(remainingSupply > 0, "Max supply reached");
        
        // Calculate how much ETH is needed for the desired tokens
        uint256 requiredEth = calculatePurchasePrice(desiredTokenAmount);
        
        // Check if enough ETH was sent
        require(msg.value >= requiredEth, "Insufficient ETH sent");
        
        // Limit token amount to remaining supply
        if (desiredTokenAmount > remainingSupply) {
            desiredTokenAmount = remainingSupply;
            // Recalculate required ETH for actual amount
            requiredEth = calculatePurchasePrice(desiredTokenAmount);
        }
        
        // Update reserve balance
        reserveBalance += requiredEth;
        
        // Refund excess ETH if any
        if (msg.value > requiredEth) {
            uint256 refund = msg.value - requiredEth;
            (bool success, ) = payable(buyer).call{value: refund}("");
            require(success, "Refund failed");
        }
        
        // Update current price
        uint256 oldPrice = currentPrice;
        updatePrice();
        
        // Track highest price
        if (currentPrice > highestPrice) {
            highestPrice = currentPrice;
        }
        
        // Check if we need to lock this holder
        if (balanceOf(buyer) > 0) {
            checkAndLockLargeHolder(buyer);
        }
        
        // Mint tokens to buyer
        _mint(buyer, desiredTokenAmount);
        
        // Update total volume
        totalVolume += desiredTokenAmount;
        
        // Track transaction
        _addTransaction(buyer, true, desiredTokenAmount, requiredEth, currentPrice);
        
        // Update candle data
        _updateCandleData(oldPrice, currentPrice, desiredTokenAmount);
        
        // Update top holders
        _updateHolderInfo(buyer, balanceOf(buyer));
        
        // Update market cap
        marketCap = totalSupply() * currentPrice / 10**18;
        
        emit TokensPurchased(buyer, requiredEth, desiredTokenAmount, currentPrice);
        
        return desiredTokenAmount;
    }
    
    /**
     * @dev Simple buy tokens using the bonding curve (fallback method)
     * @notice Send ETH directly to the contract or through this function
     */
    function buyTokensWithEth() public payable nonReentrant returns (uint256 tokenAmount) {
        require(tradingEnabled, "Trading is disabled");
        require(bondingCurveEnabled, "Bonding curve is disabled");
        require(msg.value > 0, "Must send ETH to buy tokens");
        
        uint256 remainingSupply = maxSupply - totalSupply();
        require(remainingSupply > 0, "Max supply reached");
        
        // Calculate tokens to mint based on bonding curve
        tokenAmount = calculatePurchaseReturn(msg.value);
        require(tokenAmount > 0, "Token amount too small");
        require(tokenAmount <= remainingSupply, "Exceeds max supply");
        
        // Update reserve balance
        reserveBalance += msg.value;
        
        // Update current price and track highest price
        uint256 oldPrice = currentPrice;
        updatePrice();
        
        if (currentPrice > highestPrice) {
            highestPrice = currentPrice;
        }
        
        // Check if we need to lock this holder
        if (balanceOf(msg.sender) > 0) {
            checkAndLockLargeHolder(msg.sender);
        }
        
        // Mint tokens to buyer
        _mint(msg.sender, tokenAmount);
        
        // Update total volume
        totalVolume += tokenAmount;
        
        // Track transaction
        _addTransaction(msg.sender, true, tokenAmount, msg.value, currentPrice);
        
        // Update candle data
        _updateCandleData(oldPrice, currentPrice, tokenAmount);
        
        // Update top holders
        _updateHolderInfo(msg.sender, balanceOf(msg.sender));
        
        // Update market cap
        marketCap = totalSupply() * currentPrice / 10**18;
        
        emit TokensPurchased(msg.sender, msg.value, tokenAmount, currentPrice);
        
        return tokenAmount;
    }
    
    /**
     * @dev Sell tokens back to the bonding curve
     * @param seller Seller address
     * @param tokenAmount Amount of tokens to sell
     * @notice You must have sufficient unlocked tokens to sell
     */
    function sellTokens(
        address seller,
        uint256 tokenAmount
    ) external nonReentrant returns (uint256 ethReceived) {
        require(tradingEnabled, "Trading is disabled");
        require(bondingCurveEnabled, "Bonding curve is disabled");
        require(tokenAmount > 0, "Amount must be > 0");
        require(balanceOf(seller) >= tokenAmount, "Insufficient balance");
        
        // Check if seller is creator and still in lockup period
        if (seller == creator && block.timestamp < creatorLockupEnds) {
            require(balanceOf(creator) - tokenAmount >= initialSupply / 2, "Creator cannot sell below 50% of initial supply during lockup");
        }
        
        // Check if holder is locked
        require(block.timestamp >= holderLockTime[seller], "Tokens are locked");
        
        // Calculate ETH to return based on bonding curve
        uint256 ethAmount = calculateSaleReturn(tokenAmount);
        require(ethAmount > 0, "ETH return too small");
        require(ethAmount <= reserveBalance, "Insufficient reserve");
        
        // Update reserve balance
        reserveBalance -= ethAmount;
        
        // Save old price for candle data
        uint256 oldPrice = currentPrice;
        
        // Burn tokens
        _burn(seller, tokenAmount);
        
        // Update current price
        updatePrice();
        
        // Update lowest price if needed (only after token has started trading)
        if (totalVolume > initialSupply && (lowestPrice == 0 || currentPrice < lowestPrice)) {
            lowestPrice = currentPrice;
        }
        
        // Calculate and apply trading fee
        uint256 fee = calculateTradingFee(ethAmount);
        uint256 netReturn = ethAmount - fee;
        
        // Transfer fee to factory
        if (fee > 0) {
            (bool feeSuccess, ) = payable(factory).call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        // Transfer ETH to seller
        (bool success, ) = payable(seller).call{value: netReturn}("");
        require(success, "ETH transfer failed");
        
        // Update total volume
        totalVolume += tokenAmount;
        
        // Track transaction
        _addTransaction(seller, false, tokenAmount, netReturn, currentPrice);
        
        // Update candle data
        _updateCandleData(oldPrice, currentPrice, tokenAmount);
        
        // Update top holders
        _updateHolderInfo(seller, balanceOf(seller));
        
        // Update market cap
        marketCap = totalSupply() * currentPrice / 10**18;
        
        emit TokensSold(seller, netReturn, tokenAmount, currentPrice);
        
        return netReturn;
    }
    
    /**
     * @dev Calculate purchase price for a specific amount of tokens
     * @param tokenAmount Amount of tokens to buy
     * @return ETH price required to purchase
     */
    function calculatePurchasePrice(uint256 tokenAmount) public view returns (uint256) {
        uint256 currentSupply = totalSupply();
        uint256 newSupply = currentSupply;
        uint256 remainingTokens = tokenAmount;
        uint256 totalPrice = 0;
        
        while (remainingTokens > 0 && newSupply < maxSupply) {
            // Calculate which step we're in
            uint256 currentStep = newSupply / STEP_SIZE;
            uint256 nextStepThreshold = (currentStep + 1) * STEP_SIZE;
            
            // Clamp to max supply
            if (nextStepThreshold > maxSupply) {
                nextStepThreshold = maxSupply;
            }
            
            // Calculate price for this step
            uint256 stepPrice = initialPrice * (100 + (currentStep * PRICE_INCREASE_PERCENT)) / 100;
            
            // How many tokens can be purchased in this step
            uint256 tokensInStep = nextStepThreshold - newSupply;
            uint256 tokensToAdd = tokensInStep < remainingTokens ? tokensInStep : remainingTokens;
            
            // Add price for this batch of tokens
            totalPrice += tokensToAdd * stepPrice / 10**18;
            
            // Update counters
            remainingTokens -= tokensToAdd;
            newSupply += tokensToAdd;
        }
        
        return totalPrice;
    }
    
    /**
     * @dev Calculate tokens to receive for ETH sent
     * @param ethAmount Amount of ETH sent
     * @return Token amount to mint
     */
    function calculatePurchaseReturn(uint256 ethAmount) public view returns (uint256) {
        // Step function implementation for bonding curve
        uint256 currentSupply = totalSupply();
        uint256 newSupply = currentSupply;
        uint256 remainingEth = ethAmount;
        uint256 tokenAmount = 0;
        
        while (remainingEth > 0 && newSupply < maxSupply) {
            // Calculate which step we're in
            uint256 currentStep = newSupply / STEP_SIZE;
            uint256 nextStepThreshold = (currentStep + 1) * STEP_SIZE;
            
            // Clamp to max supply
            if (nextStepThreshold > maxSupply) {
                nextStepThreshold = maxSupply;
            }
            
            // Calculate price for this step
            uint256 stepPrice = initialPrice * (100 + (currentStep * PRICE_INCREASE_PERCENT)) / 100;
            
            // How many tokens can be purchased in this step
            uint256 tokensInStep = nextStepThreshold - newSupply;
            uint256 ethForStep = tokensInStep * stepPrice / 10**18;
            
            if (remainingEth >= ethForStep) {
                // Buy all tokens in this step
                tokenAmount += tokensInStep;
                remainingEth -= ethForStep;
                newSupply = nextStepThreshold;
            } else {
                // Buy partial step
                uint256 tokensWithinStep = (remainingEth * 10**18) / stepPrice;
                tokenAmount += tokensWithinStep;
                remainingEth = 0;
            }
        }
        
        return tokenAmount;
    }
    
    /**
     * @dev Calculate ETH to receive for tokens sold
     * @param tokenAmount Amount of tokens to sell
     * @return ETH amount to return
     */
    function calculateSaleReturn(uint256 tokenAmount) public view returns (uint256) {
        uint256 currentSupply = totalSupply();
        require(tokenAmount <= currentSupply, "Cannot sell more than supply");
        
        uint256 remainingTokens = tokenAmount;
        uint256 ethReturn = 0;
        uint256 newSupply = currentSupply;
        
        while (remainingTokens > 0) {
            // Calculate which step we're in
            uint256 currentStep = (newSupply - 1) / STEP_SIZE;
            uint256 stepLowerBound = currentStep * STEP_SIZE;
            
            // Calculate price for this step
            uint256 stepPrice = initialPrice * (100 + (currentStep * PRICE_INCREASE_PERCENT)) / 100;
            
            // How many tokens can be sold in this step
            uint256 tokensInStep = newSupply - stepLowerBound;
            uint256 tokensToSell = tokensInStep < remainingTokens ? tokensInStep : remainingTokens;
            
            // Calculate ETH to return for this step
            uint256 ethForStep = tokensToSell * stepPrice / 10**18;
            ethReturn += ethForStep;
            
            // Update remaining tokens and new supply
            remainingTokens -= tokensToSell;
            newSupply -= tokensToSell;
        }
        
        return ethReturn;
    }
    
    /**
     * @dev Calculate total reserve based on token supply
     * @param supply Token supply
     * @return Reserve amount
     */
    function calculateReserve(uint256 supply) internal view returns (uint256) {
        uint256 remainingTokens = supply;
        uint256 reserve = 0;
        uint256 stepSize = STEP_SIZE;
        
        while (remainingTokens > 0) {
            uint256 currentStep = remainingTokens / stepSize;
            uint256 tokensInStep = remainingTokens > stepSize ? stepSize : remainingTokens;
            
            uint256 stepPrice = initialPrice * (100 + (currentStep * PRICE_INCREASE_PERCENT)) / 100;
            reserve += tokensInStep * stepPrice / 10**18;
            
            remainingTokens -= tokensInStep;
        }
        
        return reserve;
    }
    
    /**
     * @dev Update current token price based on supply
     */
    function updatePrice() internal {
        uint256 supply = totalSupply();
        uint256 step = supply / STEP_SIZE;
        
        currentPrice = initialPrice * (100 + (step * PRICE_INCREASE_PERCENT)) / 100;
        
        // Also update market cap
        marketCap = supply * currentPrice / 10**18;
        
        emit PriceUpdate(currentPrice, marketCap);
    }
    
    /**
     * @dev Add transaction to recent transactions list
     * @param account Account address
     * @param isBuy Whether it's a buy (true) or sell (false)
     * @param tokenAmount Token amount
     * @param ethAmount ETH amount
     * @param price Current price
     */
    function _addTransaction(
        address account, 
        bool isBuy, 
        uint256 tokenAmount, 
        uint256 ethAmount,
        uint256 price
    ) internal {
        // Add to recent transactions, replacing oldest if full
        if (recentTransactions.length >= MAX_RECENT_TRANSACTIONS) {
            // Shift array to remove oldest (index 0)
            for (uint256 i = 0; i < recentTransactions.length - 1; i++) {
                recentTransactions[i] = recentTransactions[i + 1];
            }
            recentTransactions[recentTransactions.length - 1] = Transaction({
                account: account,
                isBuy: isBuy,
                tokenAmount: tokenAmount,
                ethAmount: ethAmount,
                price: price,
                timestamp: block.timestamp
            });
        } else {
            recentTransactions.push(Transaction({
                account: account,
                isBuy: isBuy,
                tokenAmount: tokenAmount,
                ethAmount: ethAmount,
                price: price,
                timestamp: block.timestamp
            }));
        }
    }
    
    /**
     * @dev Update candle data
     * @param oldPrice Old price
     * @param newPrice New price
     * @param volumeAmount Token volume for this transaction
     */
    function _updateCandleData(uint256 oldPrice, uint256 newPrice, uint256 volumeAmount) internal {
        uint256 hourTimestamp = (block.timestamp / 1 hours) * 1 hours;
        
        // Check if we need to create a new candle
        if (hourlyCandles[hourTimestamp].timestamp == 0) {
            // Create new candle
            hourlyCandles[hourTimestamp] = CandleData({
                timestamp: hourTimestamp,
                open: oldPrice,
                high: newPrice > oldPrice ? newPrice : oldPrice,
                low: newPrice < oldPrice ? newPrice : oldPrice,
                close: newPrice,
                volume: volumeAmount
            });
            candleTimestamps.push(hourTimestamp);
        } else {
            // Update existing candle
            CandleData storage candle = hourlyCandles[hourTimestamp];
            
            // Only update open if this is first transaction in the period
            if (candle.volume == 0) {
                candle.open = oldPrice;
            }
            
            // Update high/low
            if (newPrice > candle.high) {
                candle.high = newPrice;
            }
            if (newPrice < candle.low) {
                candle.low = newPrice;
            }
            
            // Always update close to most recent price
            candle.close = newPrice;
            
            // Add to volume
            candle.volume += volumeAmount;
        }
        
        emit CandleUpdated(
            hourTimestamp,
            hourlyCandles[hourTimestamp].open,
            hourlyCandles[hourTimestamp].high,
            hourlyCandles[hourTimestamp].low,
            hourlyCandles[hourTimestamp].close,
            hourlyCandles[hourTimestamp].volume
        );
    }
    
    /**
     * @dev Check if an address should be locked as a large holder
     * @param holder Address to check
     */
    function checkAndLockLargeHolder(address holder) internal {
        uint256 holderBalance = balanceOf(holder);
        uint256 supply = totalSupply();
        
        if (holderBalance * 100 / supply >= LARGE_HOLDER_THRESHOLD) {
            holderLockTime[holder] = block.timestamp + LARGE_HOLDER_LOCK_PERIOD;
            emit HolderLocked(holder, holderLockTime[holder]);
        }
    }
    
    /**
     * @dev Calculate trading fee
     * @param amount Amount to calculate fee for
     * @return Fee amount
     */
    function calculateTradingFee(uint256 amount) internal view returns (uint256) {
        // Call factory contract to calculate fee
        (bool success, bytes memory data) = factory.staticcall(
            abi.encodeWithSignature("calculateTradingFee(uint256)", amount)
        );
        
        if (success && data.length >= 32) {
            return abi.decode(data, (uint256));
        }
        
        // Default to 2% if factory call fails
        return amount * 2 / 100;
    }
    
    /**
     * @dev Add address to top holders if eligible
     * @param holder Address to add
     * @param balance Balance of holder
     */
    function _addTopHolder(address holder, uint256 balance) internal {
        // Don't track zero balances
        if (balance == 0) {
            if (isTopHolder[holder]) {
                _removeTopHolder(holder);
            }
            return;
        }
        
        uint256 supply = totalSupply();
        uint256 percentage = supply > 0 ? (balance * 10000) / supply : 0;
        
        // Already in top holders, just update
        if (isTopHolder[holder]) {
            // Find and update
            for (uint256 i = 0; i < topHolders.length; i++) {
                if (topHolders[i] == holder) {
                    // Update then reorder if needed
                    topHolders[i] = holder;
                    
                    emit TopHolderAdded(holder, balance, percentage);
                    return;
                }
            }
        } else {
            // Not in top holders yet
            if (topHolders.length < MAX_TOP_HOLDERS) {
                // Add to list if we haven't reached max yet
                topHolders.push(holder);
                isTopHolder[holder] = true;
                
                emit TopHolderAdded(holder, balance, percentage);
            } else {
                // Find smallest holder and potentially replace
                address smallestHolder = topHolders[0];
                uint256 smallestBalance = balanceOf(smallestHolder);
                uint256 smallestIndex = 0;
                
                for (uint256 i = 1; i < topHolders.length; i++) {
                    uint256 currentBalance = balanceOf(topHolders[i]);
                    if (currentBalance < smallestBalance) {
                        smallestBalance = currentBalance;
                        smallestHolder = topHolders[i];
                        smallestIndex = i;
                    }
                }
                
                // Replace if this holder is larger than the smallest current top holder
                if (balance > smallestBalance) {
                    // Remove smallest
                    isTopHolder[smallestHolder] = false;
                    emit TopHolderRemoved(smallestHolder);
                    
                    // Add new holder
                    topHolders[smallestIndex] = holder;
                    isTopHolder[holder] = true;
                    
                    emit TopHolderAdded(holder, balance, percentage);
                }
            }
        }
    }
    
    /**
     * @dev Remove address from top holders
     * @param holder Address to remove
     */
    function _removeTopHolder(address holder) internal {
        if (!isTopHolder[holder]) return;
        
        for (uint256 i = 0; i < topHolders.length; i++) {
            if (topHolders[i] == holder) {
                // Replace with last element and pop
                topHolders[i] = topHolders[topHolders.length - 1];
                topHolders.pop();
                isTopHolder[holder] = false;
                
                emit TopHolderRemoved(holder);
                return;
            }
        }
    }
    
    /**
     * @dev Update holder information after balance change
     * @param holder Address of holder
     * @param newBalance New balance of holder
     */
    function _updateHolderInfo(address holder, uint256 newBalance) internal {
        // Update top holder list
        _addTopHolder(holder, newBalance);
    }
    
    /**
     * @dev Get top holders with their balances and percentages
     * @return holders Array of holder addresses
     * @return balances Array of holder balances
     * @return percentages Array of holder percentages (scaled by 100)
     */
    function getTopHolders() external view returns (
        address[] memory holders,
        uint256[] memory balances,
        uint256[] memory percentages
    ) {
        uint256 count = topHolders.length;
        holders = new address[](count);
        balances = new uint256[](count);
        percentages = new uint256[](count);
        
        uint256 supply = totalSupply();
        
        for (uint256 i = 0; i < count; i++) {
            address holder = topHolders[i];
            uint256 balance = balanceOf(holder);
            
            holders[i] = holder;
            balances[i] = balance;
            percentages[i] = supply > 0 ? (balance * 10000) / supply : 0;
        }
        
        return (holders, balances, percentages);
    }
    
    /**
    * @dev Get recent transactions
    * @param count Number of transactions to retrieve (max MAX_RECENT_TRANSACTIONS)
    * @return accounts Array of transaction account addresses
    * @return isBuys Array indicating if transactions are buys (true) or sells (false)
    * @return tokenAmounts Array of token amounts in each transaction
    * @return ethAmounts Array of ETH amounts in each transaction
    * @return prices Array of token prices at transaction time
    * @return timestamps Array of transaction timestamps
    */
    function getRecentTransactions(uint256 count) external view returns (
        address[] memory accounts,
        bool[] memory isBuys,
        uint256[] memory tokenAmounts,
        uint256[] memory ethAmounts,
        uint256[] memory prices,
        uint256[] memory timestamps
    ) {
        // Limit count to actual number of transactions and max
        if (count > recentTransactions.length) {
            count = recentTransactions.length;
        }
        if (count > MAX_RECENT_TRANSACTIONS) {
            count = MAX_RECENT_TRANSACTIONS;
        }
        
        accounts = new address[](count);
        isBuys = new bool[](count);
        tokenAmounts = new uint256[](count);
        ethAmounts = new uint256[](count);
        prices = new uint256[](count);
        timestamps = new uint256[](count);
        
        // Get the most recent transactions (from newest to oldest)
        for (uint256 i = 0; i < count; i++) {
            // Most recent at end of array, so read from end
            uint256 index = recentTransactions.length - 1 - i;
            
            accounts[i] =accounts[i] = recentTransactions[index].account;
            isBuys[i] = recentTransactions[index].isBuy;
            tokenAmounts[i] = recentTransactions[index].tokenAmount;
            ethAmounts[i] = recentTransactions[index].ethAmount;
            prices[i] = recentTransactions[index].price;
            timestamps[i] = recentTransactions[index].timestamp;
        }
        
        return (accounts, isBuys, tokenAmounts, ethAmounts, prices, timestamps);
    }
    
    /**
    * @dev Get candle data for charting (most recent candles first)
    * @param count Number of candles to retrieve
    * @return timestamps Array of candle timestamps
    * @return opens Array of opening prices
    * @return highs Array of highest prices
    * @return lows Array of lowest prices
    * @return closes Array of closing prices
    * @return volumes Array of trading volumes
    */
    function getCandleData(uint256 count) external view returns (
        uint256[] memory timestamps,
        uint256[] memory opens,
        uint256[] memory highs,
        uint256[] memory lows,
        uint256[] memory closes,
        uint256[] memory volumes
    ) {
        // Limit count to actual number of candles
        if (count > candleTimestamps.length) {
            count = candleTimestamps.length;
        }
        
        timestamps = new uint256[](count);
        opens = new uint256[](count);
        highs = new uint256[](count);
        lows = new uint256[](count);
        closes = new uint256[](count);
        volumes = new uint256[](count);
        
        // Get the most recent candles (from newest to oldest)
        for (uint256 i = 0; i < count; i++) {
            // Most recent at end of array, so read from end
            uint256 index = candleTimestamps.length - 1 - i;
            uint256 timestamp = candleTimestamps[index];
            CandleData storage candle = hourlyCandles[timestamp];
            
            timestamps[i] = candle.timestamp;
            opens[i] = candle.open;
            highs[i] = candle.high;
            lows[i] = candle.low;
            closes[i] = candle.close;
            volumes[i] = candle.volume;
        }
        
        return (timestamps, opens, highs, lows, closes, volumes);
    }
    
    /**
    * @dev Get token statistics
    * @return currentTokenPrice Current token price in wei
    * @return currentMarketCap Market capitalization in wei
    * @return volumeTraded Total trading volume in token units
    * @return ath All-time high price in wei
    * @return atl All-time low price in wei (after initial)
    */
    function getTokenStatistics() external view returns (
        uint256 currentTokenPrice,
        uint256 currentMarketCap,
        uint256 volumeTraded,
        uint256 ath,
        uint256 atl
    ) {
        return (currentPrice, marketCap, totalVolume, highestPrice, lowestPrice);
    }
    
    /**
     * @dev Get current token price
     * @return Current price in wei per token
     */
    function getCurrentPrice() external view returns (uint256) {
        return currentPrice;
    }
    
    /**
     * @dev Get reserve balance
     * @return Reserve balance in wei
     */
    function getReserveBalance() external view returns (uint256) {
        return reserveBalance;
    }
    
    /**
     * @dev Check if a holder is locked
     * @param holder Address to check
     * @return True if holder is locked, false otherwise
     */
    function isHolderLocked(address holder) external view returns (bool) {
        return block.timestamp < holderLockTime[holder];
    }
    
    /**
     * @dev Get unlock time for a holder
     * @param holder Address to check
     * @return Timestamp when holder will be unlocked
     */
    function getHolderUnlockTime(address holder) external view returns (uint256) {
        return holderLockTime[holder];
    }
    
    /**
     * @dev Set trading status
     * @param enabled Whether trading is enabled
     */
    function setTradingEnabled(bool enabled) external {
        require(msg.sender == creator, "Only creator can call");
        tradingEnabled = enabled;
        emit TradingStatusChanged(enabled);
    }
    
    /**
     * @dev Set bonding curve status
     * @param enabled Whether bonding curve is enabled
     */
    function setBondingCurveEnabled(bool enabled) external {
        require(msg.sender == creator, "Only creator can call");
        bondingCurveEnabled = enabled;
        emit BondingCurveStatusChanged(enabled);
    }
    
    /**
     * @dev Override transfer function to enforce locking
     * @param to Recipient address
     * @param value Amount to transfer
     * @return True if successful
     */
    function transfer(address to, uint256 value) public override returns (bool) {
        require(block.timestamp >= holderLockTime[msg.sender], "Tokens are locked");
        
        // Check if sender is creator and still in lockup period
        if (msg.sender == creator && block.timestamp < creatorLockupEnds) {
            require(balanceOf(creator) - value >= initialSupply / 2, "Creator cannot transfer below 50% of initial supply during lockup");
        }
        
        // Standard transfer
        bool success = super.transfer(to, value);
        
        // Update holders information
        if (success) {
            _updateHolderInfo(msg.sender, balanceOf(msg.sender));
            _updateHolderInfo(to, balanceOf(to));
            checkAndLockLargeHolder(to);
        }
        
        return success;
    }
    
    /**
     * @dev Override transferFrom function to enforce locking
     * @param from Sender address
     * @param to Recipient address
     * @param value Amount to transfer
     * @return True if successful
     */
    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        require(block.timestamp >= holderLockTime[from], "Tokens are locked");
        
        // Check if sender is creator and still in lockup period
        if (from == creator && block.timestamp < creatorLockupEnds) {
            require(balanceOf(creator) - value >= initialSupply / 2, "Creator cannot transfer below 50% of initial supply during lockup");
        }
        
        // Standard transferFrom
        bool success = super.transferFrom(from, to, value);
        
        // Update holders information
        if (success) {
            _updateHolderInfo(from, balanceOf(from));
            _updateHolderInfo(to, balanceOf(to));
            checkAndLockLargeHolder(to);
        }
        
        return success;
    }
    
    /**
     * @dev Receive function to accept ETH
     * @notice Sending ETH directly to this contract will automatically buy tokens
     */
    receive() external payable {
        if (msg.sender != factory && tradingEnabled && bondingCurveEnabled) {
            buyTokensWithEth();
        }
    }
}