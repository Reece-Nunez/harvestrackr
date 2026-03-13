import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/schemas/expense";

const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const VALID_MEDIA_TYPES = [...VALID_IMAGE_TYPES, "application/pdf"];
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

// Category keywords for AI prompt context
const CATEGORY_LIST = EXPENSE_CATEGORIES.join(", ");

const RECEIPT_PROMPT = `You are a receipt data extraction assistant for a farm expense tracking application called HarvesTrackr.

Analyze this receipt image carefully and extract ALL information into structured JSON.

Return ONLY valid JSON (no markdown, no code fences, no explanation) with this exact structure:
{
  "vendor": "Store or business name exactly as printed",
  "date": "YYYY-MM-DD",
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "items": [
    {
      "description": "Item name or description as printed",
      "quantity": 1,
      "unitPrice": 0.00,
      "total": 0.00,
      "category": "category from the list below"
    }
  ]
}

Valid categories (pick the best match for each item):
${CATEGORY_LIST}

Rules:
- Extract EVERY line item visible on the receipt
- Amounts must be numbers with no currency symbols
- If a date is unreadable, use null (the app will default to today)
- If the total is visible but individual items are hard to read, still include the total
- For quantity: if not explicitly shown, assume 1
- unitPrice = total / quantity for each item
- Be precise with dollar amounts — double-check decimal places`;

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to scan receipts." },
        { status: 401 }
      );
    }

    // Rate limit by user ID
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX} scans per minute.` },
        { status: 429 }
      );
    }

    // Validate API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Receipt scanning is not configured. Contact the administrator." },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { image } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "No image data provided." },
        { status: 400 }
      );
    }

    // Validate base64 data URL (images or PDF)
    const matches = image.match(/^data:([\w/+-]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: "Invalid file format. Expected a base64 data URL." },
        { status: 400 }
      );
    }

    const mediaType = matches[1];
    const base64Data = matches[2];

    if (!VALID_MEDIA_TYPES.includes(mediaType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mediaType}. Supported: ${VALID_MEDIA_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Check approximate decoded size
    const approximateSize = (base64Data.length * 3) / 4;
    if (approximateSize > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large (${Math.round(approximateSize / 1024 / 1024)}MB). Maximum is 8MB.` },
        { status: 400 }
      );
    }

    // Build the content block — PDF uses "document" type, images use "image" type
    const isPdf = mediaType === "application/pdf";
    const fileContentBlock: Anthropic.Messages.ContentBlockParam = isPdf
      ? {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data,
          },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64Data,
          },
        };

    // Call Claude API
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            fileContentBlock,
            {
              type: "text",
              text: RECEIPT_PROMPT,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "The AI did not return a response. Please try again." },
        { status: 500 }
      );
    }

    // Parse JSON
    let receiptData: Record<string, unknown>;
    try {
      receiptData = JSON.parse(textContent.text);
    } catch {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        receiptData = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Unparseable AI response:", textContent.text);
        return NextResponse.json(
          { error: "Could not parse the AI response. Try a clearer photo." },
          { status: 500 }
        );
      }
    }

    // Validate category values
    const validCategories = new Set<string>(EXPENSE_CATEGORIES);

    // Normalize response
    const items = Array.isArray(receiptData.items)
      ? (receiptData.items as Record<string, unknown>[]).map((item) => {
          const category = String(item.category || "Supplies Purchased");
          return {
            description: String(item.description || "Unknown Item").trim(),
            quantity: Math.max(0, parseFloat(String(item.quantity)) || 1),
            unitPrice: Math.round(Math.max(0, parseFloat(String(item.unitPrice)) || 0) * 100) / 100,
            total: Math.round(Math.max(0, parseFloat(String(item.total)) || 0) * 100) / 100,
            category: (validCategories.has(category) ? category : "Supplies Purchased") as ExpenseCategory,
          };
        })
      : [];

    let subtotal = Math.round(Math.max(0, parseFloat(String(receiptData.subtotal)) || 0) * 100) / 100;
    let tax = Math.round(Math.max(0, parseFloat(String(receiptData.tax)) || 0) * 100) / 100;
    let total = Math.round(Math.max(0, parseFloat(String(receiptData.total)) || 0) * 100) / 100;

    // Fix missing totals
    if (total === 0 && items.length > 0) {
      subtotal = items.reduce((sum, item) => sum + item.total, 0);
      total = subtotal + tax;
    }
    if (subtotal === 0 && total > 0) {
      subtotal = total - tax;
    }

    const result = {
      vendor: String(receiptData.vendor || "Unknown Vendor").trim(),
      date: (receiptData.date as string) || new Date().toISOString().split("T")[0],
      subtotal,
      tax,
      total,
      items,
      confidence: "high" as const,
      rawText: `AI-extracted from ${String(receiptData.vendor || "receipt").trim()}`,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Receipt scan error:", error);

    const apiError = error as { status?: number; message?: string };

    if (apiError.status === 401) {
      return NextResponse.json(
        { error: "Invalid API key. Contact the administrator." },
        { status: 500 }
      );
    }
    if (apiError.status === 429) {
      return NextResponse.json(
        { error: "AI rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Receipt scanning failed. Please try again with a clearer photo." },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
  });
}
