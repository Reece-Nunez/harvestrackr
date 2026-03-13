"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartContainer, BAR_COLORS } from "./chart-container";
import { formatCurrency } from "@/lib/utils";
import type { MonthlyTrend } from "@/actions/analytics";

interface RevenueExpenseChartProps {
  data: MonthlyTrend[];
  loading?: boolean;
}

export function RevenueExpenseChart({ data, loading = false }: RevenueExpenseChartProps) {
  const isEmpty = data.length === 0 || data.every((d) => d.revenue === 0 && d.expenses === 0);

  return (
    <ChartContainer
      title="Revenue vs Expenses"
      description="Monthly comparison of revenue and expenses"
      loading={loading}
      isEmpty={isEmpty}
      emptyMessage="No financial data for this period"
    >
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              className="text-muted-foreground"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md">
                      <p className="font-medium mb-2">{label}</p>
                      {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground capitalize">
                            {entry.name}:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(entry.value as number)}
                          </span>
                        </div>
                      ))}
                      {payload.length >= 2 && (
                        <div className="mt-2 pt-2 border-t text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: BAR_COLORS.profit }}
                            />
                            <span className="text-muted-foreground">Net:</span>
                            <span className="font-medium">
                              {formatCurrency(
                                (payload[0].value as number) - (payload[1].value as number)
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              formatter={(value) => (
                <span className="text-sm text-muted-foreground capitalize">{value}</span>
              )}
            />
            <Bar
              dataKey="revenue"
              name="Revenue"
              fill={BAR_COLORS.revenue}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill={BAR_COLORS.expenses}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
