import Papa from "papaparse";

export interface ColumnMapping {
  csvColumn: string;
  systemField: string;
  manualValue?: string;
}

export interface ParsedCSVResult {
  headers: string[];
  data: Record<string, string>[];
  errors: Papa.ParseError[];
  rowCount: number;
}

export interface ExpenseField {
  key: string;
  label: string;
  required: boolean;
  type: "string" | "number" | "date";
}

export interface IncomeField {
  key: string;
  label: string;
  required: boolean;
  type: "string" | "number" | "date";
}

// Expected fields for expense import
export const expenseFields: ExpenseField[] = [
  { key: "date", label: "Date", required: true, type: "date" },
  { key: "vendor", label: "Vendor", required: true, type: "string" },
  { key: "category", label: "Category", required: true, type: "string" },
  { key: "item", label: "Item", required: true, type: "string" },
  { key: "unitCost", label: "Unit Cost", required: true, type: "number" },
  { key: "quantity", label: "Quantity", required: true, type: "number" },
  { key: "notes", label: "Notes/Description", required: false, type: "string" },
];

// Expected fields for income import (matching the income table schema)
export const incomeFields: IncomeField[] = [
  { key: "date", label: "Date", required: true, type: "date" },
  { key: "item", label: "Item/Description", required: true, type: "string" },
  { key: "quantity", label: "Quantity", required: true, type: "number" },
  { key: "price", label: "Unit Price", required: true, type: "number" },
  { key: "amount", label: "Total Amount", required: true, type: "number" },
  { key: "paymentMethod", label: "Payment Method", required: false, type: "string" },
  { key: "notes", label: "Notes", required: false, type: "string" },
];

// Common column name variations for auto-detection
const columnVariations: Record<string, string[]> = {
  date: ["date", "transaction date", "trans date", "purchase date", "sale date", "invoice date"],
  vendor: ["vendor", "supplier", "merchant", "company", "store", "payee"],
  category: ["category", "type", "expense type", "income type", "classification"],
  item: ["item", "product", "description", "line item", "name", "service"],
  unitCost: ["unit cost", "price", "unit price", "cost", "rate", "amount per unit"],
  quantity: ["quantity", "qty", "count", "units", "number"],
  notes: ["notes", "description", "memo", "comments", "remarks"],
  price: ["price", "unit price", "rate", "cost per unit", "unit cost"],
  amount: ["amount", "total", "grand total", "sum", "value", "total amount"],
  paymentMethod: ["payment method", "payment type", "method", "paid by", "payment"],
};

/**
 * Parse a CSV file and return structured data
 */
export function parseCSV(file: File): Promise<ParsedCSVResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (results) => {
        resolve({
          headers: results.meta.fields || [],
          data: results.data,
          errors: results.errors,
          rowCount: results.data.length,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Auto-detect column mappings based on header names
 */
export function detectColumnMappings(
  csvHeaders: string[],
  expectedFields: (ExpenseField | IncomeField)[]
): Record<string, string> {
  const mappings: Record<string, string> = {};
  const normalizedHeaders = csvHeaders.map((h) => h.toLowerCase().trim());

  for (const field of expectedFields) {
    const variations = columnVariations[field.key] || [field.key.toLowerCase()];

    // Try to find a matching header
    for (const variation of variations) {
      const matchIndex = normalizedHeaders.findIndex(
        (h) => h === variation || h.includes(variation) || variation.includes(h)
      );

      if (matchIndex !== -1) {
        mappings[field.key] = csvHeaders[matchIndex];
        break;
      }
    }

    // If no match found, leave it empty
    if (!mappings[field.key]) {
      mappings[field.key] = "";
    }
  }

  return mappings;
}

/**
 * Transform a row using the provided mappings
 */
export function transformRow(
  row: Record<string, string>,
  mappings: Record<string, string>,
  manualValues: Record<string, string> = {}
): Record<string, unknown> {
  const transformed: Record<string, unknown> = {};

  for (const [fieldKey, csvColumn] of Object.entries(mappings)) {
    if (csvColumn === "__MANUAL__" && manualValues[fieldKey]) {
      transformed[fieldKey] = manualValues[fieldKey];
    } else if (csvColumn && row[csvColumn] !== undefined) {
      transformed[fieldKey] = row[csvColumn];
    } else {
      transformed[fieldKey] = manualValues[fieldKey] || "";
    }
  }

  return transformed;
}

/**
 * Transform multiple rows
 */
export function transformRows(
  rows: Record<string, string>[],
  mappings: Record<string, string>,
  manualValues: Record<string, string> = {}
): Record<string, unknown>[] {
  return rows.map((row) => transformRow(row, mappings, manualValues));
}

/**
 * Validate transformed data for expense import
 */
export function validateExpenseData(
  data: Record<string, unknown>[]
): { valid: boolean; errors: { row: number; field: string; message: string }[] } {
  const errors: { row: number; field: string; message: string }[] = [];

  data.forEach((row, index) => {
    // Check required fields
    for (const field of expenseFields) {
      if (field.required && !row[field.key]) {
        errors.push({
          row: index + 1,
          field: field.key,
          message: `${field.label} is required`,
        });
      }
    }

    // Validate date format
    if (row.date) {
      const dateValue = new Date(row.date as string);
      if (isNaN(dateValue.getTime())) {
        errors.push({
          row: index + 1,
          field: "date",
          message: "Invalid date format",
        });
      }
    }

    // Validate numeric fields
    const numericFields = ["unitCost", "quantity"];
    for (const field of numericFields) {
      if (row[field]) {
        const cleanValue = String(row[field]).replace(/[$,]/g, "");
        const numValue = parseFloat(cleanValue);
        if (isNaN(numValue)) {
          errors.push({
            row: index + 1,
            field,
            message: `${field} must be a valid number`,
          });
        }
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validate transformed data for income import
 */
export function validateIncomeData(
  data: Record<string, unknown>[]
): { valid: boolean; errors: { row: number; field: string; message: string }[] } {
  const errors: { row: number; field: string; message: string }[] = [];

  data.forEach((row, index) => {
    // Check required fields
    for (const field of incomeFields) {
      if (field.required && !row[field.key]) {
        errors.push({
          row: index + 1,
          field: field.key,
          message: `${field.label} is required`,
        });
      }
    }

    // Validate date format
    if (row.date) {
      const dateValue = new Date(row.date as string);
      if (isNaN(dateValue.getTime())) {
        errors.push({
          row: index + 1,
          field: "date",
          message: "Invalid date format",
        });
      }
    }

    // Validate numeric fields
    const numericFields = ["quantity", "price", "amount"];
    for (const field of numericFields) {
      if (row[field]) {
        const cleanValue = String(row[field]).replace(/[$,]/g, "");
        const numValue = parseFloat(cleanValue);
        if (isNaN(numValue)) {
          errors.push({
            row: index + 1,
            field,
            message: `${field} must be a valid number`,
          });
        }
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Parse expense row data for database insertion
 */
export function parseExpenseRow(row: Record<string, unknown>): {
  date: string;
  vendor: string;
  category: string;
  item: string;
  unitCost: number;
  quantity: number;
  lineTotal: number;
  notes: string;
} {
  const unitCost = parseFloat(String(row.unitCost || "0").replace(/[$,]/g, "")) || 0;
  const quantity = parseFloat(String(row.quantity || "1")) || 1;

  return {
    date: String(row.date || ""),
    vendor: String(row.vendor || ""),
    category: String(row.category || ""),
    item: String(row.item || ""),
    unitCost,
    quantity,
    lineTotal: unitCost * quantity,
    notes: String(row.notes || ""),
  };
}

/**
 * Parse income row data for database insertion
 */
export function parseIncomeRow(row: Record<string, unknown>): {
  date: string;
  item: string;
  quantity: number;
  price: number;
  amount: number;
  paymentMethod: string;
  notes: string;
} {
  const quantity = parseFloat(String(row.quantity || "1").replace(/[$,]/g, "")) || 1;
  const price = parseFloat(String(row.price || "0").replace(/[$,]/g, "")) || 0;
  let amount = parseFloat(String(row.amount || "0").replace(/[$,]/g, "")) || 0;

  // If amount is 0 but we have quantity and price, calculate it
  if (amount === 0 && quantity > 0 && price > 0) {
    amount = quantity * price;
  }

  return {
    date: String(row.date || ""),
    item: String(row.item || ""),
    quantity,
    price,
    amount,
    paymentMethod: String(row.paymentMethod || ""),
    notes: String(row.notes || ""),
  };
}

/**
 * Group expense line items by date and vendor for creating expenses
 */
export function groupExpensesByVendorDate(
  rows: ReturnType<typeof parseExpenseRow>[]
): Map<string, ReturnType<typeof parseExpenseRow>[]> {
  const grouped = new Map<string, ReturnType<typeof parseExpenseRow>[]>();

  for (const row of rows) {
    const key = `${row.date}_${row.vendor}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  }

  return grouped;
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers?: string[]
): void {
  const csv = Papa.unparse(data, {
    columns: headers,
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create a sample CSV template for expenses
 */
export function generateExpenseTemplate(): string {
  return Papa.unparse({
    fields: ["Date", "Vendor", "Category", "Item", "Unit Cost", "Quantity", "Notes"],
    data: [
      ["2024-01-15", "Farm Supply Co", "Seeds", "Corn Seeds", "25.00", "10", "Spring planting"],
      ["2024-01-16", "Equipment Rental", "Equipment", "Tractor Rental", "150.00", "1", "Weekly rental"],
    ],
  });
}

/**
 * Create a sample CSV template for income
 */
export function generateIncomeTemplate(): string {
  return Papa.unparse({
    fields: ["Date", "Item", "Quantity", "Price", "Amount", "Payment Method", "Notes"],
    data: [
      ["2024-01-20", "Fresh Eggs", "100", "4.50", "450.00", "Cash", "Farmers market sale"],
      ["2024-01-22", "Grass-fed Beef", "50", "24.00", "1200.00", "Check", "Wholesale to restaurant"],
    ],
  });
}

/**
 * Download template CSV
 */
export function downloadTemplate(type: "expenses" | "income"): void {
  const template = type === "expenses" ? generateExpenseTemplate() : generateIncomeTemplate();
  const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${type}-import-template.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
