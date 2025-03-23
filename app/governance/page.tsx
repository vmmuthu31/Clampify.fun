"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Navbar } from "@/components/Navbar";
import { usePrivy } from "@privy-io/react-auth";
import {
  GovernanceProposalCount,
  GovernanceProposalInfo,
  GovernanceTokenInfo,
  createProposal,
  activateGovernance,
  castVote,
  executeProposal,
} from "@/services/tokenCreation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TokenInfo } from "@/services/tokenCreation";
import { ethers } from "ethers";

type IGovernanceTokenInfo = {
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
// Form schema for creating proposals
const proposalFormSchema = z.object({
  tokenAddress: z
    .string()
    .startsWith("0x", { message: "Must be a valid Ethereum address" }),
  title: z.string().min(5, { message: "Title must be at least 5 characters" }),
  description: z
    .string()
    .min(20, { message: "Description must be at least 20 characters" }),
});

type ProposalFormValues = {
  tokenAddress: string;
  title: string;
  description: string;
};

type ProposalInfo = {
  title: string;
  description: string;
  proposer: string;
  createdAt: string;
  votingEndsAt: string;
  executed: boolean;
  targetContract: string;
  isActive: boolean;
  yesVotes: string;
  noVotes: string;
  id: number;
  yesPercentage: number;
  noPercentage: number;
  quorumReached: boolean;
  hasVoted: boolean | null;
  userVoteDirection: boolean | null;
};

interface Token {
  _id: string;
  address: string;
  name: string;
  symbol: string;
  creator: string;
  initialSupply: string;
  maxSupply: string;
  createdAt: string;
  __v: number;
  balance?: string;
  totalSupply?: string;
  proposalThreshold?: string;
  quorum?: number;
  votingPeriod?: number;
}

interface RawProposalData {
  0: string; // title
  1: string; // description
  2: string; // proposer
  3: { _hex: string; _isBigNumber: boolean }; // createdAt
  4: { _hex: string; _isBigNumber: boolean }; // votingEndsAt
  5: boolean; // executed
  6: string; // targetContract
  7: { _hex: string; _isBigNumber: boolean }; // yesVotes
  8: { _hex: string; _isBigNumber: boolean }; // noVotes
  [key: number]: string | boolean | { _hex: string; _isBigNumber: boolean };
}

export default function GovernancePage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalInfo[]>([]);
  const [userCreatedTokens, setUserCreatedTokens] = useState<Token[]>([]);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const { authenticated, login, user } = usePrivy();
  const userAddress = user?.wallet?.address;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [governanceInfo, setGovernanceInfo] =
    useState<IGovernanceTokenInfo | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [loading, setLoading] = useState(false);
  // Fetch tokens from backend
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/tokens");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          setTokens(data.tokens);
          console.log("Fetched tokens:", data.tokens);
        }
      } catch (error) {
        console.error("Error fetching tokens:", error);
        toast.error("Failed to fetch tokens");
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, []);

  // Fetch user's created tokens
  useEffect(() => {
    const fetchUserTokens = async () => {
      if (userAddress) {
        try {
          const response = await fetch(`/api/tokens/user/${userAddress}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          if (data.success) {
            // Fetch balance info for each token
            const tokensWithBalance = await Promise.all(
              data.tokens.map(async (token: Token) => {
                try {
                  const tokenInfo = await TokenInfo(token.address);
                  return {
                    ...token,
                    balance: tokenInfo.balance,
                    totalSupply: tokenInfo.totalSupply,
                  };
                } catch (error) {
                  console.error(
                    `Error fetching info for token ${token.address}:`,
                    error
                  );
                  return token;
                }
              })
            );
            setUserCreatedTokens(tokensWithBalance);
          }
        } catch (error) {
          console.error("Error fetching user tokens:", error);
          toast.error("Failed to fetch user tokens");
        }
      }
    };

    if (userAddress) {
      fetchUserTokens();
    }
  }, [userAddress]);

  useEffect(() => {
    const fetchProposals = async () => {
      if (selectedToken) {
        try {
          const proposalCount = await GovernanceProposalCount(selectedToken);
          if (proposalCount > 0) {
            const proposalPromises = [];
            for (let i = 1; i <= proposalCount; i++) {
              proposalPromises.push(GovernanceProposalInfo(selectedToken, i));
            }

            const newProposals = await Promise.all(proposalPromises);
            setProposals(
              newProposals.map((p) => ({
                ...p,
                createdAt: p?.createdAt?.toString(),
                votingEndsAt: p?.votingEndsAt?.toString(),
                yesVotes: p?.yesVotes?.toString(),
                noVotes: p?.noVotes?.toString(),
                isActive: !p?.executed,
                yesPercentage:
                  (p?.yesVotes / (p?.yesVotes + p?.noVotes)) * 100 || 0,
                noPercentage:
                  (p?.noVotes / (p?.yesVotes + p?.noVotes)) * 100 || 0,
                quorumReached: false,
                hasVoted: null,
                userVoteDirection: null,
                proposer: p?.proposer,
              }))
            );
          }
        } catch (error) {
          console.error("Error fetching proposals:", error);
        }
      }
    };

    fetchProposals();
  }, [selectedToken]);

  // Form handler for creating new proposals
  const proposalForm = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      tokenAddress: selectedToken || "",
      title: "",
      description: "",
    },
  });

  useEffect(() => {
    // Update form value when selected token changes
    if (selectedToken) {
      proposalForm.setValue("tokenAddress", selectedToken);
    }
  }, [selectedToken, proposalForm]);

  // Modify the effect that fetches governance info
  useEffect(() => {
    const fetchGovernanceInfo = async () => {
      if (selectedToken) {
        try {
          // Get both governance info and token balance
          const tokenInfo = await TokenInfo(selectedToken);
          const govInfo = await GovernanceTokenInfo(selectedToken);

          setGovernanceInfo({
            ...govInfo,
            balance: tokenInfo.balance, // Use the actual token balance
          });
        } catch (error) {
          console.error("Error fetching governance info:", error);
          toast.error("Failed to fetch governance information");
        }
      }
    };

    fetchGovernanceInfo();
  }, [selectedToken]);

  useEffect(() => {
    const loadProposals = async () => {
      if (!selectedToken) return;

      try {
        const proposalCount = await GovernanceProposalCount(selectedToken);
        const count = proposalCount;
        console.log("count", count);

        const selectedTokenInfo = tokens.find(
          (t) => t.address === selectedToken
        );

        const selectedTokenAddress = selectedTokenInfo?.address;

        const proposalPromises = [];
        for (let i = 1; i <= count; i++) {
          proposalPromises.push(
            GovernanceProposalInfo(selectedTokenAddress, i)
          );
        }

        const proposalDetails = await Promise.all(proposalPromises);
        console.log("proposalDetails", proposalDetails);

        const proposalDetailsArray = (
          proposalDetails as unknown as RawProposalData[]
        ).map((p, index) => ({
          title: (p[0] as string) || "",
          description: (p[1] as string) || "",
          proposer: (p[2] as string) || "",
          createdAt: String(
            (p[3] as { _hex: string })?._hex
              ? parseInt((p[3] as { _hex: string })._hex, 16)
              : 0
          ),
          votingEndsAt: String(
            (p[4] as { _hex: string })?._hex
              ? parseInt((p[4] as { _hex: string })._hex, 16)
              : 0
          ),
          executed: (p[5] as boolean) || false,
          targetContract: (p[6] as string) || "",
          yesVotes: (p[7] as { _hex: string })?._hex
            ? parseInt((p[7] as { _hex: string })._hex, 16).toString()
            : "0",
          noVotes: (p[8] as { _hex: string })?._hex
            ? parseInt((p[8] as { _hex: string })._hex, 16).toString()
            : "0",
          isActive: !(p[5] as boolean),
          id: index + 1,
          yesPercentage:
            (parseInt((p[7] as { _hex: string })?._hex || "0", 16) /
              (parseInt((p[7] as { _hex: string })?._hex || "0", 16) +
                parseInt((p[8] as { _hex: string })?._hex || "0", 16) || 1)) *
              100 || 0,
          noPercentage:
            (parseInt((p[8] as { _hex: string })?._hex || "0", 16) /
              (parseInt((p[7] as { _hex: string })?._hex || "0", 16) +
                parseInt((p[8] as { _hex: string })?._hex || "0", 16))) *
              100 || 0,
          quorumReached: false,
          hasVoted: null,
          userVoteDirection: null,
        }));
        setProposals(proposalDetailsArray);

        console.log("proposalDetailsArray", proposalDetailsArray);
      } catch (error) {
        console.error("Error loading proposals:", error);
      }
    };

    loadProposals();
  }, [selectedToken, tokens, userAddress]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onProposalSubmit = async (values: ProposalFormValues) => {
    if (!selectedToken) {
      toast.error("Please select a token first");
      return;
    }

    if (!governanceInfo?.isGovernanceActive) {
      toast.error("Governance is not active for this token");
      return;
    }

    setIsSubmitting(true);
    try {
      await createProposal(
        user?.wallet?.address || "",
        values.tokenAddress,
        values.title,
        values.description,
        "0xB0E24F418A4A36B6F08947A949196e0F3FD09B67", // Static target contract (Clampify Factory)
        "0x" // Static empty call data
      );

      // Reset form and close dialog
      proposalForm.reset();
      setProposalDialogOpen(false);

      toast.success("Proposal created successfully!", {
        description:
          "Your proposal has been submitted to the governance contract.",
      });

      // Refresh proposals
      if (selectedToken) {
        const newProposalCount = await GovernanceProposalCount(selectedToken);
        if (newProposalCount > 0) {
          const proposalPromises = [];
          for (let i = 1; i <= newProposalCount; i++) {
            proposalPromises.push(GovernanceProposalInfo(selectedToken, i));
          }
          const newProposals = await Promise.all(proposalPromises);
          setProposals(
            newProposals.map((p) => ({
              id: p.id,
              title: p.title,
              description: p.description,
              proposer: p.proposer,
              createdAt: String(p.createdAt),
              votingEndsAt: String(p.votingEndsAt),
              isActive: !p.executed,
              executed: p.executed,
              targetContract: p.targetContract,
              yesVotes: p.yesVotes.toString(),
              noVotes: p.noVotes.toString(),
              yesPercentage: (p.yesVotes / (p.yesVotes + p.noVotes)) * 100 || 0,
              noPercentage: (p.noVotes / (p.yesVotes + p.noVotes)) * 100 || 0,
              quorumReached: false,
              hasVoted: null,
              userVoteDirection: null,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error creating proposal:", error);
      toast.error("Failed to create proposal", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vote on a proposal
  const handleVote = async (proposalId: number, support: boolean) => {
    if (!selectedToken) return;

    try {
      await castVote(selectedToken, proposalId, support);
      toast.success("Vote cast successfully!");

      // Refresh proposals to update voting status
      const proposalInfo = await GovernanceProposalInfo(
        selectedToken,
        proposalId
      );
      setProposals(
        proposals.map((p) =>
          p.id === proposalId
            ? {
                ...p,
                yesVotes: proposalInfo.yesVotes.toString(),
                noVotes: proposalInfo.noVotes.toString(),
                yesPercentage:
                  (proposalInfo.yesVotes /
                    (proposalInfo.yesVotes + proposalInfo.noVotes)) *
                    100 || 0,
                noPercentage:
                  (proposalInfo.noVotes /
                    (proposalInfo.yesVotes + proposalInfo.noVotes)) *
                    100 || 0,
                hasVoted: true,
                userVoteDirection: support,
              }
            : p
        )
      );
    } catch (error) {
      console.error("Error casting vote:", error);
      toast.error("Failed to cast vote", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    }
  };

  // Execute a proposal
  const handleExecute = async (proposalId: number) => {
    if (!selectedToken) return;

    try {
      await executeProposal(selectedToken, proposalId);
      toast.success("Proposal executed successfully!");

      // Refresh proposals to update execution status
      setProposals(
        proposals.map((p) =>
          p.id === proposalId
            ? {
                ...p,
                executed: true,
                isActive: false,
              }
            : p
        )
      );
    } catch (error) {
      console.error("Error executing proposal:", error);
      toast.error("Failed to execute proposal", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    }
  };

  // Handle token selection change
  const handleTokenChange = (value: string) => {
    setSelectedToken(value);
  };

  const handleActivateGovernance = async () => {
    if (!selectedToken) {
      toast.error("No token selected");
      return;
    }

    setIsActivating(true);
    try {
      console.log(selectedToken);
      const tx = await activateGovernance(
        selectedToken,
        45, // Default proposal threshold of 1000 tokens
        51, // Default quorum of 51%
        7 * 24 * 60 * 60 // Default voting period of 7 days in seconds
      );
      console.log(tx);

      toast.success("Governance activated successfully!");

      // Refresh governance info
      const info = await GovernanceTokenInfo(selectedToken);
      setGovernanceInfo(info);
    } catch (error) {
      console.error("Error activating governance:", error);
      toast.error("Failed to activate governance", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsActivating(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Clampify Governance</h1>
        <p className="text-lg mb-8">
          Please connect your wallet to access governance features.
        </p>
        <Button size="lg" onClick={() => login()}>
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto min-h-screen px-4 py-20">
        <h1 className="text-3xl font-bold mb-2 text-center">
          Clampify Governance
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Vote on proposals and shape the future of the platform
        </p>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <p className="text-white/70">Fetching tokens...</p>
          </motion.div>
        )}

        {tokens.length === 0 && !loading ? (
          <div className="text-center p-12 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">
              No Governance Tokens Found
            </h2>
            <p className="text-muted-foreground">
              There are no tokens with governance activated yet.
            </p>
          </div>
        ) : (
          <>
            {/* Token Selection and Info Card */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              <Card className="w-full md:w-1/3">
                <CardHeader>
                  <CardTitle>Select Token</CardTitle>
                  <CardDescription>
                    Choose a token to view and participate in governance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedToken || ""}
                    onValueChange={handleTokenChange}
                  >
                    <SelectTrigger className="w-full bg-black/30 border-[#ffae5c]/20 text-white hover:border-[#ffae5c]/40 focus:border-[#ffae5c] focus:ring-1 focus:ring-[#ffae5c]">
                      <SelectValue placeholder="Select a token" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0D0B15] border border-[#ffae5c]/20 text-white shadow-lg shadow-black/50 backdrop-blur-xl">
                      {tokens.map((token) => (
                        <SelectItem
                          key={token.address}
                          value={token.address}
                          className="hover:bg-[#ffae5c]/10 focus:bg-[#ffae5c]/20 cursor-pointer text-white"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#ffae5c]/30 to-[#4834D4]/30 flex items-center justify-center">
                              <span className="text-white/90 font-medium">
                                {token.symbol.slice(0, 1)}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">{token.name}</span>
                              <span className="text-white/60 ml-2">
                                ({token.symbol})
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {selectedToken && (
                <Card className="w-full md:w-2/3">
                  <CardHeader>
                    <CardTitle>
                      {tokens.find((t) => t.address === selectedToken)?.name}{" "}
                      Governance
                    </CardTitle>
                    <CardDescription>
                      Token governance parameters and your voting power
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-1">
                          Your Balance
                        </h3>
                        <p className="text-2xl font-bold">
                          {governanceInfo?.balance
                            ? `${Number(
                                ethers.utils.formatEther(governanceInfo.balance)
                              ).toLocaleString()} ${governanceInfo.symbol}`
                            : "0 TS"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-1">
                          Proposal Threshold
                        </h3>
                        <p className="text-2xl font-bold">
                          {governanceInfo?.proposalThreshold
                            ? `${Number(
                                ethers.utils.formatEther(
                                  governanceInfo.proposalThreshold
                                )
                              ).toLocaleString()} ${governanceInfo.symbol}`
                            : "0 TS"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-1">
                          Quorum Required
                        </h3>
                        <p className="text-2xl font-bold">
                          {governanceInfo?.quorum
                            ? `${governanceInfo.quorum}%`
                            : "0%"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Voting period:{" "}
                      {governanceInfo?.votingPeriod
                        ? formatDuration(governanceInfo.votingPeriod)
                        : "N/A"}
                    </span>
                    {!governanceInfo?.isGovernanceActive && (
                      <Button
                        onClick={handleActivateGovernance}
                        disabled={isActivating}
                        className="bg-gradient-to-r from-[#ffae5c]/10 to-[#4834D4]/10 hover:from-[#ffae5c]/20 hover:to-[#4834D4]/20"
                      >
                        {isActivating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Activating...
                          </>
                        ) : (
                          "Activate Governance"
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )}
            </div>

            {/* Proposals Section */}
            {selectedToken && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <Tabs defaultValue="active" className="w-full">
                    <div className="flex justify-between items-center">
                      <TabsList>
                        <TabsTrigger value="active">
                          Active Proposals
                        </TabsTrigger>
                        <TabsTrigger value="past">Past Proposals</TabsTrigger>
                      </TabsList>

                      {governanceInfo?.isGovernanceActive && (
                        <Dialog
                          open={proposalDialogOpen}
                          onOpenChange={setProposalDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button>Create Proposal</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create New Proposal</DialogTitle>
                              <DialogDescription>
                                Create a new governance proposal for token
                                holders to vote on.
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...proposalForm}>
                              <form
                                onSubmit={proposalForm.handleSubmit(
                                  onProposalSubmit
                                )}
                                className="space-y-4"
                              >
                                <FormField
                                  control={proposalForm.control}
                                  name="title"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Title</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Enter proposal title"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={proposalForm.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Enter proposal description"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Creating...
                                    </>
                                  ) : (
                                    "Create Proposal"
                                  )}
                                </Button>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>

                    <TabsContent value="active" className="space-y-6 mt-6">
                      {proposals.filter((p) => p.isActive).length === 0 ? (
                        <div className="text-center p-12 border rounded-lg">
                          <h2 className="text-xl font-semibold mb-2">
                            No Active Proposals
                          </h2>
                          <p className="text-muted-foreground">
                            There are no active proposals for this token at the
                            moment.
                          </p>
                        </div>
                      ) : (
                        proposals
                          .filter((p) => p.isActive)
                          .map((proposal) => (
                            <ProposalCard
                              key={`${selectedToken}-${proposal.proposer}`}
                              proposal={proposal}
                              onVote={handleVote}
                              onExecute={handleExecute}
                              userAddress={userAddress}
                              selectedToken={selectedToken}
                            />
                          ))
                      )}
                    </TabsContent>

                    <TabsContent value="past" className="space-y-6 mt-6">
                      {proposals.filter((p) => !p.isActive).length === 0 ? (
                        <div className="text-center p-12 border rounded-lg">
                          <h2 className="text-xl font-semibold mb-2">
                            No Past Proposals
                          </h2>
                          <p className="text-muted-foreground">
                            There are no past proposals for this token.
                          </p>
                        </div>
                      ) : (
                        proposals
                          .filter((p) => !p.isActive)
                          .map((proposal) => (
                            <ProposalCard
                              key={`${selectedToken}-${proposal.id}`}
                              proposal={proposal}
                              onVote={handleVote}
                              onExecute={handleExecute}
                              userAddress={userAddress}
                              selectedToken={selectedToken}
                            />
                          ))
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}

            {userCreatedTokens.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">
                  Your Created Tokens
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userCreatedTokens.map((token) => (
                    <div
                      key={token.address}
                      className="p-6 border rounded-lg bg-black/20 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-lg">{token.name}</h3>
                          <span className="text-sm text-muted-foreground">
                            {token.symbol}
                          </span>
                        </div>
                        <div>
                          {governanceInfo?.isGovernanceActive &&
                            token.address === selectedToken && (
                              <Badge
                                variant="outline"
                                className="bg-green-500/10 text-green-500"
                              >
                                Governance Active
                              </Badge>
                            )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>
                            Address: {token.address.slice(0, 6)}...
                            {token.address.slice(-4)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created:{" "}
                          {new Date(token.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Balance:{" "}
                          {token.balance
                            ? `${Number(
                                ethers.utils.formatEther(token.balance)
                              ).toLocaleString()} ${token.symbol}`
                            : "Loading..."}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Supply:{" "}
                          {token?.totalSupply
                            ? `${Number(token?.totalSupply).toLocaleString()} ${
                                token?.symbol
                              }`
                            : "Loading..."}
                        </div>
                        {token?.totalSupply && token?.balance && (
                          <div className="mt-2">
                            <div className="text-sm text-muted-foreground mb-1">
                              Your Holdings
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-[#ffae5c] to-[#4834D4] h-full rounded-full"
                                style={{
                                  width: `${
                                    (Number(
                                      ethers.utils.formatEther(token.balance)
                                    ) /
                                      Number(token.totalSupply)) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// Helper component for proposals
function ProposalCard({
  proposal,
  onVote,
  onExecute,
  userAddress,
}: {
  proposal: ProposalInfo;
  onVote: (proposalId: number, support: boolean) => Promise<void>;
  onExecute: (proposalId: number) => Promise<void>;
  userAddress: string | undefined;
  selectedToken: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              #{proposal.id}: {proposal.title}
              {proposal.executed ? (
                <Badge
                  variant="outline"
                  className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                >
                  Executed
                </Badge>
              ) : !proposal.isActive ? (
                <Badge
                  variant="outline"
                  className="ml-2 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                >
                  Expired
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                >
                  Active
                </Badge>
              )}
            </CardTitle>

            <CardDescription>
              Proposed by:{" "}
              {proposal?.proposer === userAddress
                ? "You"
                : `${proposal?.proposer?.substring(
                    0,
                    6
                  )}...${proposal?.proposer?.substring(38)}`}
              <span className="mx-2">•</span>
              Created:{" "}
              {new Date(Number(proposal?.createdAt) * 1000).toLocaleString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }
              )}
              {/* {formatDistanceToNow(proposal?.createdAt, { addSuffix: true })} */}
            </CardDescription>
          </div>

          <div className="text-right">
            <div className="text-sm font-medium">
              {proposal.isActive && proposal?.votingEndsAt ? (
                <>
                  Voting Ends:{" "}
                  <span className="text-muted-foreground">
                    {new Date(
                      Number(proposal?.votingEndsAt) * 1000 +
                        10 * 24 * 60 * 60 * 1000
                    ).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                </>
              ) : (
                <>
                  Ended:{" "}
                  <span className="text-muted-foreground">
                    {new Date(
                      Number(proposal?.votingEndsAt) * 1000
                    ).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-sm">{proposal.description}</div>

        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Voting Progress</h4>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Yes: ({proposal?.yesPercentage}%)</span>
              <span>No: ({proposal?.noPercentage}%)</span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full">
              <div
                className="bg-green-500 h-2.5 rounded-full"
                style={{ width: `${proposal?.yesPercentage}%` }}
              ></div>
            </div>

            <div className="mt-2 text-sm text-muted-foreground flex justify-between">
              <span>
                {proposal?.hasVoted &&
                  `You voted: ${proposal?.userVoteDirection ? "Yes" : "No"}`}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            {proposal?.isActive && !proposal?.hasVoted && userAddress && (
              <>
                <Button
                  onClick={() => onVote(proposal?.id, true)}
                  variant="outline"
                  className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                >
                  Vote Yes
                </Button>
                <Button
                  onClick={() => onVote(proposal.id, false)}
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  Vote No
                </Button>
              </>
            )}

            {!proposal?.isActive &&
              !proposal?.executed &&
              proposal?.yesPercentage > proposal?.noPercentage &&
              proposal?.quorumReached && (
                <Button
                  onClick={() => onExecute(proposal?.id)}
                  variant="default"
                >
                  Execute Proposal
                </Button>
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to format time duration
function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  } else {
    return `${seconds} seconds`;
  }
}
