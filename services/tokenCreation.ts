import { ethers } from "ethers";
import ClampifyFactory from "../deployments/ClampifyFactory.json";
import ClampifyGovernance from "../deployments/ClampifyGovernance.json";
import ClampifyToken from "../deployments/ClampifyToken.json";

const isBrowser = (): boolean => typeof window !== "undefined";

const { ethereum } = isBrowser() ? window : { ethereum: null };

const contract_address: string = ""; // Clampify Factory Contract Address
const governance_address: string = ""; // Clampify Governance Contract Address

// Add RPC URL for the network you're using (0G testnet)
const RPC_URL = "https://evmrpc-testnet.0g.ai/";

interface TokenInfo {
  name: string;
  symbol: string;
  totalSupply: string;
  decimals: number;
  balance: string;
  creatorLockupPeriod: string;
  initialSupply: string;
  initialPrice: string;
  contractAddress: string;
  marketCap: string;
  volume24h: string;
}

export const Mint = async (
  name: string,
  symbol: string,
  initialSupply: string,
  maxSupply: string,
  initialPrice: string,
  creatorLockupPeriod: string,
  lockLiquidity: boolean,
  liquidityLockPeriod: string
): Promise<string> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }
    const contract = new ethers.Contract(
      contract_address,
      ClampifyFactory,
      signer
    );
    const initialPriceWei = ethers.utils.parseEther(initialPrice);
    const depositAmount = ethers.utils.parseEther("0.01");

    // Create token
    const tx = await contract.createToken(
      name,
      symbol,
      initialSupply,
      maxSupply,
      initialPriceWei,
      creatorLockupPeriod,
      lockLiquidity,
      liquidityLockPeriod,
      {
        value: depositAmount,
      }
    );

    const receipt = await tx.wait();

    const tokenCreatedEvent = receipt.events[0];
    const tokenAddress = tokenCreatedEvent.address;
    return tokenAddress;
  } catch (error) {
    console.error("Detailed error:", error);
    throw error;
  }
};

export const TokenInfo = async (tokenAddress: string): Promise<TokenInfo> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider();

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }
    const userAddress: string = await signer.getAddress();
    const contract = new ethers.Contract(tokenAddress, ClampifyToken, signer);
    const name = await contract.name();
    const symbol = await contract.symbol();
    const totalSupply = await contract.totalSupply();
    const decimals = await contract.decimals();
    const initialSupply = await contract.initialSupply();
    const initialPrice = await contract.getCurrentPrice();
    const creatorLockupPeriod = await contract.creatorLockupPeriod();
    const marketCap = await contract.marketCap();
    const volume24h = await contract.totalVolume();
    const balance = await contract.balanceOf(userAddress);

    return {
      name,
      symbol,
      totalSupply: ethers.utils.formatEther(totalSupply),
      decimals,
      balance,
      creatorLockupPeriod,
      initialSupply,
      initialPrice,
      contractAddress: tokenAddress,
      marketCap,
      volume24h,
    };
  } catch (error) {
    console.error("Detailed error:", error);
    throw error;
  }
};

type GovernanceTokenInfo = {
  address: string;
  name: string;
  symbol: string;
  balance: string;
  proposalThreshold: string;
  quorum: number;
  votingPeriod: number;
  activeProposals: number;
  isGovernanceActive: boolean;
};

export const GovernanceTokenInfo = async (
  tokenAddress: string
): Promise<GovernanceTokenInfo> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const contract = new ethers.Contract(
      governance_address,
      ClampifyGovernance,
      signer
    );

    // Get governance info for the token
    const governanceInfo = await contract.tokenGovernance(tokenAddress);

    // Check if governance info exists and is active
    const isGovernanceActive = governanceInfo?.isActive || false;

    if (!governanceInfo) {
      // Return default values if governance is not set up
      return {
        address: tokenAddress,
        name: "Unknown",
        symbol: "Unknown",
        balance: "0",
        proposalThreshold: "0",
        quorum: 0,
        votingPeriod: 0,
        activeProposals: 0,
        isGovernanceActive: false,
      };
    }

    // Get token contract to fetch name and symbol
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ClampifyToken,
      signer
    );
    const [name, symbol] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
    ]);

    return {
      address: tokenAddress,
      name,
      symbol,
      balance: governanceInfo.balance?.toString() || "0",
      proposalThreshold: governanceInfo.proposalThreshold?.toString() || "0",
      quorum: governanceInfo.quorum?.toNumber() || 0,
      votingPeriod: governanceInfo.votingPeriod?.toNumber() || 0,
      activeProposals: governanceInfo.activeProposals?.toNumber() || 0,
      isGovernanceActive,
    };
  } catch (error) {
    console.error("Error fetching governance info:", error);
    // Return default values on error
    return {
      address: tokenAddress,
      name: "Error",
      symbol: "Error",
      balance: "0",
      proposalThreshold: "0",
      quorum: 0,
      votingPeriod: 0,
      activeProposals: 0,
      isGovernanceActive: false,
    };
  }
};

export const UserCreatedTokens = async (
  userAddress: string
): Promise<GovernanceTokenInfo> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider();

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const contract = new ethers.Contract(
      governance_address,
      ClampifyGovernance,
      signer
    );

    const userCreatedTokens = await contract.getGovernanceTokens(userAddress);

    return userCreatedTokens;
  } catch (error) {
    console.error("Detailed error:", error);
    throw error;
  }
};

export interface IGovernanceProposalInfo {
  id: number;
  title: string;
  description: string;
  targetContract: string;
  callData: string;
  proposer: string;
  createdAt: number;
  votingEndsAt: number;
  executed: boolean;
  yesVotes: number;
  noVotes: number;
  yesPercentage: number;
}

export const GovernanceProposalCount = async (
  userAddress: string
): Promise<number> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider();

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const contract = new ethers.Contract(
      governance_address,
      ClampifyGovernance,
      signer
    );

    const proposalCount = await contract.proposalCount(userAddress);

    return proposalCount;
  } catch (error) {
    console.error("Detailed error:", error);
    throw error;
  }
};

export const GovernanceProposalInfo = async (
  tokenAddress: string | undefined,
  proposalId: number
): Promise<IGovernanceProposalInfo> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider();

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const contract = new ethers.Contract(
      governance_address,
      ClampifyGovernance,
      signer
    );

    const proposalDetails = await contract.getProposalDetails(
      tokenAddress,
      proposalId
    );

    return proposalDetails;
  } catch (error) {
    console.error("Detailed error:", error);
    throw error;
  }
};

export const hasVoted = async (
  tokenAddress: string,
  proposalId: number,
  voterAddress: string
): Promise<boolean> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const contract = new ethers.Contract(
      governance_address,
      ClampifyGovernance,
      signer
    );

    const voted = await contract.hasVoted(
      tokenAddress,
      proposalId,
      voterAddress
    );
    return voted;
  } catch (error) {
    console.error("Error checking vote status:", error);
    throw error;
  }
};

export const createProposal = async (
  tokenAddress: string,
  title: string,
  description: string,
  targetContract: string,
  callData: string
): Promise<number> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const contract = new ethers.Contract(
      governance_address,
      ClampifyGovernance,
      signer
    );

    const proposalId = await contract.createProposal(
      tokenAddress,
      title,
      description,
      targetContract,
      callData
    );

    return proposalId;
  } catch (error) {
    console.error("Error creating proposal:", error);
    throw error;
  }
};

export const castVote = async (
  tokenAddress: string,
  proposalId: number,
  support: boolean
): Promise<void> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const contract = new ethers.Contract(
      governance_address,
      ClampifyGovernance,
      signer
    );

    await contract.castVote(tokenAddress, proposalId, support);
  } catch (error) {
    console.error("Error casting vote:", error);
    throw error;
  }
};

export const executeProposal = async (
  tokenAddress: string,
  proposalId: number
): Promise<void> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const contract = new ethers.Contract(
      governance_address,
      ClampifyGovernance,
      signer
    );

    await contract.executeProposal(tokenAddress, proposalId);
  } catch (error) {
    console.error("Error executing proposal:", error);
    throw error;
  }
};

export const activateGovernance = async (
  tokenAddress: string,
  proposalThreshold: number,
  quorum: number,
  votingPeriod: number
): Promise<void> => {
  try {
    const provider =
      ethereum != null
        ? new ethers.providers.Web3Provider(ethereum)
        : new ethers.providers.JsonRpcProvider(RPC_URL);

    const signer = ethereum != null ? provider.getSigner() : null;

    if (!signer) {
      throw new Error("No wallet connected");
    }

    const contract = new ethers.Contract(
      governance_address,
      ClampifyGovernance,
      signer
    );

    const tx = await contract.activateGovernance(
      tokenAddress,
      proposalThreshold,
      quorum,
      votingPeriod
    );
    await tx.wait();
    return tx;
  } catch (error) {
    console.error("Error activating governance:", error);
    throw error;
  }
};
