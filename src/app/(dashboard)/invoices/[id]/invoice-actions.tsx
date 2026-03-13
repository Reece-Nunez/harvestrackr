"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Printer,
  Send,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateInvoiceStatus } from "@/actions/invoices";
import {
  getInvoiceStatusVariant,
  type InvoiceStatus,
  type InvoiceWithDetails,
} from "@/schemas/invoice";

interface InvoiceActionsProps {
  invoice: InvoiceWithDetails;
  farmId: string;
}

export function InvoiceActions({ invoice, farmId }: InvoiceActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleStatusUpdate = async (newStatus: InvoiceStatus) => {
    setIsUpdating(true);
    try {
      const result = await updateInvoiceStatus(invoice.id, farmId, newStatus);
      if (result.success) {
        toast.success(`Invoice marked as ${newStatus.toLowerCase()}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to update invoice status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // Dynamic import of PDF service
    const { generateInvoicePDF } = await import("@/lib/pdf-service");

    try {
      toast.loading("Generating PDF...");
      await generateInvoicePDF(invoice);
      toast.dismiss();
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to generate PDF");
      console.error("PDF generation error:", error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getInvoiceStatusVariant(invoice.status)}>
        {invoice.status}
      </Badge>

      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="h-4 w-4 mr-2" />
        Print
      </Button>

      <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
        <Download className="h-4 w-4 mr-2" />
        PDF
      </Button>

      {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {invoice.status === "DRAFT" && (
              <DropdownMenuItem onClick={() => handleStatusUpdate("SENT")}>
                <Send className="h-4 w-4 mr-2" />
                Mark as Sent
              </DropdownMenuItem>
            )}
            {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
              <DropdownMenuItem onClick={() => handleStatusUpdate("PAID")}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Paid
              </DropdownMenuItem>
            )}
            {invoice.status === "SENT" && (
              <DropdownMenuItem onClick={() => handleStatusUpdate("OVERDUE")}>
                <XCircle className="h-4 w-4 mr-2" />
                Mark as Overdue
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleStatusUpdate("CANCELLED")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
