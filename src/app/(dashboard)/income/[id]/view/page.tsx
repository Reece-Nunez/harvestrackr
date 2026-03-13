import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  DollarSign,
  ShoppingBag,
  CreditCard,
  FileText,
  Tag,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Income Details | HarvesTrackr",
  description: "View income record details",
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

async function getIncomeById(id: string, farmId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("income")
    .select(
      `
      *,
      livestock:livestock_id (
        id,
        name,
        species,
        tag_number
      )
    `
    )
    .eq("id", id)
    .eq("farm_id", farmId)
    .single();

  if (error) {
    console.error("Error fetching income:", error);
    return null;
  }

  return data;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CHECK: "Check",
  ONLINE: "Venmo",
  OTHER: "Other",
};

export default async function IncomeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    notFound();
  }

  const income = await getIncomeById(id, farmId);

  if (!income) {
    notFound();
  }

  const livestock = income.livestock as {
    id: string;
    name: string;
    species: string;
    tag_number: string | null;
  } | null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/income">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Income Details</h1>
            <p className="text-muted-foreground">
              {income.item} - {formatDate(income.date)}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/income/${id}`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
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
                    <p className="font-medium">{formatDate(income.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Item</p>
                    <p className="font-medium">{income.item}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Tag className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    <p className="font-medium">{income.quantity}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price per Unit</p>
                    <p className="font-medium">{formatCurrency(income.price)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-semibold text-green-600 text-lg">
                      {formatCurrency(income.amount)}
                    </p>
                  </div>
                </div>
              </div>

              {income.payment_method && (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <Badge variant="secondary">
                      {PAYMENT_METHOD_LABELS[income.payment_method] || income.payment_method}
                    </Badge>
                  </div>
                </div>
              )}

              {income.notes && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{income.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Linked Livestock */}
          {livestock && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Linked Livestock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{livestock.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Species</span>
                  <span>{livestock.species}</span>
                </div>
                {livestock.tag_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tag #</span>
                    <span>{livestock.tag_number}</span>
                  </div>
                )}
                <Button variant="outline" className="w-full mt-2" size="sm" asChild>
                  <Link href={`/inventory/livestock/${livestock.id}`}>
                    View Livestock Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Record Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Record Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(income.created_at)}</span>
              </div>
              {income.updated_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{formatDate(income.updated_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
