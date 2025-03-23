import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  Wallet,
  Copy,
  ExternalLink,
  LogOut,
  Check,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function WalletButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const [copied, setCopied] = useState(false);

  const smartWallet = user?.linkedAccounts.find(
    (account) => account.type === "smart_wallet" || account.type === "wallet"
  );

  const address = smartWallet?.address || "";
  const truncatedAddress = address
    ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    : "";

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!ready) {
    return (
      <Button
        variant="outline"
        className="cursor-not-allowed opacity-70"
        disabled
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (!authenticated) {
    return (
      <Button
        onClick={login}
        className="bg-gradient-to-r rounded-full from-[#ffae5c] to-[#ff9021] border-[#ffae5c]  hover:text-black hover:bg-gradient-to-r hover:from-[#ffae5c] hover:to-[#ff9021] text-white transition-all"
      >
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-gradient-to-r rounded-full from-[#ffae5c] to-[#ff9021] border-[#ffae5c] text-[#ffae5c] hover:text-[#ffae5c] hover:bg-gradient-to-r hover:from-[#ffae5c] hover:to-[#ff9021]"
        >
          <div className="h-6 w-6 rounded-full bg-[#ffae5c] border border-[#ffae5c] text-white mr-2 flex items-center justify-center">
            <Wallet className="h-3 w-3 text-white" />
          </div>
          <span className="font-medium text-white">{truncatedAddress}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 border-gray-700 text-white rounded-lg bg-black/20"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm text-gray-500">Connected Wallet</p>
            <p className="font-mono text-xs truncate">{address}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <TooltipProvider>
          <Tooltip open={copied}>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                onClick={copyAddress}
                className="cursor-pointer"
              >
                {copied ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                <span>{copied ? "Copied!" : "Copy Address"}</span>
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Copied to clipboard!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuItem className="cursor-pointer" asChild>
          <a
            // TODO: change to update explorer link
            href={`https://amoy.polygonscan.com/account/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            <span>View on Explorer</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={logout}
          className="text-red-600 cursor-pointer hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default WalletButton;
