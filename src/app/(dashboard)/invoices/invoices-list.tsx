"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
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
  FileText,
  Download,
  CheckCircle,
  Send,
  XCircle,
  DollarSign,
  AlertCircle,
} from "lucide-react";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  deleteInvoice,
  getInvoices,
  getInvoiceStats,
  updateInvoiceStatus,
} from "@/actions/invoices";
import {
  INVOICE_STATUSES,
  getInvoiceStatusVariant,
  isInvoiceOverdue,
  type InvoiceStatus,
} from "@/schemas/invoice";

interface InvoicesListProps {
  farmId: string;
  page?: number;
  search?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
  sortBy?: "date" | "due_date" | "invoice_number" | "total" | "status";
  sortOrder?: "asc" | "desc";
}

interface InvoiceWithCustomer {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  status: InvoiceStatus;
  total: number;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
}

export function InvoicesList({
  farmId,
  page = 1,
  search,
  status,
  startDate,
  endDate,
  sortBy = "date",
  sortOrder = "desc",
}: InvoicesListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [invoices, setInvoices] = React.useState<InvoiceWithCustomer[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [stats, setStats] = React.useState({
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    overdueAmount: 0,
  });

  // Filter state
  const [searchValue, setSearchValue] = React.useState(search || "");
  const [dateRange, setDateRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined,
  });

  // Fetch invoices and stats
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [invoicesResult, statsResult] = await Promise.all([
        getInvoices(farmId, {
          page,
          search,
          status,
          startDate,
          endDate,
          sortBy,
          sortOrder,
        }),
        getInvoiceStats(farmId),
      ]);
      setInvoices(invoicesResult.invoices as InvoiceWithCustomer[]);
      setTotal(invoicesResult.total);
      setTotalPages(invoicesResult.totalPages || 1);
      setStats(statsResult);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  }, [farmId, page, search, status, startDate, endDate, sortBy, sortOrder]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Handle status filter
  const handleStatusChange = (value: string) => {
    updateFilters({ status: value === "all" ? undefined : value });
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
      const result = await deleteInvoice(deleteId, farmId);
      if (result.success) {
        toast.success("Invoice deleted successfully");
        fetchData();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete invoice");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (id: string, newStatus: InvoiceStatus) => {
    try {
      const result = await updateInvoiceStatus(id, farmId, newStatus);
      if (result.success) {
        toast.success(`Invoice marked as ${newStatus.toLowerCase()}`);
        fetchData();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to update invoice status");
    }
  };

  // Table columns
  const columns: ColumnDef<InvoiceWithCustomer>[] = [
    {
      accessorKey: "invoice_number",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const isDesc =
              sortBy === "invoice_number" && sortOrder === "desc";
            updateFilters({
              sortBy: "invoice_number",
              sortOrder: isDesc ? "asc" : "desc",
            });
          }}
        >
          Invoice #
          {sortBy === "invoice_number" ? (
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
          href={`/invoices/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.getValue("invoice_number")}
        </Link>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <Link
          href={`/customers/${row.original.customer.id}`}
          className="hover:underline"
        >
          {row.original.customer.name}
        </Link>
      ),
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const isDesc = sortBy === "date" && sortOrder === "desc";
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
      cell: ({ row }) => formatDate(row.getValue("date")),
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const isDesc = sortBy === "due_date" && sortOrder === "desc";
            updateFilters({
              sortBy: "due_date",
              sortOrder: isDesc ? "asc" : "desc",
            });
          }}
        >
          Due Date
          {sortBy === "due_date" ? (
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
      cell: ({ row }) => {
        const invoice = row.original;
        const overdue = isInvoiceOverdue(invoice);
        return (
          <span className={cn(overdue && "text-destructive font-medium")}>
            {formatDate(row.getValue("due_date"))}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const isDesc = sortBy === "status" && sortOrder === "desc";
            updateFilters({
              sortBy: "status",
              sortOrder: isDesc ? "asc" : "desc",
            });
          }}
        >
          Status
          {sortBy === "status" ? (
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
      cell: ({ row }) => {
        const invoiceStatus = row.getValue("status") as InvoiceStatus;
        return (
          <Badge variant={getInvoiceStatusVariant(invoiceStatus)}>
            {invoiceStatus}
          </Badge>
        );
      },
    },
    {
      accessorKey: "total",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const isDesc = sortBy === "total" && sortOrder === "desc";
            updateFilters({
              sortBy: "total",
              sortOrder: isDesc ? "asc" : "desc",
            });
          }}
          className="justify-end w-full"
        >
          Total
          {sortBy === "total" ? (
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
          {formatCurrency(row.getValue("total"))}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const invoice = row.original;
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
                <Link href={`/invoices/${invoice.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/invoices/${invoice.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {invoice.status === "DRAFT" && (
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate(invoice.id, "SENT")}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Mark as Sent
                </DropdownMenuItem>
              )}
              {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate(invoice.id, "PAID")}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </DropdownMenuItem>
              )}
              {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate(invoice.id, "CANCELLED")}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteId(invoice.id)}
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
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const hasFilters = search || status || startDate || endDate;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(stats.paidAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(stats.unpaidAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(stats.overdueAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
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

        <Select value={status || "all"} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {INVOICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
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
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center py-8">
                    <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No invoices found</p>
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
            {total} invoices
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
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot
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
