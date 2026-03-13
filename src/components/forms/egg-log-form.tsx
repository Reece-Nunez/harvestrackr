"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import {
  eggLogFormSchema,
  type EggLogFormData,
  eggLogFormToCreateData,
} from "@/schemas/inventory";
import { createEggLog } from "@/actions/inventory";
import type { ChickenFlock } from "@/types/database";

interface EggLogFormProps {
  flocks: ChickenFlock[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultFlockId?: string;
}

export function EggLogForm({
  flocks,
  open,
  onOpenChange,
  onSuccess,
  defaultFlockId,
}: EggLogFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<EggLogFormData>({
    resolver: zodResolver(eggLogFormSchema),
    defaultValues: {
      flockId: defaultFlockId || "",
      date: new Date(),
      eggsCollected: 0,
      notes: "",
    },
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        flockId: defaultFlockId || "",
        date: new Date(),
        eggsCollected: 0,
        notes: "",
      });
    }
  }, [open, defaultFlockId]);

  async function onSubmit(data: EggLogFormData) {
    setIsSubmitting(true);

    try {
      const formattedData = eggLogFormToCreateData(data);
      const result = await createEggLog(formattedData);

      if (result.success) {
        toast.success("Egg log added successfully");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error submitting egg log:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Log Eggs Collected</DialogTitle>
          <DialogDescription>
            Record the number of eggs collected from a flock
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="flockId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Flock <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a flock" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {flocks.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No flocks available
                        </SelectItem>
                      ) : (
                        flocks.map((flock) => (
                          <SelectItem key={flock.id} value={flock.id}>
                            {flock.breed} ({flock.count} chickens)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                            <span>Select date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eggsCollected"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Eggs Collected <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Number of eggs collected from this flock
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any notes about this collection..."
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || flocks.length === 0}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Log Eggs
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
