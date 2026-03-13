"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExpenseField, IncomeField } from "@/lib/csv-service";

interface ColumnMapperProps {
  csvHeaders: string[];
  fields: (ExpenseField | IncomeField)[];
  mappings: Record<string, string>;
  manualValues: Record<string, string>;
  onMappingChange: (fieldKey: string, csvColumn: string) => void;
  onManualValueChange: (fieldKey: string, value: string) => void;
  previewData?: Record<string, string>[];
}

export function ColumnMapper({
  csvHeaders,
  fields,
  mappings,
  manualValues,
  onMappingChange,
  onManualValueChange,
  previewData = [],
}: ColumnMapperProps) {
  // Get a sample value from the CSV for preview
  const getSampleValue = (csvColumn: string): string => {
    if (!csvColumn || csvColumn === "__MANUAL__" || previewData.length === 0) {
      return "";
    }
    return previewData[0][csvColumn] || "";
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <h4 className="mb-2 font-medium text-foreground">Instructions</h4>
        <p className="text-sm text-muted-foreground">
          Map each field below to a column from your CSV file. For fields without a
          matching column, you can select &quot;Manual Input&quot; to enter a value that will
          be applied to all rows.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field) => {
          const currentMapping = mappings[field.key] || "";
          const isManual = currentMapping === "__MANUAL__";
          const sampleValue = isManual
            ? manualValues[field.key] || ""
            : getSampleValue(currentMapping);

          return (
            <div
              key={field.key}
              className="grid gap-4 rounded-lg border p-4 md:grid-cols-3 md:items-start"
            >
              {/* Field Info */}
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <Label className="font-medium">{field.label}</Label>
                  {field.required && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground capitalize">
                  Type: {field.type}
                </span>
              </div>

              {/* Column Selection */}
              <div className="space-y-2">
                <Select
                  value={currentMapping}
                  onValueChange={(value) => onMappingChange(field.key, value)}
                >
                  <SelectTrigger
                    className={cn(
                      !currentMapping && field.required && "border-amber-400"
                    )}
                  >
                    <SelectValue placeholder="Select a column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__SKIP__">
                      <span className="text-muted-foreground">-- Skip this field --</span>
                    </SelectItem>
                    <SelectItem value="__MANUAL__">
                      <span className="text-blue-600">Manual Input</span>
                    </SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isManual && (
                  <Input
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    value={manualValues[field.key] || ""}
                    onChange={(e) => onManualValueChange(field.key, e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Preview */}
              <div className="flex flex-col">
                <Label className="mb-1 text-xs text-muted-foreground">
                  Preview
                </Label>
                <div className="min-h-[2.25rem] rounded-md bg-muted px-3 py-2 text-sm">
                  {sampleValue ? (
                    <span className="text-foreground">{sampleValue}</span>
                  ) : (
                    <span className="text-muted-foreground italic">No value</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
