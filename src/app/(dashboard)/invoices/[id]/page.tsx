import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Printer,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { InvoiceActions } from "./invoice-actions";
import { getInvoiceById } from "@/actions/invoices";

export const metadata: Metadata = {
  title: "Invoice Details | HarvesTrackr",
  description: "View and manage invoice details",
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
    .select("id, name, address, city, state, zip_code, phone_number, email")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .limit(1);

  return farms?.[0] || null;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const farm = await getCurrentFarmId();

  if (!farm || typeof farm === "string") {
    notFound();
  }

  const invoice = await getInvoiceById(id, farm.id);

  if (!invoice) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {invoice.invoice_number}
            </h1>
            <p className="text-muted-foreground">Invoice Details</p>
          </div>
        </div>
        <InvoiceActions invoice={invoice} farmId={farm.id} />
      </div>

      <Tabs defaultValue="preview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <InvoicePreview invoice={invoice} farm={farm} />
        </TabsContent>

        {/* Edit Tab */}
        <TabsContent value="edit">
          <InvoiceForm invoice={invoice} mode="edit" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
