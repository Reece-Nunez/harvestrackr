import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { InvoiceWithDetails } from "@/schemas/invoice";

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

/**
 * Generate a professional PDF invoice
 */
export async function generateInvoicePDF(
  invoice: InvoiceWithDetails,
  farm?: Farm
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;

  // Colors
  const primaryColor: [number, number, number] = [34, 139, 34]; // Forest green
  const textColor: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [128, 128, 128];

  // Helper functions
  const addText = (
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number;
      fontStyle?: "normal" | "bold" | "italic";
      color?: [number, number, number];
      align?: "left" | "center" | "right";
    } = {}
  ) => {
    const {
      fontSize = 10,
      fontStyle = "normal",
      color = textColor,
      align = "left",
    } = options;

    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);
    doc.setTextColor(...color);
    doc.text(text, x, y, { align });
  };

  // Header - Farm Name
  if (farm?.name) {
    addText(farm.name, margin, yPosition, {
      fontSize: 24,
      fontStyle: "bold",
      color: primaryColor,
    });
    yPosition += 8;

    // Farm Address
    const farmAddressLines = [
      farm.address,
      [farm.city, farm.state, farm.zip_code].filter(Boolean).join(", "),
      farm.phone_number,
      farm.email,
    ].filter(Boolean);

    farmAddressLines.forEach((line) => {
      if (line) {
        addText(line, margin, yPosition, { fontSize: 9, color: lightGray });
        yPosition += 4;
      }
    });
  }

  // Invoice Title - Right aligned
  addText("INVOICE", pageWidth - margin, 20, {
    fontSize: 28,
    fontStyle: "bold",
    align: "right",
  });

  addText(invoice.invoice_number, pageWidth - margin, 30, {
    fontSize: 12,
    fontStyle: "bold",
    color: primaryColor,
    align: "right",
  });

  // Status badge
  addText(`Status: ${invoice.status}`, pageWidth - margin, 38, {
    fontSize: 10,
    align: "right",
  });

  yPosition = Math.max(yPosition, 50) + 10;

  // Horizontal line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // Bill To section
  addText("BILL TO", margin, yPosition, {
    fontSize: 10,
    fontStyle: "bold",
    color: lightGray,
  });

  addText("INVOICE DETAILS", pageWidth / 2 + 10, yPosition, {
    fontSize: 10,
    fontStyle: "bold",
    color: lightGray,
  });

  yPosition += 8;

  // Customer info
  addText(invoice.customer.name, margin, yPosition, {
    fontSize: 12,
    fontStyle: "bold",
  });

  // Invoice details on right
  addText(
    `Invoice Date: ${format(new Date(invoice.date), "MMMM dd, yyyy")}`,
    pageWidth / 2 + 10,
    yPosition
  );
  yPosition += 6;

  const customerAddress = [
    invoice.customer.address,
    [
      invoice.customer.city,
      invoice.customer.state,
      invoice.customer.zip_code,
    ]
      .filter(Boolean)
      .join(", "),
    invoice.customer.country,
  ].filter(Boolean);

  customerAddress.forEach((line) => {
    if (line) {
      addText(line, margin, yPosition, { color: lightGray });
      yPosition += 5;
    }
  });

  // Due date on right
  addText(
    `Due Date: ${format(new Date(invoice.due_date), "MMMM dd, yyyy")}`,
    pageWidth / 2 + 10,
    yPosition - 10
  );

  if (invoice.customer.email) {
    addText(invoice.customer.email, margin, yPosition, { color: lightGray });
    yPosition += 5;
  }

  if (invoice.customer.phone) {
    addText(invoice.customer.phone, margin, yPosition, { color: lightGray });
    yPosition += 5;
  }

  if (invoice.customer.tax_number) {
    addText(`Tax ID: ${invoice.customer.tax_number}`, margin, yPosition, {
      color: lightGray,
    });
  }

  yPosition = Math.max(yPosition, 110) + 10;

  // Line Items Table
  const tableData = invoice.invoice_items.map((item) => [
    item.description + (item.category ? `\n(${item.category})` : ""),
    item.quantity.toString(),
    item.unit || "each",
    formatCurrency(item.unit_price),
    formatCurrency(item.total),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [["Description", "Qty", "Unit", "Unit Price", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      yPosition = data.cursor?.y || yPosition;
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Totals section
  const totalsX = pageWidth - margin - 80;
  const totalsValueX = pageWidth - margin;

  addText("Subtotal:", totalsX, yPosition, { align: "left" });
  addText(formatCurrency(invoice.subtotal), totalsValueX, yPosition, {
    align: "right",
    fontStyle: "bold",
  });
  yPosition += 6;

  if ((invoice.tax_rate ?? 0) > 0) {
    addText(`Tax (${invoice.tax_rate}%):`, totalsX, yPosition, {
      align: "left",
    });
    addText(formatCurrency(invoice.tax_amount ?? 0), totalsValueX, yPosition, {
      align: "right",
      fontStyle: "bold",
    });
    yPosition += 6;
  }

  if ((invoice.discount_amount ?? 0) > 0) {
    addText("Discount:", totalsX, yPosition, { align: "left" });
    addText(
      `-${formatCurrency(invoice.discount_amount ?? 0)}`,
      totalsValueX,
      yPosition,
      { align: "right", fontStyle: "bold", color: [0, 128, 0] }
    );
    yPosition += 6;
  }

  // Total line
  doc.setDrawColor(...primaryColor);
  doc.line(totalsX - 10, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  addText("TOTAL DUE:", totalsX, yPosition, {
    fontSize: 12,
    fontStyle: "bold",
    align: "left",
  });
  addText(formatCurrency(invoice.total), totalsValueX, yPosition, {
    fontSize: 12,
    fontStyle: "bold",
    color: primaryColor,
    align: "right",
  });
  yPosition += 15;

  // Notes and Terms
  if (invoice.notes || invoice.terms) {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    let notesEndY = yPosition;
    if (invoice.notes) {
      addText("Notes:", margin, yPosition, {
        fontSize: 10,
        fontStyle: "bold",
        color: lightGray,
      });
      yPosition += 6;

      const noteLines = doc.splitTextToSize(
        invoice.notes,
        (pageWidth - margin * 2) / 2 - 10
      );
      noteLines.forEach((line: string) => {
        addText(line, margin, yPosition, { fontSize: 9 });
        yPosition += 4;
      });
      notesEndY = yPosition;
    }

    if (invoice.terms) {
      const termsStartY = invoice.notes ? notesEndY - (invoice.notes.split('\n').length || 1) * 4 : yPosition;
      addText("Terms & Conditions:", pageWidth / 2 + 10, termsStartY, {
        fontSize: 10,
        fontStyle: "bold",
        color: lightGray,
      });

      const termsLines = doc.splitTextToSize(
        invoice.terms,
        (pageWidth - margin * 2) / 2 - 10
      );
      let termsY = termsStartY + 6;
      termsLines.forEach((line: string) => {
        addText(line, pageWidth / 2 + 10, termsY, { fontSize: 9 });
        termsY += 4;
      });
      yPosition = Math.max(yPosition, termsY);
    }
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  addText("Thank you for your business!", pageWidth / 2, footerY, {
    fontSize: 10,
    align: "center",
    color: lightGray,
  });
  addText(
    "Generated by HarvesTrackr - Farm Management Software",
    pageWidth / 2,
    footerY + 5,
    { fontSize: 8, align: "center", color: lightGray }
  );

  // Save the PDF
  doc.save(`${invoice.invoice_number}.pdf`);
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
