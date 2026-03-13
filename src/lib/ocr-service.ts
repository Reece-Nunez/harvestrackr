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
function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read the image file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses and resizes an image to stay under Vercel's 4.5MB body limit.
 * Targets ~1.5MB max base64 payload (well within the limit after JSON wrapping).
 */
function compressImage(file: File, maxWidthOrHeight = 1600, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down if larger than max dimension
      if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
        if (width > height) {
          height = Math.round((height * maxWidthOrHeight) / width);
          width = maxWidthOrHeight;
        } else {
          width = Math.round((width * maxWidthOrHeight) / height);
          height = maxWidthOrHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not create canvas context."));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Image compression failed."));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image for compression."));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Sends a receipt image or PDF to the AI-powered scanning API route and returns structured data.
 *
 * Requires an internet connection and a configured ANTHROPIC_API_KEY on the server.
 */
export async function processReceiptImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ParsedReceiptData> {
  if (!file) {
    throw new Error("No file provided.");
  }

  const isPdf = file.type === "application/pdf";

  onProgress?.(10);

  let base64Data: string;
  if (isPdf) {
    // PDFs don't need image compression — send as-is
    base64Data = await fileToBase64(file);
  } else {
    // Compress images to stay under Vercel's body limit
    const compressed = await compressImage(file);
    base64Data = await fileToBase64(compressed);
  }

  onProgress?.(25);

  // Send to API route
  const response = await fetch("/api/scan-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Data }),
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
