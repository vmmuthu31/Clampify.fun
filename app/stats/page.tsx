"use client";

import { useEffect, useState } from "react";
import { ChartBar, TrendingUp, Users, Lock, Search } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { TokenInfo } from "@/services/tokenCreation";
import { ethers } from "ethers";

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
}

export default function StatsPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTokens = async () => {
    try {
      const response = await fetch("/api/tokens");
      const data = await response.json();
      
      // Fetch balance info for each token
      const tokensWithInfo = await Promise.all(
        data.tokens.map(async (token: Token) => {
          try {
            const tokenInfo = await TokenInfo(token.address);
            return {
              ...token,
              balance: tokenInfo.balance,
              totalSupply: tokenInfo.totalSupply
            };
          } catch (error) {
            console.error(`Error fetching info for token ${token.address}:`, error);
            return token;
          }
        })
      );
      
      setTokens(tokensWithInfo);
    } catch (error) {
      console.error("Error fetching tokens:", error);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const filteredTokens = tokens.filter((token) =>
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0A041A]">
      <div className="container mx-auto px-4 pt-20">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { 
              label: "Total Volume", 
              value: "$12.5M", 
              change: "+25%",
              icon: <ChartBar className="w-5 h-5 text-[#618AFF]" />
            },
            { 
              label: "Total Tokens", 
              value: "1,234", 
              change: "+12",
              icon: <TrendingUp className="w-5 h-5 text-[#00FFA3]" />
            },
            { 
              label: "Total Users", 
              value: "45.2K", 
              change: "+1.2K",
              icon: <Users className="w-5 h-5 text-[#FF3B69]" />
            },
            { 
              label: "Total Locked", 
              value: "$5.8M", 
              change: "+$500K",
              icon: <Lock className="w-5 h-5 text-[#FF3E9C]" />
            }
          ].map((stat, i) => (
            <div key={i} className="rounded-[24px] bg-gradient-to-b from-[#FF3B691A] to-[#FF3B6900] p-[1px]">
              <div className="rounded-[24px] bg-[#130B1D] p-6">
                <div className="flex items-center gap-3 mb-4">
                  {stat.icon}
                  <span className="text-white/60">{stat.label}</span>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-sm text-[#00FFA3]">{stat.change} (24h)</div>
              </div>
            </div>
          ))}
        </div>

        {/* Trending Tokens Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-20"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">Trending Tokens</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tokens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 pr-10 rounded-lg bg-[#ffae5c]/5 border border-[#ffae5c]/20 
                    text-white placeholder-white/50 focus:outline-none focus:border-[#ffae5c]/40
                    transition-all duration-300"
                />
                <Search className="w-4 h-4 text-white/50 absolute right-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {filteredTokens.map((token: Token, i: number) => (
              <Link href={`/token/${token.address}`} key={token.address}>
                <motion.div
                  className="bg-[#ffae5c]/5 backdrop-blur-sm rounded-xl p-6 border border-[#ffae5c]/20 
                    hover:border-[#ffae5c]/40 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{
                    scale: 1.03,
                    backgroundColor: "rgba(108, 92, 231, 0.08)",
                  }}
                >
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#ffae5c]/30 to-[#4834D4]/30 flex items-center justify-center">
                      <span className="text-white/90 font-medium">
                        {token.symbol}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium">{token.name}</div>
                      <div className="text-white/50 text-sm">
                        {token.balance ? (
                          `${Number(ethers.utils.formatEther(token.balance)).toLocaleString()} ${token.symbol}`
                        ) : (
                          "Loading..."
                        )}
                      </div>
                    </div>
                  </div>

                  {token.totalSupply && token.balance && (
                    <div className="relative pt-1">
                      <div className="text-white/60 text-xs flex justify-between mb-1">
                        <span>Supply</span>
                        <span className="text-white/90 font-medium">
                          {Number(token.totalSupply).toLocaleString()} {token.symbol}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#ffae5c] to-[#4834D4] h-full rounded-full"
                          style={{
                            width: `${(Number(ethers.utils.formatEther(token.balance)) / Number(token.totalSupply)) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              </Link>
            ))}
          </div>

          {filteredTokens.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <p className="text-white/70">
                No tokens found matching &quot;{searchQuery}&quot;
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </main>
  );
} 