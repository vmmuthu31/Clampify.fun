"use client";

import { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import WalletProvider from "@/providers/WalletProvider";
import Footer from "@/components/Footer";

function ClientBody({ children }: { children: ReactNode }) {
  return (
    <div>
      <WalletProvider>
        <Navbar />
        {children}
        <Footer />
      </WalletProvider>
    </div>
  );
}

export default ClientBody;
