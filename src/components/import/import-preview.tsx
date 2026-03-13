"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseField, IncomeField } from "@/lib/csv-service";

interface ImportPreviewProps {
  data: Record<string, unknown>[];
  fields: (ExpenseField | IncomeField)[];
  validationErrors: { row: number; field: string; message: string }[];
  onRemoveRow: (index: number) => void;
  pageSize?: number;
}

export function ImportPreview({
  data,
  fields,
  validationErrors,
  onRemoveRow,
  pageSize = 10,
}: ImportPreviewProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data.length);
  const currentData = data.slice(startIndex, endIndex);

  const getRowErrors = (rowIndex: number): { field: string; message: string }[] => {
    return validationErrors.filter((e) => e.row === rowIndex + 1);
  };

  const hasRowErrors = (rowIndex: number): boolean => {
    return getRowErrors(rowIndex).length > 0;
  };

  const getFieldError = (rowIndex: number, fieldKey: string): string | undefined => {
    return validationErrors.find((e) => e.row === rowIndex + 1 && e.field === fieldKey)
      ?.message;
  };

  const errorCount = new Set(validationErrors.map((e) => e.row)).size;
  const validCount = data.length - errorCount;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm">
            <strong>{validCount}</strong> valid rows
          </span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm">
              <strong>{errorCount}</strong> rows with errors
            </span>
          </div>
        )}
        <div className="flex items-center space-x-2 text-muted-foreground">
          <span className="text-sm">
            Total: <strong>{data.length}</strong> rows
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <ScrollArea className="w-full whitespace-nowrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 w-12 bg-background">
                  #
                </TableHead>
                <TableHead className="sticky left-12 z-10 w-20 bg-background">
                  Status
                </TableHead>
                {fields.map((field) => (
                  <TableHead key={field.key} className="min-w-[120px]">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </TableHead>
                ))}
                <TableHead className="sticky right-0 z-10 w-16 bg-background text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((row, localIndex) => {
                const globalIndex = startIndex + localIndex;
                const rowHasErrors = hasRowErrors(globalIndex);
                const rowErrors = getRowErrors(globalIndex);

                return (
                  <TableRow
                    key={globalIndex}
                    className={cn(rowHasErrors && "bg-red-50 dark:bg-red-900/10")}
                  >
                    <TableCell className="sticky left-0 z-10 bg-inherit font-medium">
                      {globalIndex + 1}
                    </TableCell>
                    <TableCell className="sticky left-12 z-10 bg-inherit">
                      {rowHasErrors ? (
                        <Badge
                          variant="destructive"
                          className="cursor-help"
                          title={rowErrors.map((e) => `${e.field}: ${e.message}`).join("\n")}
                        >
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Error
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Valid
                        </Badge>
                      )}
                    </TableCell>
                    {fields.map((field) => {
                      const value = row[field.key];
                      const error = getFieldError(globalIndex, field.key);

                      return (
                        <TableCell
                          key={field.key}
                          className={cn(
                            "min-w-[120px]",
                            error && "text-red-600 dark:text-red-400"
                          )}
                          title={error}
                        >
                          {value !== undefined && value !== null && value !== "" ? (
                            String(value)
                          ) : (
                            <span className="text-muted-foreground italic">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="sticky right-0 z-10 bg-inherit text-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-red-600"
                        onClick={() => onRemoveRow(globalIndex)}
                        title="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {endIndex} of {data.length} rows
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Errors List */}
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <h4 className="mb-2 flex items-center font-medium text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Validation Errors
          </h4>
          <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
            The following rows have validation errors and may not import correctly.
            You can remove these rows or go back to fix the mappings.
          </p>
          <ul className="max-h-40 overflow-y-auto space-y-1 text-sm text-amber-700 dark:text-amber-400">
            {validationErrors.slice(0, 20).map((error, index) => (
              <li key={index}>
                Row {error.row}: {error.field} - {error.message}
              </li>
            ))}
            {validationErrors.length > 20 && (
              <li className="font-medium">
                ...and {validationErrors.length - 20} more errors
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
