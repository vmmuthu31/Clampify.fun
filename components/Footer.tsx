import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

function Footer() {
  return (
    <footer className="border-t bg-gradient-to-r from-[#0D0B15] to-[#0D0B15]/95 border-[#ffae5c]/20 py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                animate={{ rotate: [0, 360] }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <Image src="/logo.svg" alt="Clampify" width={32} height={32} />
              </motion.div>
              <span className="text-[#ffae5c] text-xl font-bold">Clampify</span>
            </div>
            <p className="text-[#ffae5c]">The rugproof token platform</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-[#ffae5c] font-medium mb-3">Product</h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/launch"
                    className="text-[#ffae5c] hover:text-[#ffae5c]"
                  >
                    Token Launch
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#features"
                    className="text-[#ffae5c] hover:text-[#ffae5c]"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-[#ffae5c] hover:text-[#ffae5c]"
                  >
                    Security
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-[#ffae5c] hover:text-[#ffae5c]"
                  >
                    Roadmap
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-[#ffae5c] font-medium mb-3">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/docs"
                    className="text-[#ffae5c] hover:text-[#ffae5c]"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-[#ffae5c] hover:text-[#ffae5c]">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="text-[#ffae5c] hover:text-[#ffae5c]">
                    Guides
                  </a>
                </li>
                <li>
                  <a href="#" className="text-[#ffae5c] hover:text-[#ffae5c]">
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-[#ffae5c] font-medium mb-3">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-[#ffae5c] hover:text-[#ffae5c]">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-[#ffae5c] hover:text-[#ffae5c]">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="text-[#ffae5c] hover:text-[#ffae5c]">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#ffae5c]/20 flex flex-col md:flex-row justify-between items-center">
          <p className="text-[#ffae5c] mb-4 md:mb-0">
            © 2025 Clampify Protocol. All rights reserved.
          </p>

          <div className="flex space-x-4">
            <Link
              target="_blank"
              href="https://x.com/Clampifydotfun"
              className="text-[#ffae5c] hover:text-[#ffae5c]"
            >
              <div className="w-10 h-10 rounded-full border border-[#ffae5c]/20 flex items-center justify-center">
                <span className="text-lg">𝕏</span>
              </div>
            </Link>
            <Link
              target="_blank"
              href="https://www.clampify.fun/"
              className="text-[#ffae5c] hover:text-[#ffae5c]"
            >
              <div className="w-10 h-10 rounded-full border border-[#ffae5c]/20 flex items-center justify-center">
                <span className="text-lg">🌐</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
