"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";

export default function WalletButtonProvider({
  children,
}: {
  children: ReactNode;
}) {
  const zeroGTestnet = {
    id: 16600,
    name: "0G-Newton-Testnet",
    network: "0G",
    nativeCurrency: { name: "0G", symbol: "A0G", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://evmrpc-testnet.0g.ai/"] },
    },
    blockExplorers: {
      default: {
        name: "0G-Newton-Testnet",
        url: "https://testnet.0g.explorers.guru",
      },
    },
    testnet: true,
  };
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        defaultChain: zeroGTestnet,
        supportedChains: [zeroGTestnet],
        appearance: {
          theme: "light",
          accentColor: "#676FFF",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
