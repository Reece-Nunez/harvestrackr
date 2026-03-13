"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import {
  FileText,
  Download,
  FileSpreadsheet,
  Loader2,
  Receipt,
  DollarSign,
  TrendingUp,
  Package,
  FileCheck,
  Calculator,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  generateExpenseReport,
  generateIncomeReport,
  generateProfitLossReport,
  generateInventoryReport,
  generateInvoiceSummary,
  generateTaxSummary,
  exportToPDF,
  exportToCSV,
  downloadFile,
  type ReportData,
  type ReportType,
} from "@/lib/report-service";

interface ReportsGeneratorProps {
  farmId: string;
  farmName: string;
}

const reportTypes = [
  {
    id: "expense" as ReportType,
    name: "Expense Report",
    description: "Detailed breakdown of all expenses by category",
    icon: Receipt,
  },
  {
    id: "income" as ReportType,
    name: "Income Report",
    description: "Summary of all income sources and sales",
    icon: DollarSign,
  },
  {
    id: "profit_loss" as ReportType,
    name: "Profit & Loss Statement",
    description: "Revenue vs expenses with net profit calculation",
    icon: TrendingUp,
  },
  {
    id: "inventory" as ReportType,
    name: "Inventory Report",
    description: "Current inventory items and livestock",
    icon: Package,
  },
  {
    id: "invoice" as ReportType,
    name: "Invoice Summary",
    description: "Overview of all invoices and payment status",
    icon: FileCheck,
  },
  {
    id: "tax" as ReportType,
    name: "Tax Summary",
    description: "Quarterly breakdown for tax preparation",
    icon: Calculator,
  },
];

export function ReportsGenerator({ farmId, farmName }: ReportsGeneratorProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>("expense");
  const [startDate, setStartDate] = useState<Date>(
    new Date(new Date().getFullYear(), 0, 1) // Start of year
  );
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [taxYear, setTaxYear] = useState<string>(new Date().getFullYear().toString());
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  const selectedReportInfo = reportTypes.find((r) => r.id === selectedReport);

  const generateReport = async () => {
    startTransition(async () => {
      try {
        const supabase = createClient();
        const dateRange = {
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
        };

        let data: ReportData;

        switch (selectedReport) {
          case "expense": {
            const { data: expenses } = await supabase
              .from("expenses")
              .select("*, expense_line_items(*)")
              .eq("farm_id", farmId)
              .gte("date", dateRange.startDate)
              .lte("date", dateRange.endDate)
              .order("date", { ascending: false });

            data = await generateExpenseReport(expenses || [], dateRange, farmName);
            break;
          }

          case "income": {
            const { data: income } = await supabase
              .from("income")
              .select("*")
              .eq("farm_id", farmId)
              .gte("date", dateRange.startDate)
              .lte("date", dateRange.endDate)
              .order("date", { ascending: false });

            data = await generateIncomeReport(income || [], dateRange, farmName);
            break;
          }

          case "profit_loss": {
            const [{ data: income }, { data: expenses }] = await Promise.all([
              supabase
                .from("income")
                .select("*")
                .eq("farm_id", farmId)
                .gte("date", dateRange.startDate)
                .lte("date", dateRange.endDate),
              supabase
                .from("expenses")
                .select("*, expense_line_items(*)")
                .eq("farm_id", farmId)
                .gte("date", dateRange.startDate)
                .lte("date", dateRange.endDate),
            ]);

            data = await generateProfitLossReport(
              income || [],
              expenses || [],
              dateRange,
              farmName
            );
            break;
          }

          case "inventory": {
            const [{ data: inventoryItems }, { data: livestock }] = await Promise.all([
              supabase.from("inventory_items").select("*").eq("farm_id", farmId),
              supabase
                .from("livestock")
                .select("*")
                .eq("farm_id", farmId)
                .in("status", ["ACTIVE", "QUARANTINED"]),
            ]);

            data = await generateInventoryReport(inventoryItems || [], livestock || [], farmName);
            break;
          }

          case "invoice": {
            const { data: invoices } = await supabase
              .from("invoices")
              .select("*, customers(name)")
              .eq("farm_id", farmId)
              .gte("date", dateRange.startDate)
              .lte("date", dateRange.endDate)
              .order("date", { ascending: false });

            data = await generateInvoiceSummary(invoices || [], dateRange, farmName);
            break;
          }

          case "tax": {
            const year = parseInt(taxYear);
            const taxDateRange = {
              startDate: `${year}-01-01`,
              endDate: `${year}-12-31`,
            };

            const [{ data: income }, { data: expenses }] = await Promise.all([
              supabase
                .from("income")
                .select("*")
                .eq("farm_id", farmId)
                .gte("date", taxDateRange.startDate)
                .lte("date", taxDateRange.endDate),
              supabase
                .from("expenses")
                .select("*, expense_line_items(*)")
                .eq("farm_id", farmId)
                .gte("date", taxDateRange.startDate)
                .lte("date", taxDateRange.endDate),
            ]);

            data = await generateTaxSummary(income || [], expenses || [], year, farmName);
            break;
          }

          default:
            throw new Error("Invalid report type");
        }

        setReportData(data);
      } catch (error) {
        console.error("Failed to generate report:", error);
      }
    });
  };

  const handleExportPDF = async () => {
    if (!reportData) return;

    setIsExporting(true);
    try {
      const pdf = exportToPDF(reportData);
      const blob = pdf.output("blob");
      const filename = `${reportData.title.toLowerCase().replace(/\s+/g, "-")}-${format(
        new Date(),
        "yyyy-MM-dd"
      )}.pdf`;
      downloadFile(blob, filename, "application/pdf");
    } catch (error) {
      console.error("Failed to export PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    setIsExporting(true);
    try {
      const csv = exportToCSV(reportData);
      const filename = `${reportData.title.toLowerCase().replace(/\s+/g, "-")}-${format(
        new Date(),
        "yyyy-MM-dd"
      )}.csv`;
      downloadFile(csv, filename, "text/csv");
    } catch (error) {
      console.error("Failed to export CSV:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Report Selection */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Type</CardTitle>
            <CardDescription>Select the type of report to generate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => {
                  setSelectedReport(report.id);
                  setReportData(null);
                }}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  selectedReport === report.id
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-accent"
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    selectedReport === report.id
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <report.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">{report.name}</p>
                  <p className="text-xs text-muted-foreground">{report.description}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
            <CardDescription>
              {selectedReport === "tax"
                ? "Select the tax year"
                : "Select the period for the report"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedReport === "tax" ? (
              <Select value={taxYear} onValueChange={setTaxYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : selectedReport === "inventory" ? (
              <p className="text-sm text-muted-foreground">
                Inventory reports show current stock levels
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <DatePicker date={startDate} onDateChange={(d) => d && setStartDate(d)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <DatePicker date={endDate} onDateChange={(d) => d && setEndDate(d)} />
                </div>
              </>
            )}

            <Button
              className="w-full"
              onClick={generateReport}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Report Preview */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedReportInfo?.name || "Report"} Preview
                </CardTitle>
                <CardDescription>
                  {reportData
                    ? `Generated ${format(reportData.generatedAt, "MMM dd, yyyy HH:mm")}`
                    : "Generate a report to see the preview"}
                </CardDescription>
              </div>
              {reportData && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={isExporting}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Generating report...</p>
              </div>
            ) : reportData ? (
              <ReportPreview data={reportData} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">No Report Generated</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Select a report type and date range, then click "Generate Report" to see the
                  preview.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Report Preview Component
function ReportPreview({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold">{data.title}</h2>
        {data.subtitle && <p className="text-muted-foreground">{data.subtitle}</p>}
        {data.dateRange && (
          <p className="text-sm text-muted-foreground mt-1">
            Period: {formatDate(data.dateRange.startDate)} - {formatDate(data.dateRange.endDate)}
          </p>
        )}
      </div>

      {/* Summary */}
      {data.summary && (
        <div>
          <h3 className="font-semibold mb-3">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(data.summary).map(([key, value]) => (
              <div key={key} className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{key}</p>
                <p className="text-lg font-semibold">
                  {typeof value === "number" && !key.toLowerCase().includes("margin")
                    ? formatCurrency(value)
                    : String(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      <Tabs defaultValue={data.sections[0]?.title} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          {data.sections.map((section) => (
            <TabsTrigger key={section.title} value={section.title} className="text-sm">
              {section.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {data.sections.map((section) => (
          <TabsContent key={section.title} value={section.title}>
            {section.data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data available for this section
              </div>
            ) : section.type === "table" && section.columns ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {section.columns.map((col) => (
                        <th
                          key={col.key}
                          className={`py-3 px-4 text-left font-medium ${
                            col.format === "currency" || col.format === "number"
                              ? "text-right"
                              : ""
                          }`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.data.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b hover:bg-muted/50">
                        {section.columns!.map((col) => (
                          <td
                            key={col.key}
                            className={`py-3 px-4 ${
                              col.format === "currency" || col.format === "number"
                                ? "text-right font-mono"
                                : ""
                            }`}
                          >
                            {col.format === "currency"
                              ? formatCurrency(row[col.key] || 0)
                              : col.format === "date"
                              ? row[col.key]
                                ? formatDate(row[col.key])
                                : "-"
                              : row[col.key] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
