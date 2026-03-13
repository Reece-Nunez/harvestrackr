"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Edit2,
  Save,
  Plus,
  Trash2,
  DollarSign,
  FileText,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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
import { DatePicker } from "@/components/ui/date-picker";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useFarm } from "@/components/providers/farm-provider";
import {
  processReceiptImage,
  checkReceiptServiceHealth,
  type ParsedReceiptData,
  type ParsedLineItem,
} from "@/lib/ocr-service";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/schemas/expense";
import { createExpense, uploadReceiptImage } from "@/actions/expenses";

type ProcessingState = "idle" | "uploading" | "processing" | "complete" | "error";

interface EditableLineItem extends ParsedLineItem {
  id: string;
}

export default function ScanReceiptPage() {
  const router = useRouter();
  const { currentFarm } = useFarm();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  // State
  const [processingState, setProcessingState] = React.useState<ProcessingState>("idle");
  const [progress, setProgress] = React.useState(0);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<ParsedReceiptData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Editable form state
  const [vendor, setVendor] = React.useState("");
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [lineItems, setLineItems] = React.useState<EditableLineItem[]>([]);
  const [isEditing, setIsEditing] = React.useState(false);

  // Service health check
  const [serviceStatus, setServiceStatus] = React.useState<{
    checking: boolean;
    available: boolean;
    hasApiKey: boolean;
  }>({ checking: true, available: false, hasApiKey: false });

  React.useEffect(() => {
    let cancelled = false;
    checkReceiptServiceHealth().then((status) => {
      if (!cancelled) setServiceStatus({ checking: false, ...status });
    });
    return () => { cancelled = true; };
  }, []);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Please select an image or PDF file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setImageFile(file);
    setError(null);
    setParsedData(null);
    setIsEditing(false);

    // Create preview (images only — PDFs can't be previewed as img src)
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }

    // Process the image
    await processImage(file);
  };

  // Process image with OCR
  const processImage = async (file: File) => {
    setProcessingState("processing");
    setProgress(0);

    try {
      const result = await processReceiptImage(file, (p) => setProgress(p));

      setParsedData(result);
      setVendor(result.vendor);
      // Parse YYYY-MM-DD as local date (not UTC) to avoid off-by-one timezone shift
      if (result.date) {
        const [y, m, d] = result.date.split("-").map(Number);
        setDate(new Date(y, m - 1, d));
      } else {
        setDate(new Date());
      }
      setLineItems(
        result.items.map((item, index) => ({
          ...item,
          id: `item-${index}`,
        }))
      );

      // If no items found, add a default one with the total
      if (result.items.length === 0 && result.total > 0) {
        setLineItems([
          {
            id: "item-0",
            description: "Receipt Item",
            quantity: 1,
            unitPrice: result.total,
            total: result.total,
            category: "Supplies Purchased",
          },
        ]);
      }

      setProcessingState("complete");
      setIsEditing(true);
    } catch (err) {
      console.error("OCR processing error:", err);
      setError(err instanceof Error ? err.message : "Failed to process receipt");
      setProcessingState("error");
    }
  };

  // Handle line item changes
  const updateLineItem = (id: string, updates: Partial<EditableLineItem>) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, ...updates };
        // Recalculate total if quantity or unitPrice changed
        if ("quantity" in updates || "unitPrice" in updates) {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      })
    );
  };

  const addLineItem = () => {
    setLineItems((items) => [
      ...items,
      {
        id: `item-${Date.now()}`,
        description: "",
        quantity: 1,
        unitPrice: 0,
        total: 0,
        category: "Supplies Purchased",
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems((items) => items.filter((item) => item.id !== id));
  };

  // Calculate grand total
  const grandTotal = React.useMemo(
    () => lineItems.reduce((sum, item) => sum + item.total, 0),
    [lineItems]
  );

  // Reset the form
  const handleReset = () => {
    setProcessingState("idle");
    setProgress(0);
    setImagePreview(null);
    setImageFile(null);
    setParsedData(null);
    setError(null);
    setVendor("");
    setDate(undefined);
    setLineItems([]);
    setIsEditing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Submit expense
  const handleSubmit = async () => {
    if (!currentFarm) {
      toast.error("Please select a farm first");
      return;
    }

    if (!vendor.trim()) {
      toast.error("Please enter a vendor name");
      return;
    }

    if (!date) {
      toast.error("Please select a date");
      return;
    }

    if (lineItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload receipt image if available (don't block expense creation if this fails)
      let receiptImageUrl: string | null = null;
      if (imageFile) {
        try {
          const formData = new FormData();
          formData.append("file", imageFile);
          const uploadResult = await uploadReceiptImage(formData);
          if (uploadResult.success && uploadResult.data) {
            receiptImageUrl = uploadResult.data.url;
          }
        } catch (uploadErr) {
          console.error("Receipt image upload failed:", uploadErr);
          // Continue without the image — the expense data is more important
        }
      }

      // Format date as YYYY-MM-DD in local time (avoid UTC shift)
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");

      // Create expense
      const expenseData = {
        farmId: currentFarm.id,
        date: `${yyyy}-${mm}-${dd}`,
        vendor: vendor.trim(),
        grandTotal,
        receiptImageUrl,
        lineItems: lineItems.map((item) => ({
          item: item.description || "Receipt Item",
          category: item.category,
          quantity: item.quantity,
          unitCost: item.unitPrice,
          lineTotal: Math.round(item.total * 100) / 100,
        })),
      };

      console.log("Creating expense with data:", JSON.stringify(expenseData, null, 2));

      const result = await createExpense(expenseData);

      if (result.success) {
        toast.success("Expense created successfully");
        router.push("/expenses");
      } else {
        console.error("Create expense failed:", result.error);
        toast.error(result.error);
      }
    } catch (err) {
      console.error("Error creating expense:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to create expense"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confidenceColor = {
    high: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
    medium: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30",
    low: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scan Receipt</h1>
        <p className="text-muted-foreground">
          Take a photo or upload an image of your receipt to automatically extract expense data
        </p>
      </div>

      {/* Upload Section */}
      {processingState === "idle" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-6 py-8">
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-32 w-32 flex-col gap-2"
                >
                  <Camera className="h-10 w-10" />
                  <span>Take Photo</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-32 w-32 flex-col gap-2"
                >
                  <Upload className="h-10 w-10" />
                  <span>Upload</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Supported formats: JPEG, PNG, WebP, PDF. Max size: 10MB
              </p>

              {/* Service status banner */}
              {serviceStatus.checking ? (
                <div className="rounded-lg border bg-muted/50 p-3 text-center">
                  <p className="text-sm text-muted-foreground">Checking scanning service...</p>
                </div>
              ) : serviceStatus.available && serviceStatus.hasApiKey ? (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      AI Receipt Scanner Ready
                    </span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Powered by Claude AI — requires internet connection
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Scanner Unavailable
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    {!serviceStatus.available
                      ? "Cannot connect to the scanning service. Check your internet connection."
                      : "API key not configured. Add ANTHROPIC_API_KEY to your environment."}
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
          </CardContent>
        </Card>
      )}

      {/* Processing State */}
      {processingState === "processing" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Scanning receipt...</p>
                <p className="text-sm text-muted-foreground">
                  AI is reading and extracting receipt data
                </p>
              </div>
              <Progress value={progress} className="w-64" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {processingState === "error" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="text-center">
                <p className="font-medium text-destructive">Processing Failed</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={handleReset}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {processingState === "complete" && parsedData && (
        <>
          {/* Image Preview & Confidence */}
          <div className="flex gap-6">
            {imagePreview ? (
              <div className="relative shrink-0">
                <img
                  src={imagePreview}
                  alt="Receipt"
                  className="h-48 w-36 rounded-lg object-cover border"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6"
                  onClick={handleReset}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : imageFile && (
              <div className="relative shrink-0 flex h-48 w-36 flex-col items-center justify-center gap-2 rounded-lg border bg-muted/50">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">PDF Receipt</span>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6"
                  onClick={handleReset}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Extracted Data</h2>
                  <p className="text-sm text-muted-foreground">
                    Review and edit the extracted information
                  </p>
                </div>
                <Badge className={cn(confidenceColor[parsedData.confidence])}>
                  {parsedData.confidence === "high" && (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  )}
                  {parsedData.confidence === "low" && (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {parsedData.confidence} confidence
                </Badge>
              </div>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Looks Good
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Details
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Expense Details */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Input
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="Enter vendor name"
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <DatePicker
                    date={date}
                    onDateChange={setDate}
                    placeholder="Select date"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              {isEditing && (
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No items extracted. Click Edit Details to add items manually.</p>
                </div>
              ) : (
                lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-lg border bg-muted/30 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Item #{index + 1}</span>
                      {isEditing && lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeLineItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(item.id, { description: e.target.value })
                          }
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={item.category}
                          onValueChange={(value: ExpenseCategory) =>
                            updateLineItem(item.id, { category: value })
                          }
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Unit Price</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                unitPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="pl-9"
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(item.id, {
                              quantity: parseInt(e.target.value) || 1,
                            })
                          }
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Line Total</Label>
                        <Input
                          value={formatCurrency(item.total)}
                          className="bg-muted"
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Grand Total */}
              <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
                <span className="text-lg font-semibold">Grand Total</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleReset} disabled={isSubmitting}>
              Scan Another
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Expense
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
