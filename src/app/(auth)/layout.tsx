"use client";

import Link from "next/link";
import { Sprout } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      {/* Logo and Branding */}
      <Link
        href="/"
        className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Sprout className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold tracking-tight">HarvesTrackr</span>
      </Link>

      {/* Auth Card Container */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} HarvesTrackr. All rights reserved.
      </p>
    </div>
  );
}
