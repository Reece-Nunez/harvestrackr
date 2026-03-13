"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function MarketingHeader() {
  return (
    <header className="w-full flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4 sm:gap-0 max-w-7xl mx-auto">
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

      {/* Navigation */}
      <nav className="text-base text-muted-foreground flex gap-4">
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

      {/* Login Button */}
      <Button
        asChild
        className="text-base sm:text-lg px-4 py-2 sm:px-6 sm:py-3 rounded-2xl shadow-md bg-green-600 hover:bg-green-700"
      >
        <Link href="/login">Login</Link>
      </Button>
    </header>
  );
}
