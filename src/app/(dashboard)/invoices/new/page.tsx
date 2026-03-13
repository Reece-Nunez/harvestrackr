import { Metadata } from "next";
import { InvoiceForm } from "@/components/forms/invoice-form";

export const metadata: Metadata = {
  title: "Create Invoice | HarvesTrackr",
  description: "Create a new invoice for your customer",
};

export default function NewInvoicePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <InvoiceForm mode="create" />
    </div>
  );
}
