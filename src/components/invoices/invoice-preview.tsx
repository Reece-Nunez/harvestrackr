"use client";

import * as React from "react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getInvoiceStatusVariant,
  isInvoiceOverdue,
  type InvoiceWithDetails,
} from "@/schemas/invoice";

interface Farm {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  phone_number?: string | null;
  email?: string | null;
}

interface InvoicePreviewProps {
  invoice: InvoiceWithDetails;
  farm: Farm;
}

export function InvoicePreview({ invoice, farm }: InvoicePreviewProps) {
  const overdue = isInvoiceOverdue(invoice);

  const farmAddress = [
    farm.address,
    farm.city,
    farm.state,
    farm.zip_code,
  ]
    .filter(Boolean)
    .join(", ");

  const customerAddress = [
    invoice.customer.address,
    invoice.customer.city,
    invoice.customer.state,
    invoice.customer.zip_code,
    invoice.customer.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="print:shadow-none print:border-none">
      <CardContent className="p-8 print:p-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
          {/* Farm Info */}
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">{farm.name}</h1>
            {farmAddress && (
              <p className="text-muted-foreground">{farmAddress}</p>
            )}
            {farm.phone_number && (
              <p className="text-muted-foreground">{farm.phone_number}</p>
            )}
            {farm.email && (
              <p className="text-muted-foreground">{farm.email}</p>
            )}
          </div>

          {/* Invoice Info */}
          <div className="text-right">
            <h2 className="text-2xl font-bold mb-2">INVOICE</h2>
            <p className="text-xl font-semibold text-primary">
              {invoice.invoice_number}
            </p>
            <div className="mt-4 space-y-1">
              <div className="flex justify-end items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={getInvoiceStatusVariant(invoice.status)}>
                  {invoice.status}
                </Badge>
              </div>
              {overdue && (
                <Badge variant="destructive" className="ml-auto">
                  OVERDUE
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Bill To and Invoice Details */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Bill To */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Bill To
            </h3>
            <p className="font-semibold text-lg">{invoice.customer.name}</p>
            {customerAddress && (
              <p className="text-muted-foreground mt-1">{customerAddress}</p>
            )}
            {invoice.customer.email && (
              <p className="text-muted-foreground">{invoice.customer.email}</p>
            )}
            {invoice.customer.phone && (
              <p className="text-muted-foreground">{invoice.customer.phone}</p>
            )}
            {invoice.customer.tax_number && (
              <p className="text-muted-foreground mt-2">
                Tax ID: {invoice.customer.tax_number}
              </p>
            )}
          </div>

          {/* Invoice Details */}
          <div className="md:text-right">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Invoice Details
            </h3>
            <div className="space-y-2">
              <div className="flex md:justify-end gap-4">
                <span className="text-muted-foreground">Invoice Date:</span>
                <span className="font-medium">
                  {format(new Date(invoice.date), "MMMM dd, yyyy")}
                </span>
              </div>
              <div className="flex md:justify-end gap-4">
                <span className="text-muted-foreground">Due Date:</span>
                <span
                  className={`font-medium ${overdue ? "text-destructive" : ""}`}
                >
                  {format(new Date(invoice.due_date), "MMMM dd, yyyy")}
                </span>
              </div>
              {invoice.paid_date && (
                <div className="flex md:justify-end gap-4">
                  <span className="text-muted-foreground">Paid Date:</span>
                  <span className="font-medium text-success">
                    {format(new Date(invoice.paid_date), "MMMM dd, yyyy")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-primary">
                <th className="text-left py-3 px-2 font-semibold">Description</th>
                <th className="text-center py-3 px-2 font-semibold w-20">Qty</th>
                <th className="text-center py-3 px-2 font-semibold w-20">Unit</th>
                <th className="text-right py-3 px-2 font-semibold w-28">
                  Unit Price
                </th>
                <th className="text-right py-3 px-2 font-semibold w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_items.map((item, index) => (
                <tr
                  key={item.id}
                  className={index % 2 === 0 ? "bg-muted/30" : ""}
                >
                  <td className="py-3 px-2">
                    <p className="font-medium">{item.description}</p>
                    {item.category && (
                      <p className="text-sm text-muted-foreground">
                        {item.category}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">{item.quantity}</td>
                  <td className="py-3 px-2 text-center">
                    {item.unit || "each"}
                  </td>
                  <td className="py-3 px-2 text-right">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-full max-w-sm space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>

            {(invoice.tax_rate ?? 0) > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">
                  Tax ({invoice.tax_rate}%):
                </span>
                <span className="font-medium">
                  {formatCurrency(invoice.tax_amount ?? 0)}
                </span>
              </div>
            )}

            {(invoice.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-medium text-success">
                  -{formatCurrency(invoice.discount_amount ?? 0)}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between py-2 text-lg">
              <span className="font-bold">Total Due:</span>
              <span className="font-bold text-primary">
                {formatCurrency(invoice.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes and Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="grid md:grid-cols-2 gap-8 border-t pt-8">
            {invoice.notes && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Notes
                </h3>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}

            {invoice.terms && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Terms & Conditions
                </h3>
                <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center text-muted-foreground text-sm">
          <p>Thank you for your business!</p>
          <p className="mt-1">
            Generated by HarvesTrackr - Farm Management Software
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
