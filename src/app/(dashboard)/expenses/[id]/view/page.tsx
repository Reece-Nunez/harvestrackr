import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getExpenseById } from "@/actions/expenses";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  Store,
  Receipt,
  FileText,
  ExternalLink,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Expense Details | HarvesTrackr",
  description: "View expense details",
};

async function getCurrentFarmId() {
  const cookieStore = await cookies();
  const farmId = cookieStore.get("currentFarmId")?.value;
  if (farmId) return farmId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: farms } = await supabase
    .from("farms")
    .select("id")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .limit(1);

  return farms?.[0]?.id || null;
}

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    notFound();
  }

  const expense = await getExpenseById(id, farmId);

  if (!expense) {
    notFound();
  }

  const lineItems = expense.expense_line_items || [];
  const categories = [...new Set(lineItems.map((item: any) => item.category))];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/expenses">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Expense Details</h1>
            <p className="text-muted-foreground">
              {expense.vendor || "Unknown Vendor"} - {formatDate(expense.date)}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/expenses/${id}`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(expense.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor</p>
                    <p className="font-medium">{expense.vendor || "—"}</p>
                  </div>
                </div>
              </div>

              {expense.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p>{expense.description}</p>
                </div>
              )}

              {expense.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{expense.notes}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Badge key={cat} variant="secondary">
                    {cat}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>
                {lineItems.length} item{lineItems.length !== 1 ? "s" : ""} in this expense
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Item</th>
                      <th className="px-4 py-3 text-left font-medium">Category</th>
                      <th className="px-4 py-3 text-right font-medium">Qty</th>
                      <th className="px-4 py-3 text-right font-medium">Unit Cost</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item: any, index: number) => (
                      <tr key={item.id || index} className="border-b last:border-0">
                        <td className="px-4 py-3">{item.item}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-normal">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(item.unit_cost)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(item.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50">
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold">
                        Grand Total
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-lg">
                        {formatCurrency(expense.grand_total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Receipt Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Receipt
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expense.receipt_image_url ? (
                <div className="space-y-3">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border bg-muted">
                    <img
                      src={expense.receipt_image_url}
                      alt="Receipt"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={expense.receipt_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full Size
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No receipt attached
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Record Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(expense.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDate(expense.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
