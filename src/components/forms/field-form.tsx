"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

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
  fieldFormSchema,
  type FieldFormData,
  FIELD_TYPES,
  defaultFieldFormValues,
  fieldFormToCreateData,
} from "@/schemas/inventory";
import { createField, updateField, deleteField } from "@/actions/inventory";
import type { Field } from "@/types/database";

interface FieldFormProps {
  farmId: string;
  field?: Field;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function FieldForm({
  farmId,
  field,
  open,
  onOpenChange,
  onSuccess,
}: FieldFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEditing = !!field;

  const getDefaultValues = (): FieldFormData => {
    if (field) {
      return {
        name: field.name,
        acres: field.acres,
        description: field.description,
        fieldType: field.field_type as FieldFormData["fieldType"],
        notes: field.notes,
      };
    }
    return defaultFieldFormValues;
  };

  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldFormSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when field changes
  React.useEffect(() => {
    if (open) {
      form.reset(getDefaultValues());
    }
  }, [open, field]);

  async function onSubmit(data: FieldFormData) {
    setIsSubmitting(true);

    try {
      const formattedData = fieldFormToCreateData(data, farmId);

      if (isEditing && field) {
        const result = await updateField({
          id: field.id,
          ...formattedData,
        });
        if (result.success) {
          toast.success("Field updated successfully");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createField(formattedData);
        if (result.success) {
          toast.success("Field added successfully");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error("Error submitting field:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async () => {
    if (!field) return;

    if (
      !confirm(
        "Are you sure you want to delete this field? Livestock assigned to this field will be unassigned."
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await deleteField(field.id, farmId);
      if (result.success) {
        toast.success("Field deleted successfully");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete field");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Field" : "Add Field"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update field details"
              : "Add a new field, pasture, or location"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., North Pasture, Main Barn"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="acres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acres</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fieldType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FIELD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description"
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
                      placeholder="Additional notes..."
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
                {isEditing ? "Update" : "Add Field"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
