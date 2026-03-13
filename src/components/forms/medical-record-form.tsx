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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import {
  medicalRecordFormSchema,
  type MedicalRecordFormData,
  MEDICAL_RECORD_TYPES,
  defaultMedicalRecordFormValues,
  medicalRecordFormToCreateData,
} from "@/schemas/inventory";
import {
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
} from "@/actions/inventory";
import type { MedicalRecord } from "@/types/database";

interface MedicalRecordFormProps {
  livestockId: string;
  record?: MedicalRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MedicalRecordForm({
  livestockId,
  record,
  open,
  onOpenChange,
  onSuccess,
}: MedicalRecordFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEditing = !!record;

  const getDefaultValues = (): MedicalRecordFormData => {
    if (record) {
      return {
        type: record.type as MedicalRecordFormData["type"],
        date: new Date(record.date),
        description: record.description,
        medicine: record.medicine,
        dosage: record.dosage,
        administeredBy: record.administered_by,
        followUpDate: record.follow_up_date
          ? new Date(record.follow_up_date)
          : null,
        notes: record.notes,
      };
    }
    return defaultMedicalRecordFormValues;
  };

  const form = useForm<MedicalRecordFormData>({
    resolver: zodResolver(medicalRecordFormSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when record changes
  React.useEffect(() => {
    if (open) {
      form.reset(getDefaultValues());
    }
  }, [open, record]);

  async function onSubmit(data: MedicalRecordFormData) {
    setIsSubmitting(true);

    try {
      const formattedData = medicalRecordFormToCreateData(data, livestockId);

      if (isEditing && record) {
        const result = await updateMedicalRecord({
          id: record.id,
          ...formattedData,
        });
        if (result.success) {
          toast.success("Medical record updated successfully");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createMedicalRecord(formattedData);
        if (result.success) {
          toast.success("Medical record added successfully");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error("Error submitting medical record:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async () => {
    if (!record) return;

    if (!confirm("Are you sure you want to delete this medical record?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await deleteMedicalRecord(record.id, livestockId);
      if (result.success) {
        toast.success("Medical record deleted successfully");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete medical record");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Medical Record" : "Add Medical Record"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the medical record details"
              : "Record a vaccination, treatment, or checkup"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEDICAL_RECORD_TYPES.map((type) => (
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
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description of the treatment"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="medicine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medicine/Vaccine</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Name of medicine"
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
                name="dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dosage</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 5ml, 2 tablets"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="administeredBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Administered By</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Vet name or self"
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
                name="followUpDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Follow-up Date</FormLabel>
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
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {isEditing ? "Update" : "Add Record"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
