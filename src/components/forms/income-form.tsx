"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  CalendarIcon,
  Loader2,
  DollarSign,
  Package,
  CreditCard,
  FileText,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useFarm } from "@/components/providers/farm-provider";
import { createIncome, updateIncome, getActiveLivestock } from "@/actions/income";
import {
  incomeSchema,
  ITEM_TYPES,
  PAYMENT_METHODS,
  type IncomeFormData,
} from "@/schemas/income";
import type { Income, Livestock } from "@/types/database";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/components/ui/toast";

interface IncomeFormProps {
  income?: Income;
  mode?: "create" | "edit";
}

type LivestockOption = Pick<Livestock, "id" | "name" | "species" | "tag_number">;

export function IncomeForm({ income, mode = "create" }: IncomeFormProps) {
  const router = useRouter();
  const { currentFarm } = useFarm();
  const [isPending, startTransition] = useTransition();
  const [livestockOptions, setLivestockOptions] = useState<LivestockOption[]>([]);
  const [lastEditedField, setLastEditedField] = useState<"price" | "amount" | null>(null);

  const isEditing = mode === "edit" && income;

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      date: income?.date ? new Date(income.date) : new Date(),
      item: (income?.item as IncomeFormData["item"]) || undefined,
      quantity: income?.quantity || 0,
      price: income?.price || 0,
      amount: income?.amount || 0,
      paymentMethod: (income?.payment_method as IncomeFormData["paymentMethod"]) || undefined,
      notes: income?.notes || "",
      livestockId: income?.livestock_id || undefined,
    },
  });

  const watchItem = form.watch("item");
  const watchQuantity = form.watch("quantity");
  const watchPrice = form.watch("price");
  const watchAmount = form.watch("amount");

  // Fetch active livestock when item is "Animal"
  useEffect(() => {
    if (watchItem === "Animal" && currentFarm?.id) {
      getActiveLivestock(currentFarm.id).then((livestock) => {
        setLivestockOptions(livestock);
      });
    } else {
      setLivestockOptions([]);
      form.setValue("livestockId", undefined);
    }
  }, [watchItem, currentFarm?.id, form]);

  // Auto-calculate price or amount based on which field was last edited
  useEffect(() => {
    const quantity = watchQuantity || 0;
    const price = watchPrice || 0;
    const amount = watchAmount || 0;

    if (quantity > 0) {
      if (lastEditedField === "amount" && amount > 0) {
        // Calculate price from amount and quantity
        const calculatedPrice = amount / quantity;
        if (Math.abs(calculatedPrice - price) > 0.01) {
          form.setValue("price", parseFloat(calculatedPrice.toFixed(2)));
        }
      } else if (lastEditedField === "price" && price > 0) {
        // Calculate amount from price and quantity
        const calculatedAmount = price * quantity;
        if (Math.abs(calculatedAmount - amount) > 0.01) {
          form.setValue("amount", parseFloat(calculatedAmount.toFixed(2)));
        }
      }
    }
  }, [watchQuantity, watchPrice, watchAmount, lastEditedField, form]);

  // Recalculate when quantity changes
  useEffect(() => {
    const quantity = watchQuantity || 0;
    const price = watchPrice || 0;

    if (quantity > 0 && price > 0 && lastEditedField !== "amount") {
      const calculatedAmount = price * quantity;
      form.setValue("amount", parseFloat(calculatedAmount.toFixed(2)));
    }
  }, [watchQuantity, watchPrice, form, lastEditedField]);

  async function onSubmit(data: IncomeFormData) {
    if (!currentFarm?.id) {
      toast.error("Please select a farm first");
      return;
    }

    startTransition(async () => {
      try {
        let result;

        if (isEditing && income) {
          result = await updateIncome(income.id, currentFarm.id, data);
        } else {
          result = await createIncome(currentFarm.id, data);
        }

        if (result.success) {
          toast.success(
            isEditing
              ? "Income record updated successfully"
              : "Income record created successfully"
          );
          router.push("/income");
          router.refresh();
        } else {
          toast.error(result.error || "Something went wrong");
        }
      } catch (error) {
        console.error("Form submission error:", error);
        toast.error("An unexpected error occurred");
      }
    });
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">
          {isEditing ? "Edit Income" : "Add Income"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Update the income record details below"
            : "Record a new income transaction for your farm"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Date Field */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>
                    Date <span className="text-destructive">*</span>
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Select a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method Field */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <CreditCard className="inline-block w-4 h-4 mr-1" />
                    Payment Method
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Item Sold Field */}
            <FormField
              control={form.control}
              name="item"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Package className="inline-block w-4 h-4 mr-1" />
                    Item Sold <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ITEM_TYPES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Livestock Selector - Only shown when item is "Animal" */}
            {watchItem === "Animal" && (
              <FormField
                control={form.control}
                name="livestockId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Animal (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select animal to link" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {livestockOptions.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No active livestock found
                          </SelectItem>
                        ) : (
                          livestockOptions.map((animal) => (
                            <SelectItem key={animal.id} value={animal.id}>
                              {animal.name} ({animal.species})
                              {animal.tag_number && ` - #${animal.tag_number}`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Selecting an animal will mark it as &quot;Sold&quot; when this income
                      is saved.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Quantity and Price Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Weight/Quantity <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g., 12 (dozens) or 50 (lbs)"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <DollarSign className="inline-block w-4 h-4 mr-1" />
                      Price Per Unit
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                          onChange={(e) => {
                            setLastEditedField("price");
                            const value = parseFloat(e.target.value) || 0;
                            field.onChange(value);
                          }}
                        />
                      </div>
                    </FormControl>
                    {lastEditedField === "amount" && watchQuantity > 0 && (
                      <FormDescription className="text-xs italic">
                        Auto-calculated from total / quantity
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Amount Field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <DollarSign className="inline-block w-4 h-4 mr-1" />
                    Total Amount <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                        onChange={(e) => {
                          setLastEditedField("amount");
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value);
                        }}
                      />
                    </div>
                  </FormControl>
                  {lastEditedField === "price" && watchQuantity > 0 && (
                    <FormDescription className="text-xs italic">
                      Auto-calculated from price x quantity
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes Field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <FileText className="inline-block w-4 h-4 mr-1" />
                    Notes (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional details about this income..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/income")}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => form.reset()}
                className="w-full sm:w-auto"
              >
                Clear
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto sm:ml-auto"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Income" : "Save Income"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
