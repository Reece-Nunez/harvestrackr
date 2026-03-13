"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  chickenFlockFormSchema,
  type ChickenFlockFormData,
  defaultChickenFlockFormValues,
  chickenFlockFormToCreateData,
} from "@/schemas/inventory";
import {
  createChickenFlock,
  updateChickenFlock,
  deleteChickenFlock,
} from "@/actions/inventory";
import type { ChickenFlock } from "@/types/database";

interface ChickenFlockFormProps {
  farmId: string;
  flock?: ChickenFlock;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChickenFlockForm({
  farmId,
  flock,
  open,
  onOpenChange,
  onSuccess,
}: ChickenFlockFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEditing = !!flock;

  const getDefaultValues = (): ChickenFlockFormData => {
    if (flock) {
      return {
        breed: flock.breed,
        count: flock.count,
        hasRooster: flock.has_rooster,
        coopLocation: flock.coop_location,
        notes: flock.notes,
      };
    }
    return defaultChickenFlockFormValues;
  };

  const form = useForm<ChickenFlockFormData>({
    resolver: zodResolver(chickenFlockFormSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when flock changes
  React.useEffect(() => {
    if (open) {
      form.reset(getDefaultValues());
    }
  }, [open, flock]);

  async function onSubmit(data: ChickenFlockFormData) {
    setIsSubmitting(true);

    try {
      const formattedData = chickenFlockFormToCreateData(data, farmId);

      if (isEditing && flock) {
        const result = await updateChickenFlock({
          id: flock.id,
          ...formattedData,
        });
        if (result.success) {
          toast.success("Flock updated successfully");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createChickenFlock(formattedData);
        if (result.success) {
          toast.success("Flock added successfully");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error("Error submitting flock:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async () => {
    if (!flock) return;

    if (
      !confirm(
        "Are you sure you want to delete this flock? All associated egg logs will also be deleted."
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await deleteChickenFlock(flock.id, farmId);
      if (result.success) {
        toast.success("Flock deleted successfully");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete flock");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Chicken Flock" : "Add Chicken Flock"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update flock details"
              : "Add a new flock of chickens to track"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="breed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Breed <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Rhode Island Red, Leghorn"
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
              name="count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Count <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Number of chickens"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Total number of chickens in this flock
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasRooster"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Has Rooster</FormLabel>
                    <FormDescription>
                      Check if this flock includes a rooster
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coopLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coop Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Main Barn, North Coop"
                      autoComplete="off"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
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
                      placeholder="Additional information about this flock..."
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

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="sm:mr-auto"
                >
                  Delete
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Update" : "Add Flock"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
