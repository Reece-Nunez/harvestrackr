import { format } from "date-fns";
import jsPDF from "jspdf";
import "jspdf-autotable";
import type { DateRange } from "@/actions/analytics";

// Extend jsPDF type for autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  dateRange?: DateRange;
  sections: ReportSection[];
  summary?: Record<string, number | string>;
}

export interface ReportSection {
  title: string;
  type: "table" | "summary" | "text";
  data: any[];
  columns?: { header: string; key: string; format?: "currency" | "date" | "number" | "text" }[];
}

export type ReportType =
  | "expense"
  | "income"
  | "profit_loss"
  | "inventory"
  | "invoice"
  | "tax";

// Format helpers
function formatValue(value: any, formatType?: string): string {
  if (value === null || value === undefined) return "-";

  switch (formatType) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    case "date":
      return format(new Date(value), "MMM dd, yyyy");
    case "number":
      return new Intl.NumberFormat("en-US").format(value);
    default:
      return String(value);
  }
}

// Generate Expense Report
export async function generateExpenseReport(
  expenses: any[],
  dateRange: DateRange,
  farmName: string
): Promise<ReportData> {
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.grand_total || 0), 0);
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;

  // Group by category
  const categoryTotals = new Map<string, number>();
  expenses.forEach((expense) => {
    if (expense.expense_line_items && expense.expense_line_items.length > 0) {
      expense.expense_line_items.forEach((item: any) => {
        const current = categoryTotals.get(item.category) || 0;
        categoryTotals.set(item.category, current + (item.line_total || 0));
      });
    } else {
      const current = categoryTotals.get("Uncategorized") || 0;
      categoryTotals.set("Uncategorized", current + (expense.grand_total || 0));
    }
  });

  const categoryData = Array.from(categoryTotals.entries()).map(([category, amount]) => ({
    category,
    amount,
    percentage: totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) + "%" : "0%",
  }));

  return {
    title: "Expense Report",
    subtitle: `${farmName}`,
    generatedAt: new Date(),
    dateRange,
    sections: [
      {
        title: "Expense Summary by Category",
        type: "table",
        data: categoryData.sort((a, b) => b.amount - a.amount),
        columns: [
          { header: "Category", key: "category" },
          { header: "Amount", key: "amount", format: "currency" },
          { header: "% of Total", key: "percentage" },
        ],
      },
      {
        title: "Expense Details",
        type: "table",
        data: expenses.map((e) => ({
          date: e.date,
          vendor: e.vendor || "N/A",
          description: e.description || "N/A",
          amount: e.grand_total,
        })),
        columns: [
          { header: "Date", key: "date", format: "date" },
          { header: "Vendor", key: "vendor" },
          { header: "Description", key: "description" },
          { header: "Amount", key: "amount", format: "currency" },
        ],
      },
    ],
    summary: {
      "Total Expenses": totalExpenses,
      "Number of Transactions": expenses.length,
      "Average Expense": avgExpense,
    },
  };
}

// Generate Income Report
export async function generateIncomeReport(
  incomeData: any[],
  dateRange: DateRange,
  farmName: string
): Promise<ReportData> {
  const totalIncome = incomeData.reduce((sum, i) => sum + (i.amount || 0), 0);
  const avgIncome = incomeData.length > 0 ? totalIncome / incomeData.length : 0;

  // Group by item
  const itemTotals = new Map<string, { amount: number; quantity: number }>();
  incomeData.forEach((income) => {
    const current = itemTotals.get(income.item) || { amount: 0, quantity: 0 };
    current.amount += income.amount || 0;
    current.quantity += income.quantity || 0;
    itemTotals.set(income.item, current);
  });

  const itemData = Array.from(itemTotals.entries()).map(([item, data]) => ({
    item,
    quantity: data.quantity,
    amount: data.amount,
    percentage: totalIncome > 0 ? ((data.amount / totalIncome) * 100).toFixed(1) + "%" : "0%",
  }));

  return {
    title: "Income Report",
    subtitle: `${farmName}`,
    generatedAt: new Date(),
    dateRange,
    sections: [
      {
        title: "Income by Item Type",
        type: "table",
        data: itemData.sort((a, b) => b.amount - a.amount),
        columns: [
          { header: "Item", key: "item" },
          { header: "Quantity", key: "quantity", format: "number" },
          { header: "Amount", key: "amount", format: "currency" },
          { header: "% of Total", key: "percentage" },
        ],
      },
      {
        title: "Income Details",
        type: "table",
        data: incomeData.map((i) => ({
          date: i.date,
          item: i.item,
          quantity: i.quantity,
          price: i.price,
          amount: i.amount,
        })),
        columns: [
          { header: "Date", key: "date", format: "date" },
          { header: "Item", key: "item" },
          { header: "Qty", key: "quantity", format: "number" },
          { header: "Unit Price", key: "price", format: "currency" },
          { header: "Total", key: "amount", format: "currency" },
        ],
      },
    ],
    summary: {
      "Total Income": totalIncome,
      "Number of Sales": incomeData.length,
      "Average Sale": avgIncome,
    },
  };
}

// Generate Profit & Loss Report
export async function generateProfitLossReport(
  incomeData: any[],
  expenseData: any[],
  dateRange: DateRange,
  farmName: string
): Promise<ReportData> {
  const totalIncome = incomeData.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalExpenses = expenseData.reduce((sum, e) => sum + (e.grand_total || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  // Group income by item
  const incomeByItem = new Map<string, number>();
  incomeData.forEach((income) => {
    const current = incomeByItem.get(income.item) || 0;
    incomeByItem.set(income.item, current + (income.amount || 0));
  });

  // Group expenses by category
  const expensesByCategory = new Map<string, number>();
  expenseData.forEach((expense) => {
    if (expense.expense_line_items && expense.expense_line_items.length > 0) {
      expense.expense_line_items.forEach((item: any) => {
        const current = expensesByCategory.get(item.category) || 0;
        expensesByCategory.set(item.category, current + (item.line_total || 0));
      });
    } else {
      const current = expensesByCategory.get("Uncategorized") || 0;
      expensesByCategory.set("Uncategorized", current + (expense.grand_total || 0));
    }
  });

  return {
    title: "Profit & Loss Statement",
    subtitle: `${farmName}`,
    generatedAt: new Date(),
    dateRange,
    sections: [
      {
        title: "Revenue",
        type: "table",
        data: Array.from(incomeByItem.entries()).map(([item, amount]) => ({
          description: item,
          amount,
        })),
        columns: [
          { header: "Description", key: "description" },
          { header: "Amount", key: "amount", format: "currency" },
        ],
      },
      {
        title: "Expenses",
        type: "table",
        data: Array.from(expensesByCategory.entries()).map(([category, amount]) => ({
          description: category,
          amount,
        })),
        columns: [
          { header: "Description", key: "description" },
          { header: "Amount", key: "amount", format: "currency" },
        ],
      },
    ],
    summary: {
      "Total Revenue": totalIncome,
      "Total Expenses": totalExpenses,
      "Net Profit/Loss": netProfit,
      "Profit Margin": profitMargin.toFixed(1) + "%",
    },
  };
}

// Generate Inventory Report
export async function generateInventoryReport(
  inventoryItems: any[],
  livestock: any[],
  farmName: string
): Promise<ReportData> {
  const totalInventoryValue = inventoryItems.reduce(
    (sum, item) => sum + (item.quantity * (item.cost || 0)),
    0
  );
  const totalLivestockValue = livestock.reduce(
    (sum, animal) => sum + (animal.acquisition_cost || 0),
    0
  );

  return {
    title: "Inventory Report",
    subtitle: `${farmName}`,
    generatedAt: new Date(),
    sections: [
      {
        title: "Inventory Items",
        type: "table",
        data: inventoryItems.map((item) => ({
          name: item.name,
          type: item.type,
          quantity: item.quantity,
          unit: item.unit || "units",
          cost: item.cost || 0,
          value: item.quantity * (item.cost || 0),
          location: item.location || "N/A",
        })),
        columns: [
          { header: "Item", key: "name" },
          { header: "Type", key: "type" },
          { header: "Qty", key: "quantity", format: "number" },
          { header: "Unit", key: "unit" },
          { header: "Unit Cost", key: "cost", format: "currency" },
          { header: "Value", key: "value", format: "currency" },
        ],
      },
      {
        title: "Livestock",
        type: "table",
        data: livestock.map((animal) => ({
          name: animal.name,
          species: animal.species,
          breed: animal.breed || "N/A",
          status: animal.status,
          acquisitionCost: animal.acquisition_cost || 0,
        })),
        columns: [
          { header: "Name", key: "name" },
          { header: "Species", key: "species" },
          { header: "Breed", key: "breed" },
          { header: "Status", key: "status" },
          { header: "Value", key: "acquisitionCost", format: "currency" },
        ],
      },
    ],
    summary: {
      "Total Inventory Items": inventoryItems.length,
      "Inventory Value": totalInventoryValue,
      "Total Livestock": livestock.length,
      "Livestock Value": totalLivestockValue,
      "Total Assets Value": totalInventoryValue + totalLivestockValue,
    },
  };
}

// Generate Invoice Summary
export async function generateInvoiceSummary(
  invoices: any[],
  dateRange: DateRange,
  farmName: string
): Promise<ReportData> {
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const paidInvoices = invoices.filter((inv) => inv.status === "PAID");
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const overdueInvoices = invoices.filter((inv) => inv.status === "OVERDUE");
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  // Group by status
  const statusCounts = new Map<string, { count: number; amount: number }>();
  invoices.forEach((invoice) => {
    const current = statusCounts.get(invoice.status) || { count: 0, amount: 0 };
    current.count += 1;
    current.amount += invoice.total || 0;
    statusCounts.set(invoice.status, current);
  });

  return {
    title: "Invoice Summary",
    subtitle: `${farmName}`,
    generatedAt: new Date(),
    dateRange,
    sections: [
      {
        title: "Invoices by Status",
        type: "table",
        data: Array.from(statusCounts.entries()).map(([status, data]) => ({
          status,
          count: data.count,
          amount: data.amount,
        })),
        columns: [
          { header: "Status", key: "status" },
          { header: "Count", key: "count", format: "number" },
          { header: "Amount", key: "amount", format: "currency" },
        ],
      },
      {
        title: "Invoice Details",
        type: "table",
        data: invoices.map((inv) => ({
          invoiceNumber: inv.invoice_number,
          customer: inv.customers?.name || "N/A",
          date: inv.date,
          dueDate: inv.due_date,
          status: inv.status,
          total: inv.total,
        })),
        columns: [
          { header: "Invoice #", key: "invoiceNumber" },
          { header: "Customer", key: "customer" },
          { header: "Date", key: "date", format: "date" },
          { header: "Due Date", key: "dueDate", format: "date" },
          { header: "Status", key: "status" },
          { header: "Total", key: "total", format: "currency" },
        ],
      },
    ],
    summary: {
      "Total Invoiced": totalInvoiced,
      "Total Paid": totalPaid,
      "Total Outstanding": totalInvoiced - totalPaid,
      "Overdue Amount": totalOverdue,
      "Number of Invoices": invoices.length,
    },
  };
}

// Generate Tax Summary
export async function generateTaxSummary(
  incomeData: any[],
  expenseData: any[],
  year: number,
  farmName: string
): Promise<ReportData> {
  const totalIncome = incomeData.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalExpenses = expenseData.reduce((sum, e) => sum + (e.grand_total || 0), 0);
  const netIncome = totalIncome - totalExpenses;

  // Group expenses by category for deductions
  const deductionsByCategory = new Map<string, number>();
  expenseData.forEach((expense) => {
    if (expense.expense_line_items && expense.expense_line_items.length > 0) {
      expense.expense_line_items.forEach((item: any) => {
        const current = deductionsByCategory.get(item.category) || 0;
        deductionsByCategory.set(item.category, current + (item.line_total || 0));
      });
    } else {
      const current = deductionsByCategory.get("Other Business Expenses") || 0;
      deductionsByCategory.set("Other Business Expenses", current + (expense.grand_total || 0));
    }
  });

  // Quarterly breakdown
  const quarterlyData = [1, 2, 3, 4].map((quarter) => {
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;

    const quarterIncome = incomeData
      .filter((i) => {
        const month = new Date(i.date).getMonth();
        return month >= startMonth && month <= endMonth;
      })
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const quarterExpenses = expenseData
      .filter((e) => {
        const month = new Date(e.date).getMonth();
        return month >= startMonth && month <= endMonth;
      })
      .reduce((sum, e) => sum + (e.grand_total || 0), 0);

    return {
      quarter: `Q${quarter} ${year}`,
      income: quarterIncome,
      expenses: quarterExpenses,
      netIncome: quarterIncome - quarterExpenses,
    };
  });

  return {
    title: "Tax Summary",
    subtitle: `${farmName} - Tax Year ${year}`,
    generatedAt: new Date(),
    sections: [
      {
        title: "Quarterly Summary",
        type: "table",
        data: quarterlyData,
        columns: [
          { header: "Quarter", key: "quarter" },
          { header: "Income", key: "income", format: "currency" },
          { header: "Expenses", key: "expenses", format: "currency" },
          { header: "Net Income", key: "netIncome", format: "currency" },
        ],
      },
      {
        title: "Deductible Expenses by Category",
        type: "table",
        data: Array.from(deductionsByCategory.entries())
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount),
        columns: [
          { header: "Category", key: "category" },
          { header: "Amount", key: "amount", format: "currency" },
        ],
      },
    ],
    summary: {
      "Gross Income": totalIncome,
      "Total Deductions": totalExpenses,
      "Net Income": netIncome,
      "Tax Year": year,
    },
  };
}

// Export to PDF
export function exportToPDF(reportData: ReportData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let currentY = margin;

  // Header
  doc.setFillColor(34, 197, 94); // green-500
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(reportData.title, margin, 25);

  if (reportData.subtitle) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(reportData.subtitle, margin, 35);
  }

  currentY = 55;

  // Date range and generation info
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  if (reportData.dateRange) {
    doc.text(
      `Period: ${format(new Date(reportData.dateRange.startDate), "MMM dd, yyyy")} - ${format(
        new Date(reportData.dateRange.endDate),
        "MMM dd, yyyy"
      )}`,
      margin,
      currentY
    );
    currentY += 10;
  }

  doc.text(`Generated: ${format(reportData.generatedAt, "MMMM dd, yyyy HH:mm")}`, margin, currentY);
  currentY += 15;

  // Summary Section
  if (reportData.summary) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", margin, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    Object.entries(reportData.summary).forEach(([key, value]) => {
      const displayValue = typeof value === "number" && key.toLowerCase().includes("margin")
        ? value
        : typeof value === "number"
        ? formatValue(value, "currency")
        : String(value);

      doc.text(`${key}: ${displayValue}`, margin, currentY);
      currentY += 7;
    });

    currentY += 10;
  }

  // Sections
  reportData.sections.forEach((section) => {
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = margin;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, margin, currentY);
    currentY += 8;

    if (section.type === "table" && section.columns && section.data.length > 0) {
      const tableData = section.data.map((row) =>
        section.columns!.map((col) => formatValue(row[col.key], col.format))
      );

      doc.autoTable({
        startY: currentY,
        head: [section.columns.map((col) => col.header)],
        body: tableData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      currentY = doc.lastAutoTable.finalY + 15;
    } else if (section.data.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("No data available", margin, currentY);
      currentY += 15;
    }
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
    doc.text("Generated by HarvesTrackr", margin, doc.internal.pageSize.height - 10);
  }

  return doc;
}

// Export to CSV
export function exportToCSV(reportData: ReportData): string {
  const lines: string[] = [];

  // Header
  lines.push(reportData.title);
  if (reportData.subtitle) lines.push(reportData.subtitle);
  if (reportData.dateRange) {
    lines.push(
      `Period: ${format(new Date(reportData.dateRange.startDate), "MMM dd, yyyy")} - ${format(
        new Date(reportData.dateRange.endDate),
        "MMM dd, yyyy"
      )}`
    );
  }
  lines.push(`Generated: ${format(reportData.generatedAt, "MMMM dd, yyyy HH:mm")}`);
  lines.push("");

  // Summary
  if (reportData.summary) {
    lines.push("Summary");
    Object.entries(reportData.summary).forEach(([key, value]) => {
      const displayValue =
        typeof value === "number" && !key.toLowerCase().includes("margin")
          ? formatValue(value, "currency")
          : String(value);
      lines.push(`${key},${displayValue}`);
    });
    lines.push("");
  }

  // Sections
  reportData.sections.forEach((section) => {
    lines.push(section.title);

    if (section.type === "table" && section.columns && section.data.length > 0) {
      // Header row
      lines.push(section.columns.map((col) => `"${col.header}"`).join(","));

      // Data rows
      section.data.forEach((row) => {
        const values = section.columns!.map((col) => {
          const value = formatValue(row[col.key], col.format);
          // Escape quotes and wrap in quotes if contains comma
          if (value.includes(",") || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        lines.push(values.join(","));
      });
    } else if (section.data.length === 0) {
      lines.push("No data available");
    }

    lines.push("");
  });

  return lines.join("\n");
}

// Download helper
export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
