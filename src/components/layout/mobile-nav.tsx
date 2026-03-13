"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Receipt,
  DollarSign,
  Warehouse,
  MoreHorizontal,
  FileText,
  Users,
  Settings,
  BarChart3,
  FileBarChart,
  Bird,
  MapPin,
  Package,
  ScanLine,
  Plus,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const primaryNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: Home },
  { title: "Expenses", href: "/expenses", icon: Receipt },
  { title: "Income", href: "/income", icon: DollarSign },
  { title: "Inventory", href: "/inventory/livestock", icon: Warehouse },
];

const moreNavItems: NavItem[] = [
  { title: "Scan Receipt", href: "/scan-receipt", icon: ScanLine },
  { title: "Add Expense", href: "/expenses/new", icon: Plus },
  { title: "Add Income", href: "/income/new", icon: Plus },
];

const inventoryItems: NavItem[] = [
  { title: "Livestock", href: "/inventory/livestock", icon: Warehouse },
  { title: "Chickens", href: "/inventory/chickens", icon: Bird },
  { title: "Fields", href: "/inventory/fields", icon: MapPin },
  { title: "Items", href: "/inventory/items", icon: Package },
];

const invoiceItems: NavItem[] = [
  { title: "Invoices", href: "/invoices", icon: FileText },
  { title: "Customers", href: "/customers", icon: Users },
];

const settingsItems: NavItem[] = [
  { title: "Team", href: "/team", icon: Users },
  { title: "Farm Settings", href: "/settings", icon: Settings },
];

const analyticsItems: NavItem[] = [
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Reports", href: "/reports", icon: FileBarChart },
];

interface MobileNavProps {
  onSignOut?: () => void;
}

export function MobileNav({ onSignOut }: MobileNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const scrollDelta = currentScrollY - lastScrollY.current;

          // Only hide if scrolled down more than 10px
          if (scrollDelta > 10 && currentScrollY > 50) {
            setIsVisible(false);
          } else if (scrollDelta < -10) {
            setIsVisible(true);
          }

          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const NavLink = ({
    item,
    onClick,
  }: {
    item: NavItem;
    onClick?: () => void;
  }) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
        {item.title}
      </Link>
    );
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden transition-transform duration-300",
        !isVisible && "translate-y-full"
      )}
    >
      <div className="flex h-16 items-center justify-around px-2 safe-area-pb">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  active && "scale-110"
                )}
              />
              <span className={cn("truncate", active && "font-medium")}>
                {item.title}
              </span>
              {active && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}

        {/* More Menu */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="h-5 w-5" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl" showHandle>
            <SheetHeader className="text-left">
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-full mt-4 pb-safe">
              <div className="flex flex-col gap-6 pb-8">
                {/* Quick Actions */}
                <div>
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quick Actions
                  </h3>
                  <div className="flex flex-col gap-1">
                    {moreNavItems.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        onClick={() => setIsSheetOpen(false)}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Inventory */}
                <div>
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Inventory
                  </h3>
                  <div className="flex flex-col gap-1">
                    {inventoryItems.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        onClick={() => setIsSheetOpen(false)}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Invoices & Customers */}
                <div>
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Invoices & Customers
                  </h3>
                  <div className="flex flex-col gap-1">
                    {invoiceItems.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        onClick={() => setIsSheetOpen(false)}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Analytics */}
                <div>
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Analytics & Reports
                  </h3>
                  <div className="flex flex-col gap-1">
                    {analyticsItems.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        onClick={() => setIsSheetOpen(false)}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Settings */}
                <div>
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Settings
                  </h3>
                  <div className="flex flex-col gap-1">
                    {settingsItems.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        onClick={() => setIsSheetOpen(false)}
                      />
                    ))}
                  </div>
                </div>

                {onSignOut && (
                  <>
                    <Separator />
                    <button
                      onClick={() => {
                        setIsSheetOpen(false);
                        onSignOut();
                      }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign out
                    </button>
                  </>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
