"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Receipt,
  Plus,
  ScanLine,
  DollarSign,
  Warehouse,
  Bird,
  MapPin,
  Package,
  FileText,
  Users,
  Settings,
  BarChart3,
  FileBarChart,
  LogOut,
  ChevronDown,
  ChevronRight,
  Building2,
  ChevronsUpDown,
  Check,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFarm } from "@/components/providers/farm-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  icon: React.ElementType;
  items: NavItem[];
}

const singleNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: Home },
];

const navGroups: NavGroup[] = [
  {
    title: "Expenses",
    icon: Receipt,
    items: [
      { title: "All Expenses", href: "/expenses", icon: Receipt },
      { title: "Add Expense", href: "/expenses/new", icon: Plus },
      { title: "Scan Receipt", href: "/scan-receipt", icon: ScanLine },
    ],
  },
  {
    title: "Income",
    icon: DollarSign,
    items: [
      { title: "All Income", href: "/income", icon: DollarSign },
      { title: "Add Income", href: "/income/new", icon: Plus },
    ],
  },
  {
    title: "Inventory",
    icon: Warehouse,
    items: [
      { title: "Overview", href: "/inventory", icon: Warehouse },
      { title: "Livestock", href: "/inventory/livestock", icon: Warehouse },
      { title: "Chickens", href: "/inventory/chickens", icon: Bird },
      { title: "Fields", href: "/inventory/fields", icon: MapPin },
      { title: "Items", href: "/inventory/items", icon: Package },
    ],
  },
  {
    title: "Invoices & Customers",
    icon: FileText,
    items: [
      { title: "Invoices", href: "/invoices", icon: FileText },
      { title: "Customers", href: "/customers", icon: Users },
    ],
  },
  {
    title: "Team & Settings",
    icon: Settings,
    items: [
      { title: "Team", href: "/team", icon: Users },
      { title: "Farm Settings", href: "/settings", icon: Settings },
    ],
  },
  {
    title: "Reports & Analytics",
    icon: BarChart3,
    items: [
      { title: "Analytics", href: "/analytics", icon: BarChart3 },
      { title: "Reports", href: "/reports", icon: FileBarChart },
    ],
  },
  {
    title: "Import/Export",
    icon: FileSpreadsheet,
    items: [
      { title: "Import Data", href: "/import", icon: Upload },
      { title: "Import Expenses", href: "/import/expenses", icon: Receipt },
      { title: "Import Income", href: "/import/income", icon: DollarSign },
    ],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle?: () => void;
}

function NavItemLink({
  item,
  isCollapsed,
  isActive,
}: {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
}) {
  const Icon = item.icon;

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="sr-only">{item.title}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-4">
            {item.title}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground font-medium"
      )}
    >
      <Icon className="h-4 w-4" />
      {item.title}
    </Link>
  );
}

function CollapsibleNavGroup({
  group,
  isCollapsed,
  pathname,
}: {
  group: NavGroup;
  isCollapsed: boolean;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = React.useState(() =>
    group.items.some((item) => pathname.startsWith(item.href) && item.href !== "/")
  );
  const Icon = group.icon;
  const hasActiveChild = group.items.some(
    (item) => pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/")
  );

  if (isCollapsed) {
    return (
      <DropdownMenu>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground",
                    hasActiveChild && "bg-accent text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="sr-only">{group.title}</span>
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{group.title}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent side="right" align="start" className="w-48">
          <DropdownMenuLabel>{group.title}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {group.items.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
            hasActiveChild && "text-foreground font-medium"
          )}
        >
          <span className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
            {group.title}
          </span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 pt-1">
        <div className="flex flex-col gap-1 border-l border-border pl-4">
          {group.items.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              isCollapsed={false}
              isActive={pathname === item.href}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Sidebar({ isCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { farms, currentFarm, setCurrentFarm, user } = useFarm();

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

  const userName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    : "User";

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Farm Selector */}
      <div className={cn("p-3", isCollapsed && "px-2")}>
        {isCollapsed ? (
          <DropdownMenu>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                    >
                      <Building2 className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {currentFarm?.name || "Select Farm"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent side="right" align="start" className="w-56">
              <DropdownMenuLabel>Select Farm</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {farms.map((farm) => (
                <DropdownMenuItem
                  key={farm.id}
                  onClick={() => setCurrentFarm(farm)}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{farm.name}</span>
                  {currentFarm?.id === farm.id && (
                    <Check className="h-4 w-4 ml-2" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                role="combobox"
              >
                <span className="flex items-center gap-2 truncate">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {currentFarm?.name || "Select Farm"}
                  </span>
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Select Farm</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {farms.map((farm) => (
                <DropdownMenuItem
                  key={farm.id}
                  onClick={() => setCurrentFarm(farm)}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{farm.name}</span>
                  {currentFarm?.id === farm.id && (
                    <Check className="h-4 w-4 ml-2" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Separator />

      {/* User Profile Section */}
      <div className={cn("p-3", isCollapsed && "px-2")}>
        {isCollapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/profile" className="block">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatar_url || undefined} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{userName}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar_url || undefined} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">{userName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user?.email}
              </span>
            </div>
          </Link>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div
          className={cn(
            "flex flex-col gap-1",
            isCollapsed && "items-center"
          )}
        >
          {/* Single Nav Items (Dashboard) */}
          {singleNavItems.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
              isActive={pathname === item.href}
            />
          ))}

          <Separator className="my-2" />

          {/* Collapsible Nav Groups */}
          {navGroups.map((group) => (
            <CollapsibleNavGroup
              key={group.title}
              group={group}
              isCollapsed={isCollapsed}
              pathname={pathname}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Sign Out Button */}
      <div className={cn("p-3", isCollapsed && "px-2")}>
        <Separator className="mb-3" />
        {isCollapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="h-10 w-10 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Sign out</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}
