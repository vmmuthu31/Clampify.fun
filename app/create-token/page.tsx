"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import {
  Lock,
  Shield,
  Rocket,
  Info,
  X,
  AlertTriangle,
  Wallet,
  UploadCloud,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mint } from "@/services/tokenCreation";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { usePrivy } from "@privy-io/react-auth";
import { createTokenRecord, recordTransaction } from "@/services/api";

// Lock period options in seconds
const CREATOR_LOCK_PERIODS = [
  { label: "24 hours", value: "86400" },
  { label: "7 days", value: "604800" },
  { label: "30 days", value: "2592000" },
  { label: "90 days", value: "7776000" },
];

const LIQUIDITY_LOCK_PERIODS = [
  { label: "30 days", value: "2592000" },
  { label: "90 days", value: "7776000" },
  { label: "180 days", value: "15552000" },
  { label: "365 days", value: "31536000" },
];

// Define form field types
interface TokenForm {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  initialPrice: string;
  creatorLockupPeriod: string;
  lockLiquidity: boolean;
  liquidityLockPeriod: string;
  image: string;
}

// Define errors type
interface FormErrors {
  name?: string;
  symbol?: string;
  initialSupply?: string;
  maxSupply?: string;
  initialPrice?: string;
  creatorLockupPeriod?: string;
  lockLiquidity?: boolean;
  liquidityLockPeriod?: string;
}

// Helper function to format seconds into human readable duration
const formatDuration = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""}`;
  }
  return `${hours} hour${hours > 1 ? "s" : ""}`;
};

export default function LaunchPage() {
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchSuccess, setLaunchSuccess] = useState(false);
  const { ready, authenticated, login, user } = usePrivy();
  const router = useRouter();

  // Form state
  const [tokenForm, setTokenForm] = useState<TokenForm>({
    name: "",
    symbol: "",
    initialSupply: "1000000000000000000000000", // mint 10m tokens
    maxSupply: "10000000000000000000000000000000000000000000000000000", // max 10b tokens
    initialPrice: "1", // 1 Gwei (0.000000001 ETH)
    creatorLockupPeriod: "86400", // 24 hours in seconds
    lockLiquidity: true,
    liquidityLockPeriod: "2592000", // 30 days in seconds
    image: "",
  });

  // Validation
  const [errors, setErrors] = useState<FormErrors>({});

  // Add image preview state
  const [imagePreview, setImagePreview] = useState<string>("");

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!tokenForm.name.trim()) newErrors.name = "Token name is required";
    if (!tokenForm.symbol.trim()) newErrors.symbol = "Token symbol is required";
    if (tokenForm.symbol.length > 6)
      newErrors.symbol = "Symbol must be 6 characters or less";
    if (parseFloat(tokenForm.initialSupply) <= 0)
      newErrors.initialSupply = "Initial supply must be greater than 0";
    if (
      parseFloat(tokenForm.maxSupply) <= parseFloat(tokenForm.initialSupply)
    ) {
      newErrors.maxSupply = "Max supply must be greater than initial supply";
    }
    if (parseFloat(tokenForm.initialPrice) <= 0)
      newErrors.initialPrice = "Initial price must be greater than 0";
    if (!tokenForm.creatorLockupPeriod)
      newErrors.creatorLockupPeriod = "Creator lock period is required";
    if (tokenForm.lockLiquidity && !tokenForm.liquidityLockPeriod)
      newErrors.liquidityLockPeriod = "Liquidity lock period is required";

    // Add image validation if you want it to be required
    // if (!tokenForm.image) {
    //   newErrors.image = "Token image is required";
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormChange = (field: keyof TokenForm, value: string) => {
    setTokenForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear the error for this field if it exists
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  };

  // Add image handling function
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setTokenForm((prev) => ({
          ...prev,
          image: base64String,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLaunch = async () => {
    if (!validateForm()) return;
    setIsLaunching(true);

    try {
      const priceInEth = ethers.utils.formatUnits(
        tokenForm.initialPrice,
        "gwei"
      );
      const tokenAddress = await Mint(
        tokenForm.name,
        tokenForm.symbol,
        tokenForm.initialSupply,
        tokenForm.maxSupply,
        priceInEth,
        tokenForm.creatorLockupPeriod,
        tokenForm.lockLiquidity,
        tokenForm.liquidityLockPeriod
      );

      // Create token record with all fields
      await createTokenRecord({
        address: tokenAddress,
        name: tokenForm.name,
        symbol: tokenForm.symbol,
        creator: user?.wallet?.address || "",
        initialSupply: tokenForm.initialSupply,
        maxSupply: tokenForm.maxSupply,
        initialPrice: priceInEth,
        creatorLockupPeriod: tokenForm.creatorLockupPeriod,
        lockLiquidity: tokenForm.lockLiquidity,
        liquidityLockPeriod: tokenForm.liquidityLockPeriod,
        image: tokenForm.image,
      });

      await recordTransaction({
        address: tokenAddress,
        creator: user?.wallet?.address,
        type: "CREATE",
        amount: tokenForm.initialSupply,
        price: tokenForm.initialPrice,
        txHash: tokenAddress,
        name: tokenForm.name,
        symbol: tokenForm.symbol,
      });

      setLaunchSuccess(true);
      router.push(`/token/${tokenAddress}`);
    } catch (error) {
      console.error("Error creating token:", error);
      setIsLaunching(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-[#0D0B15]">
      <Navbar />

      {/* Success Modal */}
      {launchSuccess && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4">
          <div className="bg-[#0D0B15] border border-[#ffae5c]/30 rounded-xl max-w-md w-full p-6 relative">
            <button
              className="absolute top-4 right-4 text-white/50 hover:text-white"
              onClick={() => setLaunchSuccess(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#ffae5c]/20 flex items-center justify-center">
                <Rocket className="w-8 h-8 text-[#ffae5c]" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
              <p className="text-white/70 mb-4">
                Your token ${tokenForm.symbol} has been launched with rugproof
                protection
              </p>

              <p className="text-[#ffae5c]">Redirecting to token page...</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal */}
      {isLaunching && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#ffae5c]/20 border-t-[#ffae5c] animate-spin"></div>
            <p className="text-white">Launching your token...</p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 pt-32 pb-20">
        {/* Page Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-4 text-white">
            Launch Your{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ffae5c] to-[#4834D4]">
              Secure Token
            </span>
          </h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto">
            Create a rugproof token with built-in supply locking and anti-rug
            pull protection
          </p>
        </div>

        {/* Form Container */}
        <div className="max-w-2xl mx-auto bg-black/20 backdrop-blur-md rounded-xl border border-[#ffae5c]/20 p-6">
          <div className="flex items-center mb-6">
            <Rocket className="w-5 h-5 text-[#ffae5c] mr-2" />
            <h2 className="text-2xl font-bold text-white">Token Details</h2>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-white mb-2">
                Token Name <span className="text-[#ffae5c]">*</span>
              </Label>
              <Input
                id="name"
                className={`w-full bg-black/30 border-[#ffae5c]/20 focus:border-[#ffae5c] text-white ${
                  errors.name ? "border-red-500" : ""
                }`}
                placeholder="e.g. Clampify Token"
                value={tokenForm.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />
              {errors.name && (
                <p className="mt-1 text-red-500 text-sm">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="symbol" className="text-white mb-2">
                Token Symbol <span className="text-[#ffae5c]">*</span>
              </Label>
              <Input
                id="symbol"
                className={`w-full bg-black/30 border-[#ffae5c]/20 focus:border-[#ffae5c] text-white uppercase ${
                  errors.symbol ? "border-red-500" : ""
                }`}
                placeholder="e.g. CLAMP"
                maxLength={6}
                value={tokenForm.symbol}
                onChange={(e) =>
                  handleFormChange("symbol", e.target.value.toUpperCase())
                }
              />
              {errors.symbol && (
                <p className="mt-1 text-red-500 text-sm">{errors.symbol}</p>
              )}
              <p className="mt-1 text-white/50 text-sm">
                3-6 characters, uppercase letters only
              </p>
            </div>
            <div>
              <Label htmlFor="creatorLockupPeriod" className="text-white mb-2">
                Lockup Period <span className="text-[#ffae5c]">*</span>
              </Label>
              <Select
                value={tokenForm.creatorLockupPeriod}
                onValueChange={(value) =>
                  handleFormChange("creatorLockupPeriod", value)
                }
              >
                <SelectTrigger className="w-full bg-black/30 border-[#ffae5c]/20 focus:border-[#ffae5c] text-white">
                  <SelectValue placeholder="Select lock period" />
                </SelectTrigger>
                <SelectContent className="bg-[#0D0B15] border-[#ffae5c]/20 focus:border-[#ffae5c] text-white">
                  {CREATOR_LOCK_PERIODS.map((period) => (
                    <SelectItem
                      className="text-white hover:bg-[#ffae5c]/10 cursor-pointer"
                      key={period.value}
                      value={period.value}
                    >
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.creatorLockupPeriod && (
                <p className="mt-1 text-red-500 text-sm">
                  {errors.creatorLockupPeriod}
                </p>
              )}
              {tokenForm.creatorLockupPeriod && (
                <p className="mt-1 text-white/50 text-sm">
                  Tokens will be locked for{" "}
                  {formatDuration(parseInt(tokenForm.creatorLockupPeriod))}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="lockLiquidity" className="text-white mb-2">
                Lock Liquidity <span className="text-[#ffae5c]">*</span>
              </Label>
              <Switch
                id="lockLiquidity"
                defaultChecked={true}
                className="data-[state=checked]:bg-[#ffae5c]"
                onCheckedChange={(value) =>
                  handleFormChange("lockLiquidity", value.toString())
                }
              />
            </div>

            {tokenForm.lockLiquidity && (
              <div>
                <Label
                  htmlFor="liquidityLockPeriod"
                  className="text-white mb-2"
                >
                  Liquidity Lock Period{" "}
                  <span className="text-[#ffae5c]">*</span>
                </Label>
                <Select
                  value={tokenForm.liquidityLockPeriod}
                  onValueChange={(value) =>
                    handleFormChange("liquidityLockPeriod", value)
                  }
                >
                  <SelectTrigger className="w-full bg-black/30 border-[#ffae5c]/20 focus:border-[#ffae5c] text-white">
                    <SelectValue placeholder="Select lock period" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D0B15] border-[#ffae5c]/20 focus:border-[#ffae5c] text-white">
                    {LIQUIDITY_LOCK_PERIODS.map((period) => (
                      <SelectItem
                        className="text-white hover:bg-[#ffae5c]/10 cursor-pointer"
                        key={period.value}
                        value={period.value}
                      >
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.liquidityLockPeriod && (
                  <p className="mt-1 text-red-500 text-sm">
                    {errors.liquidityLockPeriod}
                  </p>
                )}
                {tokenForm.liquidityLockPeriod && (
                  <p className="mt-1 text-white/50 text-sm">
                    Liquidity will be locked for{" "}
                    {formatDuration(parseInt(tokenForm.liquidityLockPeriod))}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="tokenImage" className="text-white mb-2">
                Token Image
              </Label>
              <div className="mt-2 flex justify-center rounded-lg border border-dashed border-[#ffae5c]/20 px-6 py-10">
                <div className="text-center">
                  {imagePreview ? (
                    <div className="relative w-32 h-32 mx-auto">
                      <img
                        src={imagePreview}
                        alt="Token preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setImagePreview("");
                          setTokenForm((prev) => ({ ...prev, image: "" }));
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <UploadCloud className="mx-auto h-12 w-12 text-[#ffae5c]" />
                      <div className="mt-4 flex text-sm leading-6 text-white/70">
                        <label
                          htmlFor="tokenImage"
                          className="relative cursor-pointer rounded-md bg-transparent font-semibold text-[#ffae5c] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#ffae5c] focus-within:ring-offset-2 hover:text-[#ffae5c]/80"
                        >
                          <span>Upload a file</span>
                          <input
                            id="tokenImage"
                            name="tokenImage"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleImageChange}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs leading-5 text-white/50">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-[#ffae5c]/10 border border-[#ffae5c]/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-[#ffae5c] mt-1 flex-shrink-0" />
              <div className="text-sm text-white/70">
                By launching this token, you agree to lock{" "}
                {tokenForm.creatorLockupPeriod}% of the supply and enable
                anti-rug protection features. This process is irreversible.
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            {ready && authenticated ? (
              <Button
                className="bg-gradient-to-r from-[#ffae5c] to-[#4834D4] hover:opacity-90 text-white px-8 py-2 rounded-xl"
                onClick={handleLaunch}
              >
                <Rocket className="mr-2 w-5 h-5" />
                Launch Token
              </Button>
            ) : (
              <Button
                onClick={login}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white transition-all"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-3xl mx-auto mt-12 p-6 bg-black/20 backdrop-blur-md rounded-xl border border-[#ffae5c]/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-[#ffae5c]/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#ffae5c]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Clampify Protection Features
              </h3>
              <p className="text-white/70">
                All tokens launched with Clampify include:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#ffae5c] mt-1" />
              <div>
                <div className="text-white font-medium">Supply Locking</div>
                <div className="text-white/70 text-sm">
                  Prevents large dumps and stabilizes price
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#ffae5c] mt-1" />
              <div>
                <div className="text-white font-medium">
                  Liquidity Protection
                </div>
                <div className="text-white/70 text-sm">
                  Automatically locks liquidity to prevent rug pulls
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#ffae5c] mt-1" />
              <div>
                <div className="text-white font-medium">Wallet Limits</div>
                <div className="text-white/70 text-sm">
                  Prevents single wallets from owning too much supply
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Rocket className="w-5 h-5 text-[#ffae5c] mt-1" />
              <div>
                <div className="text-white font-medium">Trading Safeguards</div>
                <div className="text-white/70 text-sm">
                  Transaction limits and anti-bot measures
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
