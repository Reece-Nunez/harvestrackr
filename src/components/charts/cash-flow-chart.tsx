"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from "recharts";
import { ChartContainer, LINE_COLORS } from "./chart-container";
import { formatCurrency } from "@/lib/utils";
import type { CashFlowData } from "@/actions/analytics";

interface CashFlowChartProps {
  data: CashFlowData[];
  loading?: boolean;
}

export function CashFlowChart({ data, loading = false }: CashFlowChartProps) {
  const isEmpty = data.length === 0;

  return (
    <ChartContainer
      title="Cash Flow Trend"
      description="Track your money inflows, outflows, and running balance"
      loading={loading}
      isEmpty={isEmpty}
      emptyMessage="No cash flow data for this period"
    >
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={LINE_COLORS.balance} stopOpacity={0.3} />
                <stop offset="95%" stopColor={LINE_COLORS.balance} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
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
            <Area
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke={LINE_COLORS.balance}
              fill="url(#balanceGradient)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="inflow"
              name="Inflow"
              stroke={LINE_COLORS.inflow}
              strokeWidth={2}
              dot={{ fill: LINE_COLORS.inflow, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="outflow"
              name="Outflow"
              stroke={LINE_COLORS.outflow}
              strokeWidth={2}
              dot={{ fill: LINE_COLORS.outflow, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
