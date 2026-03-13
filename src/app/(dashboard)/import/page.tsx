import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Download,
  FileSpreadsheet,
  Receipt,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { downloadTemplate } from "@/lib/csv-service";

export const metadata: Metadata = {
  title: "Import Data",
  description: "Import expenses and income from CSV files",
};

const importOptions = [
  {
    title: "Import Expenses",
    description: "Import expense records from a CSV file with vendor, category, items, and costs.",
    href: "/import/expenses",
    icon: Receipt,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    templateType: "expenses" as const,
  },
  {
    title: "Import Income",
    description: "Import income records from a CSV file with source, category, and amounts.",
    href: "/import/income",
    icon: DollarSign,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    templateType: "income" as const,
  },
];

// Mock recent imports - in production this would come from the server
const recentImports = [
  {
    id: "1",
    type: "expenses",
    filename: "farm_expenses_2024.csv",
    date: "2024-01-15",
    totalRows: 150,
    successfulRows: 148,
    failedRows: 2,
    status: "partial",
  },
  {
    id: "2",
    type: "income",
    filename: "sales_q1_2024.csv",
    date: "2024-01-10",
    totalRows: 45,
    successfulRows: 45,
    failedRows: 0,
    status: "complete",
  },
];

export default function ImportPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground">
          Import your expenses and income from CSV files to quickly add bulk records.
        </p>
      </div>

      {/* Import Options */}
      <div className="grid gap-6 md:grid-cols-2">
        {importOptions.map((option) => (
          <Card key={option.href} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`rounded-lg p-3 ${option.bgColor}`}>
                  <option.icon className={`h-6 w-6 ${option.color}`} />
                </div>
              </div>
              <CardTitle className="mt-4">{option.title}</CardTitle>
              <CardDescription>{option.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              <Button asChild className="w-full">
                <Link href={option.href}>
                  Start Import
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => downloadTemplate(option.templateType)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileSpreadsheet className="mr-2 h-5 w-5" />
            How to Import
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 text-sm">
            <li className="flex items-start">
              <span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>
              <span>
                <strong>Prepare your CSV file</strong> - Download a template or format
                your existing spreadsheet with the required columns.
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              <span>
                <strong>Upload and map columns</strong> - Upload your file and map your
                CSV columns to the system fields. The importer will try to auto-detect
                common column names.
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                3
              </span>
              <span>
                <strong>Review and import</strong> - Preview your data before importing.
                Remove any rows with errors or fix the mappings if needed.
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Recent Imports */}
      {recentImports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Recent Imports
            </CardTitle>
            <CardDescription>
              Your recent import history for this farm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentImports.map((importRecord) => (
                <div
                  key={importRecord.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`rounded-lg p-2 ${
                        importRecord.type === "expenses"
                          ? "bg-red-100 dark:bg-red-900/20"
                          : "bg-green-100 dark:bg-green-900/20"
                      }`}
                    >
                      {importRecord.type === "expenses" ? (
                        <Receipt className="h-5 w-5 text-red-600 dark:text-red-400" />
                      ) : (
                        <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{importRecord.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {importRecord.date} &middot;{" "}
                        {importRecord.successfulRows} of {importRecord.totalRows} rows
                        imported
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {importRecord.status === "complete" ? (
                      <Badge
                        variant="outline"
                        className="border-green-500 text-green-600"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500 text-amber-600"
                      >
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Partial
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
