"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileSpreadsheet, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CSVDropzoneProps {
  onFileSelect: (file: File) => void;
  file: File | null;
  onClear: () => void;
  error?: string | null;
  disabled?: boolean;
}

export function CSVDropzone({
  onFileSelect,
  file,
  onClear,
  error,
  disabled = false,
}: CSVDropzoneProps) {
  const [dragError, setDragError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setDragError(null);

      if (fileRejections.length > 0) {
        const errorMessages = fileRejections[0].errors.map((e) => e.message).join(", ");
        setDragError(errorMessages);
        return;
      }

      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxFiles: 1,
    disabled,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const displayError = error || dragError;

  if (file) {
    return (
      <div className="rounded-lg border-2 border-dashed border-green-300 bg-green-50 p-6 dark:border-green-700 dark:bg-green-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-800">
              <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            disabled={disabled}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragActive && !isDragReject && "border-green-400 bg-green-50 dark:bg-green-900/20",
          isDragReject && "border-red-400 bg-red-50 dark:bg-red-900/20",
          !isDragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "mb-4 flex h-14 w-14 items-center justify-center rounded-full",
              isDragActive ? "bg-green-100 dark:bg-green-800" : "bg-muted"
            )}
          >
            <Upload
              className={cn(
                "h-7 w-7",
                isDragActive ? "text-green-600" : "text-muted-foreground"
              )}
            />
          </div>
          <p className="mb-1 text-lg font-medium text-foreground">
            {isDragActive ? "Drop your CSV file here" : "Drag & drop your CSV file"}
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            or click to browse your computer
          </p>
          <p className="text-xs text-muted-foreground">
            Supports CSV files up to 10MB
          </p>
        </div>
      </div>

      {displayError && (
        <div className="mt-3 flex items-center space-x-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
