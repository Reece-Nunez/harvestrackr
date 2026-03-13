"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CSVDropzone } from "@/components/import/csv-dropzone";
import { ColumnMapper } from "@/components/import/column-mapper";
import { ImportPreview } from "@/components/import/import-preview";
import { useCSVImport } from "@/hooks/use-csv-import";
import { useFarm } from "@/components/providers/farm-provider";
import { importIncome, logImport } from "@/actions/import";
import { downloadTemplate } from "@/lib/csv-service";
import { toast } from "@/components/ui/toast";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";

export default function ImportIncomePage() {
  const router = useRouter();
  const { currentFarm } = useFarm();

  const {
    state,
    fields,
    setFile,
    setMapping,
    setManualValue,
    proceedToPreview,
    goBackToMapping,
    goBackToUpload,
    startImport,
    reset,
    removeRow,
  } = useCSVImport({
    type: "income",
    onImportComplete: async (results) => {
      if (currentFarm && results && state.file) {
        await logImport(
          currentFarm.id,
          "income",
          state.file.name,
          results.total,
          results.successful,
          results.failed
        );
      }
    },
  });

  const handleImport = async () => {
    if (!currentFarm) {
      toast.error("No farm selected");
      return;
    }

    await startImport(async (data) => {
      const result = await importIncome(currentFarm.id, data);
      return result;
    });
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: "upload", label: "Upload" },
      { key: "mapping", label: "Map Columns" },
      { key: "preview", label: "Preview" },
      { key: "importing", label: "Import" },
    ];

    const currentStepIndex = steps.findIndex((s) => s.key === state.step);

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className="flex flex-1 items-center"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                    index <= currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="mt-2 text-xs text-muted-foreground">
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-2 h-1 flex-1 rounded ${
                    index < currentStepIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (state.step) {
      case "upload":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                Upload CSV File
              </CardTitle>
              <CardDescription>
                Upload a CSV file containing your income data. The file should
                include columns for date, source, category, description, and amount.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <CSVDropzone
                onFileSelect={setFile}
                file={state.file}
                onClear={() => setFile(null)}
                error={state.error}
              />

              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Need a template to get started?
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate("income")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "mapping":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileSpreadsheet className="mr-2 h-5 w-5" />
                Map Columns
              </CardTitle>
              <CardDescription>
                Map each column from your CSV file to the corresponding income
                field. We&apos;ve tried to auto-detect common column names.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ColumnMapper
                csvHeaders={state.csvData?.headers || []}
                fields={fields}
                mappings={state.mappings}
                manualValues={state.manualValues}
                onMappingChange={setMapping}
                onManualValueChange={setManualValue}
                previewData={state.csvData?.data.slice(0, 3)}
              />

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={goBackToUpload}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={proceedToPreview}>
                  Preview Data
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "preview":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Preview Import
              </CardTitle>
              <CardDescription>
                Review your data before importing. You can remove rows with errors
                or go back to fix the column mappings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportPreview
                data={state.transformedData}
                fields={fields}
                validationErrors={state.validationErrors}
                onRemoveRow={removeRow}
              />

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={goBackToMapping}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Mapping
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={state.transformedData.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Import {state.transformedData.length} Rows
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "importing":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Importing...
              </CardTitle>
              <CardDescription>
                Please wait while we import your income data. This may take a few
                moments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={state.importProgress} />
              <p className="text-center text-sm text-muted-foreground">
                {state.importProgress}% complete
              </p>
            </CardContent>
          </Card>
        );

      case "complete":
        const results = state.importResults;
        const isSuccess = results && results.failed === 0;

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {isSuccess ? (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
                    Import Complete
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-5 w-5 text-amber-600" />
                    Import Completed with Errors
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isSuccess
                  ? "All your income records have been imported successfully."
                  : "Some records could not be imported."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {results && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/30 p-4 text-center">
                    <p className="text-3xl font-bold text-foreground">
                      {results.total}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-900/20">
                    <p className="text-3xl font-bold text-green-600">
                      {results.successful}
                    </p>
                    <p className="text-sm text-green-600">Imported</p>
                  </div>
                  <div
                    className={`rounded-lg border p-4 text-center ${
                      results.failed > 0
                        ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                        : "bg-muted/30"
                    }`}
                  >
                    <p
                      className={`text-3xl font-bold ${
                        results.failed > 0 ? "text-red-600" : "text-muted-foreground"
                      }`}
                    >
                      {results.failed}
                    </p>
                    <p
                      className={`text-sm ${
                        results.failed > 0 ? "text-red-600" : "text-muted-foreground"
                      }`}
                    >
                      Failed
                    </p>
                  </div>
                </div>
              )}

              {results && results.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <h4 className="mb-2 font-medium text-red-800 dark:text-red-300">
                    Error Details
                  </h4>
                  <ul className="max-h-40 overflow-y-auto space-y-1 text-sm text-red-700 dark:text-red-400">
                    {results.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={reset}>
                  Import Another File
                </Button>
                <Button asChild>
                  <Link href="/income">View Income</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/import">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Import Income
          </h1>
          <p className="text-muted-foreground">
            Import income records from a CSV file
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      {state.step !== "complete" && renderStepIndicator()}

      {/* Content */}
      {renderContent()}
    </div>
  );
}
