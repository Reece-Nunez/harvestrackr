"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer, PIE_COLORS } from "./chart-container";
import { formatCurrency } from "@/lib/utils";
import type { CategoryData } from "@/actions/analytics";

interface ExpenseCategoryChartProps {
  data: CategoryData[];
  loading?: boolean;
}

export function ExpenseCategoryChart({ data, loading = false }: ExpenseCategoryChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: PIE_COLORS[index % PIE_COLORS.length],
  }));

  const isEmpty = data.length === 0;

  return (
    <ChartContainer
      title="Expenses by Category"
      description="Distribution of expenses across categories"
      loading={loading}
      isEmpty={isEmpty}
      emptyMessage="No expense data for this period"
    >
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="h-[250px] w-full md:w-1/2">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="amount"
                nameKey="category"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    className="stroke-background stroke-2"
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as CategoryData & { fill: string };
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: data.fill }}
                          />
                          <span className="font-medium">{data.category}</span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          <div>{formatCurrency(data.amount)}</div>
                          <div>{data.count} transaction(s)</div>
                          <div>{data.percentage.toFixed(1)}% of total</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-1/2 grid grid-cols-1 gap-1.5 text-sm">
          {chartData.map((entry) => (
            <div key={entry.category} className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="truncate text-muted-foreground">{entry.category}</span>
              </div>
              <span className="font-medium tabular-nums shrink-0">{entry.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </ChartContainer>
  );
}
