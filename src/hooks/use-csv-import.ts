"use client";

import { useState, useCallback } from "react";
import {
  parseCSV,
  detectColumnMappings,
  transformRows,
  validateExpenseData,
  validateIncomeData,
  expenseFields,
  incomeFields,
  type ParsedCSVResult,
  type ExpenseField,
  type IncomeField,
} from "@/lib/csv-service";

export type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete";

export interface ImportState {
  step: ImportStep;
  file: File | null;
  csvData: ParsedCSVResult | null;
  mappings: Record<string, string>;
  manualValues: Record<string, string>;
  transformedData: Record<string, unknown>[];
  validationErrors: { row: number; field: string; message: string }[];
  importProgress: number;
  importResults: {
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null;
  error: string | null;
}

export interface UseCSVImportOptions {
  type: "expenses" | "income";
  onImportComplete?: (results: ImportState["importResults"]) => void;
}

export function useCSVImport({ type, onImportComplete }: UseCSVImportOptions) {
  const fields: (ExpenseField | IncomeField)[] = type === "expenses" ? expenseFields : incomeFields;

  const [state, setState] = useState<ImportState>({
    step: "upload",
    file: null,
    csvData: null,
    mappings: {},
    manualValues: {},
    transformedData: [],
    validationErrors: [],
    importProgress: 0,
    importResults: null,
    error: null,
  });

  const setFile = useCallback(async (file: File | null) => {
    if (!file) {
      setState((prev) => ({
        ...prev,
        file: null,
        csvData: null,
        mappings: {},
        error: null,
      }));
      return;
    }

    try {
      const csvData = await parseCSV(file);
      const autoMappings = detectColumnMappings(csvData.headers, fields);

      setState((prev) => ({
        ...prev,
        file,
        csvData,
        mappings: autoMappings,
        manualValues: {},
        error: null,
        step: "mapping",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        file: null,
        csvData: null,
        error: error instanceof Error ? error.message : "Failed to parse CSV file",
      }));
    }
  }, [fields]);

  const setMapping = useCallback((fieldKey: string, csvColumn: string) => {
    setState((prev) => ({
      ...prev,
      mappings: {
        ...prev.mappings,
        [fieldKey]: csvColumn,
      },
    }));
  }, []);

  const setManualValue = useCallback((fieldKey: string, value: string) => {
    setState((prev) => ({
      ...prev,
      manualValues: {
        ...prev.manualValues,
        [fieldKey]: value,
      },
    }));
  }, []);

  const proceedToPreview = useCallback(() => {
    if (!state.csvData) return;

    const transformed = transformRows(
      state.csvData.data,
      state.mappings,
      state.manualValues
    );

    const validation =
      type === "expenses"
        ? validateExpenseData(transformed)
        : validateIncomeData(transformed);

    setState((prev) => ({
      ...prev,
      transformedData: transformed,
      validationErrors: validation.errors,
      step: "preview",
    }));
  }, [state.csvData, state.mappings, state.manualValues, type]);

  const goBackToMapping = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: "mapping",
      validationErrors: [],
    }));
  }, []);

  const goBackToUpload = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: "upload",
      file: null,
      csvData: null,
      mappings: {},
      manualValues: {},
      transformedData: [],
      validationErrors: [],
      error: null,
    }));
  }, []);

  const startImport = useCallback(
    async (importFn: (data: Record<string, unknown>[]) => Promise<{ success: boolean; error?: string }>) => {
      if (state.transformedData.length === 0) return;

      setState((prev) => ({
        ...prev,
        step: "importing",
        importProgress: 0,
        importResults: null,
      }));

      const total = state.transformedData.length;
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process in batches
      const batchSize = 10;
      for (let i = 0; i < total; i += batchSize) {
        const batch = state.transformedData.slice(i, i + batchSize);

        try {
          const result = await importFn(batch);
          if (result.success) {
            successful += batch.length;
          } else {
            failed += batch.length;
            if (result.error) {
              errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${result.error}`);
            }
          }
        } catch (error) {
          failed += batch.length;
          errors.push(
            `Batch ${Math.floor(i / batchSize) + 1}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }

        // Update progress
        setState((prev) => ({
          ...prev,
          importProgress: Math.round(((i + batch.length) / total) * 100),
        }));
      }

      const results = { total, successful, failed, errors };

      setState((prev) => ({
        ...prev,
        step: "complete",
        importProgress: 100,
        importResults: results,
      }));

      onImportComplete?.(results);
    },
    [state.transformedData, onImportComplete]
  );

  const reset = useCallback(() => {
    setState({
      step: "upload",
      file: null,
      csvData: null,
      mappings: {},
      manualValues: {},
      transformedData: [],
      validationErrors: [],
      importProgress: 0,
      importResults: null,
      error: null,
    });
  }, []);

  const removeRow = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      transformedData: prev.transformedData.filter((_, i) => i !== index),
      validationErrors: prev.validationErrors
        .filter((e) => e.row !== index + 1)
        .map((e) => ({
          ...e,
          row: e.row > index + 1 ? e.row - 1 : e.row,
        })),
    }));
  }, []);

  return {
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
  };
}
