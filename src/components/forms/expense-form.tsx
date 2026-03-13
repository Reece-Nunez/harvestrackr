"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  DollarSign,
  Plus,
  Trash2,
  Upload,
  X,
  Loader2,
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
  expenseFormSchema,
  type ExpenseFormData,
  type LineItemFormData,
  type ExpenseWithLineItems,
  EXPENSE_CATEGORIES,
  defaultLineItem,
  defaultExpenseFormValues,
  calculateLineTotal,
  calculateGrandTotal,
  formDataToCreateData,
} from "@/schemas/expense";
import {
  createExpense,
  updateExpense,
  uploadReceiptImage,
} from "@/actions/expenses";

interface ExpenseFormProps {
  expense?: ExpenseWithLineItems;
  mode?: "create" | "edit";
}

export function ExpenseForm({ expense, mode = "create" }: ExpenseFormProps) {
  const router = useRouter();
  const { currentFarm } = useFarm();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [receiptPreview, setReceiptPreview] = React.useState<string | null>(
    expense?.receipt_image_url || null
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Convert existing expense to form data
  const getDefaultValues = (): ExpenseFormData => {
    if (expense) {
      return {
        date: new Date(expense.date),
        vendor: expense.vendor || "",
        notes: expense.notes || "",
        lineItems: expense.expense_line_items.map((item) => ({
          id: item.id,
          item: item.item,
          category: item.category as (typeof EXPENSE_CATEGORIES)[number],
          quantity: String(item.quantity),
          unitCost: String(item.unit_cost),
        })),
        receiptImage: null,
      };
    }
    return defaultExpenseFormValues;
  };

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: getDefaultValues(),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watchedLineItems = form.watch("lineItems");
  const grandTotal = React.useMemo(
    () => calculateGrandTotal(watchedLineItems),
    [watchedLineItems]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("receiptImage", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceiptImage = () => {
    form.setValue("receiptImage", null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    if (!currentFarm) {
      toast.error("Please select a farm first");
      return;
    }

    setIsSubmitting(true);

    try {
      let receiptImageUrl = expense?.receipt_image_url || null;

      // Upload receipt image if provided
      if (data.receiptImage) {
        const formData = new FormData();
        formData.append("file", data.receiptImage);
        const uploadResult = await uploadReceiptImage(formData);
        if (!uploadResult.success) {
          toast.error(uploadResult.error);
          setIsSubmitting(false);
          return;
        }
        receiptImageUrl = uploadResult.data?.url || null;
      }

      // Prepare data for submission
      const submitData = formDataToCreateData(
        data,
        currentFarm.id,
        receiptImageUrl
      );

      if (mode === "edit" && expense) {
        const result = await updateExpense({
          id: expense.id,
          ...submitData,
        });
        if (result.success) {
          toast.success("Expense updated successfully");
          router.push("/expenses");
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createExpense(submitData);
        if (result.success) {
          toast.success("Expense created successfully");
          router.push("/expenses");
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error("Error submitting expense:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/expenses");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "edit" ? "Edit Expense" : "New Expense"}
            </CardTitle>
            <CardDescription>
              {mode === "edit"
                ? "Update the expense details below"
                : "Enter the details of your expense below"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date and Vendor */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Date <span className="text-destructive">*</span>
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

              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Vendor/Supplier <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter vendor name"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Receipt Image */}
            <div className="space-y-2">
              <Label>Receipt Image (Optional)</Label>
              <div className="flex items-start gap-4">
                {receiptPreview ? (
                  <div className="relative">
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="h-32 w-32 rounded-md object-cover border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6"
                      onClick={removeReceiptImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="mt-2 text-xs text-muted-foreground">
                      Upload
                    </span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
            <CardDescription>
              Add the items for this expense
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const lineTotal = calculateLineTotal(
                watchedLineItems[index]?.quantity || "0",
                watchedLineItems[index]?.unitCost || "0"
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
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.item`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Item <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter item name"
                              autoComplete="off"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.category`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Category <span className="text-destructive">*</span>
                          </FormLabel>
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
                              {EXPENSE_CATEGORIES.map((category) => (
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
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.unitCost`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Unit Cost <span className="text-destructive">*</span>
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

                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Quantity <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
              onClick={() => append(defaultLineItem)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line Item
            </Button>

            {/* Grand Total */}
            <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
              <span className="text-lg font-semibold">Grand Total</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(grandTotal)}
              </span>
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
            {mode === "edit" ? "Update Expense" : "Create Expense"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
