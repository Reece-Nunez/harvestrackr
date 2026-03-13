"use client";

import * as React from "react";
import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href: string;
}

// Map of path segments to display labels
const pathLabels: Record<string, string> = {
  expenses: "Expenses",
  income: "Income",
  inventory: "Inventory",
  livestock: "Livestock",
  chickens: "Chickens",
  fields: "Fields",
  items: "Items",
  invoices: "Invoices",
  customers: "Customers",
  team: "Team",
  settings: "Settings",
  analytics: "Analytics",
  reports: "Reports",
  profile: "Profile",
  "scan-receipt": "Scan Receipt",
  new: "Add New",
  edit: "Edit",
};

function formatSegment(segment: string): string {
  // Check if we have a custom label
  if (pathLabels[segment]) {
    return pathLabels[segment];
  }

  // Check if it's a UUID (likely an ID)
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment
    )
  ) {
    return "Details";
  }

  // Otherwise, capitalize and replace hyphens with spaces
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Remove leading slash and split by /
  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = "";

  for (const segment of segments) {
    currentPath += `/${segment}`;
    breadcrumbs.push({
      label: formatSegment(segment),
      href: currentPath,
    });
  }

  return breadcrumbs;
}

interface BreadcrumbsProps {
  className?: string;
  homeLabel?: string;
  showHome?: boolean;
  separator?: React.ReactNode;
}

export function Breadcrumbs({
  className,
  homeLabel = "Dashboard",
  showHome = true,
  separator,
}: BreadcrumbsProps) {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  // Don't show breadcrumbs if we're on the home page
  if (pathname === "/" || breadcrumbs.length === 0) {
    return null;
  }

  const SeparatorIcon = separator || (
    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
  );

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm text-muted-foreground", className)}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        {showHome && (
          <>
            <li>
              <Link
                href="/"
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="sr-only md:not-sr-only">{homeLabel}</span>
              </Link>
            </li>
            <li className="flex items-center">{SeparatorIcon}</li>
          </>
        )}
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <Fragment key={crumb.href}>
              <li>
                {isLast ? (
                  <span
                    className="font-medium text-foreground"
                    aria-current="page"
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
              {!isLast && (
                <li className="flex items-center">{SeparatorIcon}</li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

// Alternative breadcrumb component using shadcn style
interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  separator?: React.ReactNode;
}

export function BreadcrumbNav({ separator, className, ...props }: BreadcrumbProps) {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  if (pathname === "/" || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="breadcrumb"
      className={cn("flex items-center", className)}
      {...props}
    >
      <ol className="flex items-center gap-2">
        <li className="inline-flex items-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="mr-1.5 h-4 w-4" />
            Home
          </Link>
        </li>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={crumb.href} className="inline-flex items-center gap-2">
              {separator || <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              {isLast ? (
                <span className="text-sm font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
