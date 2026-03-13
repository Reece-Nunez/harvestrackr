"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpDown,
  Filter,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { deleteIncome } from "@/actions/income";
import { ITEM_TYPES, PAYMENT_METHODS } from "@/schemas/income";
import type { Income } from "@/types/database";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { DateRangePicker } from "@/components/ui/date-picker";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

interface IncomeWithLivestock extends Income {
  livestock?: {
    id: string;
    name: string;
    species: string;
  } | null;
}

interface IncomeDataTableProps {
  data: IncomeWithLivestock[];
  farmId: string;
}

function getPaymentMethodLabel(value: string | null): string {
  if (!value) return "-";
  const method = PAYMENT_METHODS.find((m) => m.value === value);
  return method?.label || value;
}

export function IncomeDataTable({ data, farmId }: IncomeDataTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<IncomeWithLivestock | null>(null);

  // Filter state
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [itemFilter, setItemFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");

  // Filter data
  const filteredData = data.filter((income) => {
    // Date range filter
    if (dateRange.from) {
      const incomeDate = new Date(income.date);
      if (incomeDate < dateRange.from) return false;
    }
    if (dateRange.to) {
      const incomeDate = new Date(income.date);
      if (incomeDate > dateRange.to) return false;
    }

    // Item filter
    if (itemFilter !== "all" && income.item !== itemFilter) {
      return false;
    }

    // Payment method filter
    if (paymentMethodFilter !== "all" && income.payment_method !== paymentMethodFilter) {
      return false;
    }

    return true;
  });

  const handleDelete = async () => {
    if (!incomeToDelete) return;

    startTransition(async () => {
      const result = await deleteIncome(incomeToDelete.id, farmId);

      if (result.success) {
        toast.success("Income record deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete income record");
      }

      setDeleteDialogOpen(false);
      setIncomeToDelete(null);
    });
  };

  const columns: ColumnDef<IncomeWithLivestock>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("date"));
        return format(date, "MMM d, yyyy");
      },
    },
    {
      accessorKey: "item",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Item" />
      ),
      cell: ({ row }) => {
        const item = row.getValue("item") as string;
        const livestock = row.original.livestock;

        return (
          <div className="flex flex-col">
            <span>{item}</span>
            {livestock && (
              <span className="text-xs text-muted-foreground">
                {livestock.name} ({livestock.species})
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Quantity" />
      ),
      cell: ({ row }) => {
        const quantity = row.getValue("quantity") as number;
        return quantity.toLocaleString();
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Price" />
      ),
      cell: ({ row }) => {
        const price = row.getValue("price") as number;
        return `$${price.toFixed(2)}`;
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total Amount" />
      ),
      cell: ({ row }) => {
        const amount = row.getValue("amount") as number;
        return (
          <span className="font-medium text-green-600 dark:text-green-400">
            ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "payment_method",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Payment Method" />
      ),
      cell: ({ row }) => {
        const paymentMethod = row.getValue("payment_method") as string | null;
        if (!paymentMethod) return <span className="text-muted-foreground">-</span>;

        return (
          <Badge variant="outline">{getPaymentMethodLabel(paymentMethod)}</Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const income = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/income/${income.id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  setIncomeToDelete(income);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const clearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setItemFilter("all");
    setPaymentMethodFilter("all");
  };

  const hasActiveFilters =
    dateRange.from || dateRange.to || itemFilter !== "all" || paymentMethodFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Date Range</label>
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={(range) =>
              setDateRange({ from: range?.from, to: range?.to })
            }
            placeholder="Filter by date"
            className="w-[280px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Item Type</label>
          <Select value={itemFilter} onValueChange={setItemFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              {ITEM_TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Payment Method</label>
          <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="h-9 px-2 lg:px-3"
          >
            Clear filters
            <Filter className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        searchKey="item"
        searchPlaceholder="Search by item..."
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this income record
              {incomeToDelete?.livestock && (
                <span>
                  {" "}
                  and set the linked animal ({incomeToDelete.livestock.name}) back to
                  &quot;Active&quot; status
                </span>
              )}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
