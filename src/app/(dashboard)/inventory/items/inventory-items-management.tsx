"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format, parseISO, isPast, isWithinInterval, addDays } from "date-fns";
import {
  Plus,
  Package,
  Search,
  AlertTriangle,
  Pencil,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { InventoryItemForm } from "@/components/forms/inventory-item-form";
import { INVENTORY_ITEM_TYPES } from "@/schemas/inventory";
import type { InventoryItem } from "@/types/database";

interface InventoryItemsManagementProps {
  farmId: string;
  items: InventoryItem[];
  total: number;
  page: number;
  totalPages: number;
  searchParams: {
    search?: string;
    type?: string;
    lowStock?: string;
  };
}

const typeColors: Record<string, string> = {
  FEED: "bg-amber-100 text-amber-800",
  SEED: "bg-green-100 text-green-800",
  FERTILIZER: "bg-emerald-100 text-emerald-800",
  PESTICIDE: "bg-red-100 text-red-800",
  EQUIPMENT: "bg-blue-100 text-blue-800",
  TOOL: "bg-purple-100 text-purple-800",
  SUPPLY: "bg-gray-100 text-gray-800",
  OTHER: "bg-slate-100 text-slate-800",
};

export function InventoryItemsManagement({
  farmId,
  items,
  total,
  page,
  totalPages,
  searchParams,
}: InventoryItemsManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();

  const [showForm, setShowForm] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<InventoryItem | undefined>();
  const [searchInput, setSearchInput] = React.useState(searchParams.search || "");
  const [selectedType, setSelectedType] = React.useState(searchParams.type || "all");
  const [lowStockOnly, setLowStockOnly] = React.useState(
    searchParams.lowStock === "true"
  );

  // Count low stock and expiring items
  const lowStockCount = items.filter((i) => i.quantity <= 5).length;
  const expiringCount = items.filter((i) => {
    if (!i.expiry_date) return false;
    const expiryDate = parseISO(i.expiry_date);
    return isWithinInterval(expiryDate, {
      start: new Date(),
      end: addDays(new Date(), 30),
    });
  }).length;

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setEditingItem(undefined);
    }
    setShowForm(open);
  };

  const handleSuccess = () => {
    router.refresh();
  };

  const updateFilters = React.useCallback(
    (newParams: Record<string, string | undefined>) => {
      const params = new URLSearchParams(urlSearchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "false") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      if (!newParams.page) {
        params.delete("page");
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, urlSearchParams]
  );

  const handleSearch = () => {
    updateFilters({ search: searchInput || undefined });
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    updateFilters({ type: value });
  };

  const handleLowStockChange = (checked: boolean) => {
    setLowStockOnly(checked);
    updateFilters({ lowStock: checked ? "true" : undefined });
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const date = parseISO(expiryDate);
    if (isPast(date)) {
      return { label: "Expired", color: "bg-red-100 text-red-800" };
    }
    if (
      isWithinInterval(date, {
        start: new Date(),
        end: addDays(new Date(), 30),
      })
    ) {
      return { label: "Expiring Soon", color: "bg-yellow-100 text-yellow-800" };
    }
    return null;
  };

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Items
            </CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{total}</div>
          </CardContent>
        </Card>

        <Card
          className={lowStockCount > 0 ? "border-yellow-500/50" : ""}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock
            </CardTitle>
            <AlertTriangle className={`h-5 w-5 ${lowStockCount > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${lowStockCount > 0 ? "text-yellow-600" : ""}`}>
              {lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">5 or fewer in stock</p>
          </CardContent>
        </Card>

        <Card className={expiringCount > 0 ? "border-orange-500/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expiring Soon
            </CardTitle>
            <AlertTriangle className={`h-5 w-5 ${expiringCount > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${expiringCount > 0 ? "text-orange-600" : ""}`}>
              {expiringCount}
            </div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>

        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items..."
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

        <div className="flex gap-4 items-center">
          <Select value={selectedType} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {INVENTORY_ITEM_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="lowStock"
              checked={lowStockOnly}
              onCheckedChange={handleLowStockChange}
            />
            <Label htmlFor="lowStock" className="text-sm cursor-pointer">
              Low stock only
            </Label>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {items.length} of {total} items
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
            <p className="text-muted-foreground mb-4 text-center">
              {total === 0
                ? "Add your first inventory item to get started"
                : "No items match your filters"}
            </p>
            <Button onClick={() => setShowForm(true)}>Add Item</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50">
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                  Name
                </th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                  Type
                </th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                  Quantity
                </th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">
                  Location
                </th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground hidden lg:table-cell">
                  Expiry
                </th>
                <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {items.map((item) => {
                const expiryStatus = getExpiryStatus(item.expiry_date);
                const isLowStock = item.quantity <= 5;

                return (
                  <tr
                    key={item.id}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <td className="p-4 align-middle">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <Badge
                        variant="secondary"
                        className={typeColors[item.type] || ""}
                      >
                        {item.type.charAt(0) + item.type.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            isLowStock
                              ? "font-bold text-yellow-600"
                              : "font-medium"
                          }
                        >
                          {item.quantity}
                        </span>
                        {item.unit && (
                          <span className="text-muted-foreground text-sm">
                            {item.unit}
                          </span>
                        )}
                        {isLowStock && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle hidden md:table-cell">
                      {item.location ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {item.location}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 align-middle hidden lg:table-cell">
                      {item.expiry_date ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {format(parseISO(item.expiry_date), "MMM d, yyyy")}
                          </span>
                          {expiryStatus && (
                            <Badge
                              variant="secondary"
                              className={expiryStatus.color}
                            >
                              {expiryStatus.label}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 align-middle text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditItem(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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

      {/* Form Dialog */}
      <InventoryItemForm
        farmId={farmId}
        item={editingItem}
        open={showForm}
        onOpenChange={handleFormClose}
        onSuccess={handleSuccess}
      />
    </>
  );
}
