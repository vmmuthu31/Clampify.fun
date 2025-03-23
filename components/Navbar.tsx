"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  ChevronDown,
  ExternalLink,
  Shield,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./WalletButton";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setProductsDropdownOpen(false);
  };

  const navItems = [
    {
      label: "Products",
      href: "#",
      isDropdown: true,
      dropdownItems: [
        {
          label: "Launch Token",
          href: "/create-token",
          icon: <Rocket className="w-4 h-4" />,
        },
      ],
    },
    {
      label: "Governance",
      href: "/governance",
    },
    { label: "Stats", href: "/stats" },
    { label: "Docs", href: "/docs" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-black/80 border-b border-[#ffae5c]/20"
          : "bg-transparent"
      } backdrop-blur-lg`}
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        {/* Logo & Desktop Navigation */}
        <div className="flex items-center gap-10">
          {/* Logo */}
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="flex items-center gap-2"
          >
            <motion.div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
            >
              <Image
                src="/logo.svg"
                alt="Clampify Logo"
                width={25}
                height={25}
              />
            </motion.div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#ffae5c] to-[#ff9021]">
              Clampify
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item, idx) => (
              <div key={idx} className="relative">
                {item.isDropdown ? (
                  <div>
                    <Button
                      variant="ghost"
                      className={`text-white/80 hover:text-white hover:bg-[#ffae5c]/10 px-4 py-2 h-12 rounded-xl`}
                      onClick={() =>
                        setProductsDropdownOpen(!productsDropdownOpen)
                      }
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        className={`w-4 h-4 ml-1 transition-transform ${
                          productsDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </Button>

                    <AnimatePresence>
                      {productsDropdownOpen && (
                        <motion.div
                          className="absolute top-full left-0 mt-2 w-56 bg-black/90 border border-[#ffae5c]/20 rounded-xl backdrop-blur-xl overflow-hidden z-50"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="p-2">
                            {item.dropdownItems.map((dropdownItem, dropIdx) => (
                              <Link
                                key={dropIdx}
                                href={dropdownItem.href}
                                onClick={() => {
                                  setProductsDropdownOpen(false);
                                  closeMobileMenu();
                                }}
                              >
                                <div
                                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-[#ffae5c]/10 transition-colors ${
                                    pathname === dropdownItem.href
                                      ? "bg-[#ffae5c]/10 text-white"
                                      : ""
                                  }`}
                                >
                                  <div className="text-[#ffae5c]">
                                    {dropdownItem.icon}
                                  </div>
                                  <span>{dropdownItem.label}</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                  >
                    <Button
                      variant="ghost"
                      className={`text-white/80 hover:text-white hover:bg-[#ffae5c]/10 px-4 py-2 h-12 rounded-xl ${
                        pathname === item.href
                          ? "bg-[#ffae5c]/10 text-white"
                          : ""
                      }`}
                    >
                      {item.label}
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Network & Connect Wallet */}
        <div className="flex items-center gap-4">
          {/* Wallet Button */}
          <WalletButton />

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white hover:bg-[#ffae5c]/10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 top-20 z-40 bg-black/95 backdrop-blur-xl"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="container mx-auto py-8 px-4">
              <div className="space-y-1">
                {navItems.map((item, idx) => (
                  <div key={idx}>
                    {item.isDropdown ? (
                      <div>
                        <div
                          className={`flex items-center justify-between p-4 rounded-xl text-white/80 hover:text-white ${
                            productsDropdownOpen ? "bg-[#ffae5c]/10" : ""
                          }`}
                          onClick={() =>
                            setProductsDropdownOpen(!productsDropdownOpen)
                          }
                        >
                          <span className="text-lg font-medium">
                            {item.label}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 transition-transform ${
                              productsDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>

                        <AnimatePresence>
                          {productsDropdownOpen && (
                            <motion.div
                              className="ml-4 mt-1 space-y-1 border-l-2 border-[#ffae5c]/30 pl-4"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {item.dropdownItems.map(
                                (dropdownItem, dropIdx) => (
                                  <Link
                                    key={dropIdx}
                                    href={dropdownItem.href}
                                    onClick={closeMobileMenu}
                                  >
                                    <div
                                      className={`flex items-center gap-3 p-4 rounded-xl text-white/70 hover:text-white hover:bg-[#ffae5c]/10 ${
                                        pathname === dropdownItem.href
                                          ? "bg-[#ffae5c]/10 text-white"
                                          : ""
                                      }`}
                                    >
                                      <div className="text-[#ffae5c]">
                                        {dropdownItem.icon}
                                      </div>
                                      <span>{dropdownItem.label}</span>
                                    </div>
                                  </Link>
                                )
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <Link href={item.href} onClick={closeMobileMenu}>
                        <div
                          className={`p-4 rounded-xl text-white/80 hover:text-white ${
                            pathname === item.href
                              ? "bg-[#ffae5c]/10 text-white"
                              : ""
                          }`}
                        >
                          <span className="text-lg font-medium">
                            {item.label}
                          </span>
                        </div>
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              {/* Network Badge (Mobile) */}
              <div className="mt-8 p-4 border-t border-[#ffae5c]/20">
                <div className="flex items-center gap-2 mb-6">
                  <div className="relative">
                    <Shield className="w-5 h-5 text-[#ffae5c]" />
                    <div className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-green-400" />
                  </div>
                  <span className="text-white/80">Connected to 0G Network</span>
                </div>

                {/* Additional Mobile Links */}
                <div className="space-y-4">
                  <a
                    href="https://chainscan-newton.0g.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-[#ffae5c]/5 text-white/70 hover:text-white border border-[#ffae5c]/20"
                  >
                    <span>0G Explorer</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <Link
                    href="/faq"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#ffae5c]/5 text-white/70 hover:text-white border border-[#ffae5c]/20"
                  >
                    <span>FAQs & Help</span>
                    <ChevronDown className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
