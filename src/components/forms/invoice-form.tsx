"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  DollarSign,
  Plus,
  Trash2,
  Loader2,
  Hash,
  RefreshCw,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useFarm } from "@/components/providers/farm-provider";
import {
  invoiceFormSchema,
  type InvoiceFormData,
  type InvoiceWithDetails,
  INVOICE_CATEGORIES,
  INVOICE_UNITS,
  INVOICE_STATUSES,
  defaultInvoiceItem,
  defaultInvoiceFormValues,
  calculateInvoiceLineTotal,
  calculateInvoiceTotals,
  invoiceFormToCreateData,
  generateInvoiceNumber,
} from "@/schemas/invoice";
import { createInvoice, updateInvoice, generateInvoiceNumber as serverGenerateInvoiceNumber } from "@/actions/invoices";
import { getCustomersForDropdown } from "@/actions/customers";

interface InvoiceFormProps {
  invoice?: InvoiceWithDetails;
  mode?: "create" | "edit";
}

export function InvoiceForm({ invoice, mode = "create" }: InvoiceFormProps) {
  const router = useRouter();
  const { currentFarm } = useFarm();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [customers, setCustomers] = React.useState<
    { id: string; name: string; email: string | null }[]
  >([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = React.useState(true);

  // Load customers
  React.useEffect(() => {
    const loadCustomers = async () => {
      if (!currentFarm) return;
      setIsLoadingCustomers(true);
      try {
        const data = await getCustomersForDropdown(currentFarm.id);
        setCustomers(data);
      } catch (error) {
        console.error("Error loading customers:", error);
        toast.error("Failed to load customers");
      } finally {
        setIsLoadingCustomers(false);
      }
    };
    loadCustomers();
  }, [currentFarm]);

  // Convert existing invoice to form data
  const getDefaultValues = (): InvoiceFormData => {
    if (invoice) {
      return {
        customerId: invoice.customer_id,
        invoiceNumber: invoice.invoice_number,
        date: new Date(invoice.date),
        dueDate: new Date(invoice.due_date),
        status: invoice.status,
        items: invoice.invoice_items.map((item) => ({
          id: item.id,
          description: item.description,
          category: item.category || "",
          quantity: String(item.quantity),
          unit: item.unit || "each",
          unitPrice: String(item.unit_price),
        })),
        taxRate: invoice.tax_rate ? String(invoice.tax_rate) : "",
        discountAmount: invoice.discount_amount
          ? String(invoice.discount_amount)
          : "",
        notes: invoice.notes || "",
        terms: invoice.terms || "",
      };
    }
    return {
      ...defaultInvoiceFormValues,
      invoiceNumber: generateInvoiceNumber(),
    };
  };

  const form = useForm({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: getDefaultValues(),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const watchedTaxRate = form.watch("taxRate");
  const watchedDiscountAmount = form.watch("discountAmount");

  const { subtotal, taxAmount, total } = React.useMemo(
    () =>
      calculateInvoiceTotals(
        watchedItems,
        watchedTaxRate || "",
        watchedDiscountAmount || ""
      ),
    [watchedItems, watchedTaxRate, watchedDiscountAmount]
  );

  // Regenerate invoice number
  const handleRegenerateInvoiceNumber = async () => {
    if (!currentFarm) return;
    try {
      const newNumber = await serverGenerateInvoiceNumber(currentFarm.id);
      form.setValue("invoiceNumber", newNumber);
    } catch (error) {
      // Fall back to client-side generation
      form.setValue("invoiceNumber", generateInvoiceNumber());
    }
  };

  const onSubmit = async (data: any) => {
    if (!currentFarm) {
      toast.error("Please select a farm first");
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = invoiceFormToCreateData(data, currentFarm.id);

      if (mode === "edit" && invoice) {
        const result = await updateInvoice({
          id: invoice.id,
          ...submitData,
        });
        if (result.success) {
          toast.success("Invoice updated successfully");
          router.push("/invoices");
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createInvoice(submitData);
        if (result.success) {
          toast.success("Invoice created successfully");
          router.push("/invoices");
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error("Error submitting invoice:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/invoices");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "edit" ? "Edit Invoice" : "New Invoice"}
            </CardTitle>
            <CardDescription>
              {mode === "edit"
                ? "Update the invoice details below"
                : "Create a new invoice for your customer"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Customer Selector */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Customer <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoadingCustomers}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingCustomers
                                ? "Loading customers..."
                                : "Select Customer"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                            {customer.email && (
                              <span className="text-muted-foreground ml-2">
                                ({customer.email})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Invoice Number */}
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Invoice Number <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="INV-20260130-001"
                            className="pl-9"
                            autoComplete="off"
                            {...field}
                          />
                        </div>
                        {mode === "create" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleRegenerateInvoiceNumber}
                            title="Generate new invoice number"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Invoice Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Invoice Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        onDateChange={field.onChange}
                        placeholder="Select date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Due Date */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Due Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        onDateChange={field.onChange}
                        placeholder="Select due date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INVOICE_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
            <CardDescription>Add items to this invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const lineTotal = calculateInvoiceLineTotal(
                watchedItems[index]?.quantity || "0",
                watchedItems[index]?.unitPrice || "0"
              );

              return (
                <div
                  key={field.id}
                  className="rounded-lg border bg-muted/30 p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Item #{index + 1}
                    </span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Description */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>
                            Description{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Item description"
                              autoComplete="off"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Category */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.category`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INVOICE_CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Unit */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.unit`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || "each"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INVOICE_UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Quantity */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Quantity <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Unit Price */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Unit Price{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className="pl-9"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Line Total */}
                    <div className="space-y-2">
                      <Label>Line Total</Label>
                      <Input
                        readOnly
                        value={formatCurrency(lineTotal)}
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => append(defaultInvoiceItem)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line Item
            </Button>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                {/* Tax Rate */}
                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Discount Amount */}
                <FormField
                  control={form.control}
                  name="discountAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({watchedTaxRate || 0}%):
                  </span>
                  <span className="font-medium">
                    {formatCurrency(taxAmount)}
                  </span>
                </div>
                {parseFloat(watchedDiscountAmount || "0") > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium text-success">
                      -{formatCurrency(parseFloat(watchedDiscountAmount || "0"))}
                    </span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes and Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Notes & Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes for the customer..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms & Conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Payment terms and conditions..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "edit" ? "Update Invoice" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
