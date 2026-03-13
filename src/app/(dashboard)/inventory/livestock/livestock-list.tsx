"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { getLivestock, deleteLivestock } from "@/actions/inventory";
import { SPECIES_OPTIONS, LIVESTOCK_STATUSES } from "@/schemas/inventory";
import type { Field } from "@/types/database";

interface LivestockWithField {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  tag_number: string | null;
  birth_date: string | null;
  weight: number | null;
  gender: string | null;
  status: string;
  field_id: string | null;
  notes: string | null;
  created_at: string;
  field?: { id: string; name: string } | null;
}

interface LivestockListProps {
  farmId: string;
  fields: Field[];
  page?: number;
  search?: string;
  species?: string;
  status?: string;
  fieldId?: string;
  sortBy?: "name" | "species" | "created_at";
  sortOrder?: "asc" | "desc";
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  SOLD: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DECEASED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  TRANSFERRED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  QUARANTINED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function LivestockList({
  farmId,
  fields,
  page = 1,
  search,
  species,
  status,
  fieldId,
  sortBy = "created_at",
  sortOrder = "desc",
}: LivestockListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [livestock, setLivestock] = React.useState<LivestockWithField[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const [searchInput, setSearchInput] = React.useState(search || "");
  const [selectedSpecies, setSelectedSpecies] = React.useState(species || "all");
  const [selectedStatus, setSelectedStatus] = React.useState(status || "all");
  const [selectedField, setSelectedField] = React.useState(fieldId || "all");

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getLivestock(farmId, {
          species: species === "all" ? undefined : species,
          status: status === "all" ? undefined : status as "ACTIVE" | "SOLD" | "DECEASED" | "TRANSFERRED" | undefined,
          fieldId: fieldId === "all" ? undefined : fieldId,
          search,
          sortBy,
          sortOrder,
          page,
          pageSize: 20,
        });
        setLivestock(result.livestock as LivestockWithField[]);
        setTotal(result.total);
        setTotalPages(result.totalPages ?? 1);
      } catch (error) {
        console.error("Error fetching livestock:", error);
        toast.error("Failed to load livestock");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [farmId, page, search, species, status, fieldId, sortBy, sortOrder]);

  // Update URL params
  const updateFilters = React.useCallback(
    (newParams: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Reset to page 1 when filters change
      if (!newParams.page) {
        params.delete("page");
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const handleSearch = () => {
    updateFilters({ search: searchInput || undefined });
  };

  const handleSpeciesChange = (value: string) => {
    setSelectedSpecies(value);
    updateFilters({ species: value });
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    updateFilters({ status: value });
  };

  const handleFieldChange = (value: string) => {
    setSelectedField(value);
    updateFilters({ fieldId: value });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const result = await deleteLivestock(deleteId, farmId);
      if (result.success) {
        toast.success("Livestock deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete livestock");
    } finally {
      setDeleteId(null);
    }
  };

  const columns: ColumnDef<LivestockWithField>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          href={`/inventory/livestock/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.getValue("name")}
        </Link>
      ),
    },
    {
      accessorKey: "species",
      header: "Species",
    },
    {
      accessorKey: "breed",
      header: "Breed",
      cell: ({ row }) => row.getValue("breed") || "-",
    },
    {
      accessorKey: "tag_number",
      header: "Tag #",
      cell: ({ row }) => row.getValue("tag_number") || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant="secondary" className={statusColors[status] || ""}>
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: "field",
      header: "Field",
      cell: ({ row }) => {
        const field = row.original.field;
        return field?.name || "-";
      },
    },
    {
      accessorKey: "birth_date",
      header: "Age",
      cell: ({ row }) => {
        const birthDate = row.getValue("birth_date") as string | null;
        if (!birthDate) return "-";
        return formatDistanceToNow(parseISO(birthDate));
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const animal = row.original;
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
                <Link href={`/inventory/livestock/${animal.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/inventory/livestock/${animal.id}?edit=true`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteId(animal.id)}
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

  const table = useReactTable({
    data: livestock,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or tag..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>
            Search
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedSpecies} onValueChange={handleSpeciesChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Species" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Species</SelectItem>
              {SPECIES_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {LIVESTOCK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedField} onValueChange={handleFieldChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              {fields.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {livestock.length} of {total} animals
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
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : table.getRowModel().rows?.length ? (
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
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No livestock found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateFilters({ page: String(page - 1) })}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateFilters({ page: String(page + 1) })}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this animal and all its associated
              medical records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
