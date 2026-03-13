import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  Building,
  DollarSign,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerForm } from "@/components/forms/customer-form";
import { getCustomerById } from "@/actions/customers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getInvoiceStatusVariant } from "@/schemas/invoice";
import type { InvoiceStatus } from "@/schemas/invoice";

export const metadata: Metadata = {
  title: "Customer Details | HarvesTrackr",
  description: "View and edit customer details",
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

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    notFound();
  }

  const customer = await getCustomerById(id, farmId);

  if (!customer) {
    notFound();
  }

  const fullAddress = [
    customer.address,
    customer.city,
    customer.state,
    customer.zip_code,
    customer.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {customer.name}
            </h1>
            <p className="text-muted-foreground">Customer Details</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/invoices/new?customerId=${customer.id}`}>
            <FileText className="h-4 w-4 mr-2" />
            Create Invoice
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({customer.invoice_count || 0})
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(customer.total_revenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From paid invoices
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Invoices
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {customer.invoice_count || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Customer Since
                </CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {format(new Date(customer.created_at), "MMM yyyy")}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-primary hover:underline"
                    >
                      {customer.email}
                    </a>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-primary hover:underline"
                    >
                      {customer.phone}
                    </a>
                  </div>
                )}
                {fullAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{fullAddress}</span>
                  </div>
                )}
                {customer.tax_number && (
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>Tax ID: {customer.tax_number}</span>
                  </div>
                )}
                {!customer.email &&
                  !customer.phone &&
                  !fullAddress &&
                  !customer.tax_number && (
                    <p className="text-muted-foreground">
                      No contact information provided
                    </p>
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.notes ? (
                  <p className="whitespace-pre-wrap">{customer.notes}</p>
                ) : (
                  <p className="text-muted-foreground">No notes added</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Edit Tab */}
        <TabsContent value="edit">
          <CustomerForm customer={customer} mode="edit" />
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>
                All invoices for {customer.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customer.invoices && customer.invoices.length > 0 ? (
                <div className="space-y-4">
                  {customer.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium hover:underline"
                        >
                          {invoice.invoice_number}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(invoice.date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge
                          variant={getInvoiceStatusVariant(
                            invoice.status as InvoiceStatus
                          )}
                        >
                          {invoice.status}
                        </Badge>
                        <span className="font-semibold">
                          {formatCurrency(invoice.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No invoices yet</p>
                  <Button asChild className="mt-4">
                    <Link href={`/invoices/new?customerId=${customer.id}`}>
                      Create First Invoice
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
