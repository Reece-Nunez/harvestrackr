"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  loading?: boolean;
  className?: string;
  action?: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function ChartContainer({
  title,
  description,
  children,
  loading = false,
  className,
  action,
  isEmpty = false,
  emptyMessage = "No data available",
}: ChartContainerProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && (
            <CardDescription className="text-sm text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </div>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <ChartSkeleton />
        ) : isEmpty ? (
          <EmptyChartState message={emptyMessage} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[300px] w-full animate-pulse">
      <div className="flex h-full items-end justify-around gap-2 pt-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-full"
            style={{ height: `${Math.random() * 60 + 30}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6 text-muted-foreground"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Chart color palette for consistent theming
export const CHART_COLORS = {
  primary: "hsl(var(--chart-1))",
  secondary: "hsl(var(--chart-2))",
  accent: "hsl(var(--chart-3))",
  muted: "hsl(var(--chart-4))",
  highlight: "hsl(var(--chart-5))",
};

// Predefined color arrays for pie/donut charts
export const PIE_COLORS = [
  "#22c55e", // green-500
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#ec4899", // pink-500
  "#f97316", // orange-500
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
];

export const BAR_COLORS = {
  revenue: "#22c55e", // green-500
  expenses: "#ef4444", // red-500
  profit: "#3b82f6", // blue-500
};

export const LINE_COLORS = {
  inflow: "#22c55e", // green-500
  outflow: "#ef4444", // red-500
  balance: "#3b82f6", // blue-500
};
