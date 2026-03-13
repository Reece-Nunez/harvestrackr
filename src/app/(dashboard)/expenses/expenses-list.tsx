"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Search,
  X,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-picker";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { deleteExpense, getExpenses } from "@/actions/expenses";
import { EXPENSE_CATEGORIES, type ExpenseWithLineItems } from "@/schemas/expense";

interface ExpensesListProps {
  farmId: string;
  page?: number;
  search?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "date" | "vendor" | "grand_total";
  sortOrder?: "asc" | "desc";
}

export function ExpensesList({
  farmId,
  page = 1,
  search,
  category,
  startDate,
  endDate,
  sortBy = "date",
  sortOrder = "desc",
}: ExpensesListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [expenses, setExpenses] = React.useState<ExpenseWithLineItems[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Filter state
  const [searchValue, setSearchValue] = React.useState(search || "");
  const [dateRange, setDateRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined,
  });

  // Sorting state
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: sortBy, desc: sortOrder === "desc" },
  ]);

  // Fetch expenses
  const fetchExpenses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getExpenses(farmId, {
        page,
        search,
        category,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      });
      setExpenses(result.expenses as ExpenseWithLineItems[]);
      setTotal(result.total);
      setTotalPages(result.totalPages || 1);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setIsLoading(false);
    }
  }, [farmId, page, search, category, startDate, endDate, sortBy, sortOrder]);

  React.useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Update URL with filters
  const updateFilters = React.useCallback(
    (newParams: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Reset to page 1 when filters change
      if (!newParams.page) {
        params.set("page", "1");
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  // Handle search
  const handleSearch = () => {
    updateFilters({ search: searchValue || undefined });
  };

  // Handle date range
  const handleDateRangeChange = (range: { from?: Date; to?: Date } | undefined) => {
    const newRange = { from: range?.from, to: range?.to };
    setDateRange(newRange);
    updateFilters({
      startDate: newRange.from ? format(newRange.from, "yyyy-MM-dd") : undefined,
      endDate: newRange.to ? format(newRange.to, "yyyy-MM-dd") : undefined,
    });
  };

  // Handle category filter
  const handleCategoryChange = (value: string) => {
    updateFilters({ category: value === "all" ? undefined : value });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchValue("");
    setDateRange({ from: undefined, to: undefined });
    router.push(pathname);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const result = await deleteExpense(deleteId, farmId);
      if (result.success) {
        toast.success("Expense deleted successfully");
        fetchExpenses();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete expense");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Table columns
  const columns: ColumnDef<ExpenseWithLineItems>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const isDesc = column.getIsSorted() === "desc";
            updateFilters({
              sortBy: "date",
              sortOrder: isDesc ? "asc" : "desc",
            });
          }}
        >
          Date
          {sortBy === "date" ? (
            sortOrder === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUp className="ml-2 h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/expenses/${row.original.id}/view`}
          className="hover:underline text-primary"
        >
          {formatDate(row.getValue("date"))}
        </Link>
      ),
    },
    {
      accessorKey: "vendor",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const isDesc = column.getIsSorted() === "desc";
            updateFilters({
              sortBy: "vendor",
              sortOrder: isDesc ? "asc" : "desc",
            });
          }}
        >
          Vendor
          {sortBy === "vendor" ? (
            sortOrder === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUp className="ml-2 h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => row.getValue("vendor") || "—",
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => {
        const lineItems = row.original.expense_line_items;
        const categories = [...new Set(lineItems.map((item) => item.category))];
        return (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 2).map((cat) => (
              <Badge key={cat} variant="secondary" className="text-xs">
                {cat}
              </Badge>
            ))}
            {categories.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{categories.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "grand_total",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const isDesc = column.getIsSorted() === "desc";
            updateFilters({
              sortBy: "grand_total",
              sortOrder: isDesc ? "asc" : "desc",
            });
          }}
          className="justify-end w-full"
        >
          Total
          {sortBy === "grand_total" ? (
            sortOrder === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUp className="ml-2 h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.getValue("grand_total"))}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const expense = row.original;
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
              <DropdownMenuItem asChild>
                <Link href={`/expenses/${expense.id}/view`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/expenses/${expense.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteId(expense.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: expenses,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const hasFilters = search || category || startDate || endDate;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            Search
          </Button>
        </div>

        <Select value={category || "all"} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          placeholder="Filter by date"
          className="w-[280px]"
        />

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-10 px-2 text-left align-middle font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center">
                  Loading...
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center py-8">
                    <Receipt className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No expenses found</p>
                    {hasFilters && (
                      <Button
                        variant="link"
                        onClick={clearFilters}
                        className="mt-2"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-2 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of{" "}
            {total} expenses
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateFilters({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateFilters({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
