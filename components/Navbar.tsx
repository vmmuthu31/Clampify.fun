import Link from "next/link";
import WalletButton from "@/components/WalletButton";

function Navbar() {
  return (
    <div className="flex justify-between items-center p-10">
      <Link className="text-white" href="/">
        Clampify
      </Link>
      <WalletButton />
    </div>
  );
}

export default Navbar;
