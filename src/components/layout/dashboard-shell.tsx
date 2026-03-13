"use client";

import * as React from "react";
import { useState, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  Menu,
  Sun,
  Moon,
  Monitor,
  Plus,
  ScanLine,
  Receipt,
  DollarSign,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFarm } from "@/components/providers/farm-provider";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardShellProps {
  children: React.ReactNode;
}

// Custom hook to safely read localStorage with SSR support
function useLocalStorage(key: string, defaultValue: boolean): [boolean, (value: boolean) => void] {
  const subscribe = useCallback(
    (callback: () => void) => {
      window.addEventListener("storage", callback);
      return () => window.removeEventListener("storage", callback);
    },
    []
  );

  const getSnapshot = useCallback(() => {
    const stored = localStorage.getItem(key);
    return stored !== null ? stored === "true" : defaultValue;
  }, [key, defaultValue]);

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (newValue: boolean) => {
      localStorage.setItem(key, String(newValue));
      window.dispatchEvent(new Event("storage"));
    },
    [key]
  );

  return [value, setValue];
}

// Custom hook for mounted state without useEffect
function useMounted(): boolean {
  const subscribe = useCallback(() => () => {}, []);
  const getSnapshot = useCallback(() => true, []);
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, currentFarm } = useFarm();
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage("sidebarCollapsed", false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const mounted = useMounted();

  // Toggle sidebar state
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const userInitials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() ||
      user.email?.[0]?.toUpperCase() ||
      "U"
    : "U";

  const themeIcon = mounted
    ? {
        light: <Sun className="h-4 w-4" />,
        dark: <Moon className="h-4 w-4" />,
        system: <Monitor className="h-4 w-4" />,
      }[theme || "system"]
    : <Monitor className="h-4 w-4" />;

  const fabActions = [
    {
      label: "Scan Receipt",
      icon: ScanLine,
      href: "/scan-receipt",
      color: "bg-purple-500 hover:bg-purple-600 text-white",
    },
    {
      label: "Add Expense",
      icon: Receipt,
      href: "/expenses/new",
      color: "bg-orange-500 hover:bg-orange-600 text-white",
    },
    {
      label: "Add Income",
      icon: DollarSign,
      href: "/income/new",
      color: "bg-blue-500 hover:bg-blue-600 text-white",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-full flex-shrink-0">
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex h-14 items-center justify-between border-b bg-card px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8"
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle sidebar</span>
            </Button>
            {currentFarm && (
              <span className="text-sm text-muted-foreground">
                {currentFarm.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {themeIcon}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="flex md:hidden h-14 items-center justify-between border-b bg-card px-4">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <Sidebar
                isCollapsed={false}
                onToggle={() => setMobileMenuOpen(false)}
              />
            </SheetContent>
          </Sheet>

          {/* Farm Name / Logo */}
          <div className="flex items-center gap-2">
            <Image src="/images/Logo.png" alt="HarvesTrackr" width={28} height={28} className="rounded" />
            <span className="font-semibold text-lg">
              {currentFarm?.name || "HarvesTrackr"}
            </span>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  {themeIcon}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Avatar */}
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl py-4 px-4 md:py-6 md:px-6 pb-20 md:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav onSignOut={handleSignOut} />

      {/* FAB (Floating Action Button) - Mobile Only */}
      <div className="fixed bottom-20 right-4 z-50 md:hidden">
        {/* FAB Menu Items */}
        <div
          className={cn(
            "flex flex-col-reverse gap-3 mb-3 transition-all duration-200",
            fabOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          {fabActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={action.href}
                onClick={() => {
                  setFabOpen(false);
                  router.push(action.href);
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-200",
                  action.color,
                  fabOpen
                    ? "translate-x-0 opacity-100"
                    : "translate-x-8 opacity-0"
                )}
                style={{
                  transitionDelay: fabOpen ? `${index * 50}ms` : "0ms",
                }}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium whitespace-nowrap">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* FAB Button */}
        <Button
          onClick={() => setFabOpen(!fabOpen)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-200",
            fabOpen
              ? "bg-red-500 hover:bg-red-600 rotate-45"
              : "bg-green-600 hover:bg-green-700"
          )}
          size="icon"
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Quick actions</span>
        </Button>
      </div>

      {/* FAB Backdrop */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setFabOpen(false)}
        />
      )}
    </div>
  );
}
