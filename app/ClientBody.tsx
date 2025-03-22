"use client";

import { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import WalletProvider from "@/providers/WalletProvider";

function ClientBody({ children }: { children: ReactNode }) {
  return (
    <div>
      <WalletProvider>
        <Navbar />
        {children}
      </WalletProvider>
    </div>
  );
}

export default ClientBody;
