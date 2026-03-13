"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./breadcrumbs";

interface HeaderProps {
  title: string;
  description?: string;
  showBreadcrumbs?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function Header({
  title,
  description,
  showBreadcrumbs = true,
  children,
  className,
}: HeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {showBreadcrumbs && <Breadcrumbs />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground md:text-base">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        )}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  heading: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ heading, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between sm:pb-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {heading}
        </h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-shrink-0 items-center gap-2">{children}</div>
      )}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  children,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
