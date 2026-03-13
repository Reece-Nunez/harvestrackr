import { type ExpenseCategory } from "@/schemas/expense";

// Parsed receipt data interface
export interface ParsedReceiptData {
  vendor: string;
  date: string;
  total: number;
  subtotal: number;
  tax: number;
  items: ParsedLineItem[];
  rawText: string;
  confidence: "high" | "medium" | "low";
}

export interface ParsedLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: ExpenseCategory;
}

/**
 * Checks if the AI receipt scanning service is available.
 */
export async function checkReceiptServiceHealth(): Promise<{
  available: boolean;
  hasApiKey: boolean;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch("/api/scan-receipt", {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return { available: false, hasApiKey: false };

    const data = await res.json();
    return { available: true, hasApiKey: !!data.hasApiKey };
  } catch {
    return { available: false, hasApiKey: false };
  }
}

/**
 * Converts a File/Blob to a base64 data URL.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read the image file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Sends a receipt image to the AI-powered scanning API route and returns structured data.
 *
 * Requires an internet connection and a configured ANTHROPIC_API_KEY on the server.
 */
export async function processReceiptImage(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<ParsedReceiptData> {
  if (!imageFile) {
    throw new Error("No image file provided.");
  }

  // Step 1: Convert to base64
  onProgress?.(10);
  const base64Image = await fileToBase64(imageFile);
  onProgress?.(25);

  // Step 2: Send to API route
  const response = await fetch("/api/scan-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Image }),
  });

  onProgress?.(80);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error || `Receipt scanning failed (${response.status}). Please try again.`
    );
  }

  const receiptData: ParsedReceiptData = await response.json();
  onProgress?.(100);

  return receiptData;
}
