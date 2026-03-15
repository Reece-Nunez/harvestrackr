"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full max-w-7xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between">
        {/* Logo + Brand */}
        <Link href="/" className="flex-shrink-0 flex flex-col items-center">
          <Image
            src="/images/Logo.png"
            alt="HarvesTrackr Logo"
            width={64}
            height={64}
            className="h-10 sm:h-12 w-auto"
            priority
          />
          <span className="text-[#5a7a5a] tracking-[0.2em] text-sm sm:text-base mt-1 inline-flex items-baseline leading-none" style={{ fontFamily: "var(--font-logo)" }}>
            <span style={{ fontWeight: 200 }}>HARVES</span>
            <span
              className="text-[1.5em] leading-none"
              style={{ fontWeight: 700 }}
            >
              T
            </span>
            <span style={{ fontWeight: 200 }}>RACKR</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex text-base text-muted-foreground gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:underline hover:text-green-700 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Login Button */}
        <Button
          asChild
          className="hidden sm:inline-flex text-base sm:text-lg px-4 py-2 sm:px-6 sm:py-3 rounded-2xl shadow-md bg-green-600 hover:bg-green-700"
        >
          <Link href="/login">Login</Link>
        </Button>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          <span className="sr-only">Toggle menu</span>
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <nav className="sm:hidden mt-4 pb-4 border-t pt-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-base text-muted-foreground hover:text-green-700 transition-colors py-2"
            >
              {link.label}
            </Link>
          ))}
          <Button
            asChild
            className="w-full mt-2 text-base rounded-2xl shadow-md bg-green-600 hover:bg-green-700"
          >
            <Link href="/login">Login</Link>
          </Button>
        </nav>
      )}
    </header>
  );
}
