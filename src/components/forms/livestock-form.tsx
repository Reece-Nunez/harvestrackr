"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarIcon,
  DollarSign,
  Loader2,
  Tag,
  Scale,
} from "lucide-react";

import { cn } from "@/lib/utils";
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
import { useFarm } from "@/components/providers/farm-provider";
import {
  livestockFormSchema,
  type LivestockFormData,
  SPECIES_OPTIONS,
  LIVESTOCK_GENDERS,
  LIVESTOCK_STATUSES,
  defaultLivestockFormValues,
  livestockFormToCreateData,
} from "@/schemas/inventory";
import { createLivestock, updateLivestock } from "@/actions/inventory";
import type { Livestock, Field } from "@/types/database";

interface LivestockFormProps {
  livestock?: Livestock & { field?: Field | null };
  fields?: Field[];
  mode?: "create" | "edit";
}

export function LivestockForm({
  livestock,
  fields = [],
  mode = "create",
}: LivestockFormProps) {
  const router = useRouter();
  const { currentFarm } = useFarm();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEditing = mode === "edit" && livestock;

  const getDefaultValues = (): LivestockFormData => {
    if (livestock) {
      return {
        name: livestock.name,
        species: livestock.species,
        breed: livestock.breed,
        tagNumber: livestock.tag_number,
        birthDate: livestock.birth_date ? new Date(livestock.birth_date) : null,
        weight: livestock.weight,
        gender: livestock.gender as LivestockFormData["gender"],
        status: livestock.status as LivestockFormData["status"],
        fieldId: livestock.field_id,
        acquisitionDate: livestock.acquisition_date
          ? new Date(livestock.acquisition_date)
          : null,
        acquisitionCost: livestock.acquisition_cost,
        notes: livestock.notes,
      };
    }
    return defaultLivestockFormValues;
  };

  const form = useForm<LivestockFormData>({
    resolver: zodResolver(livestockFormSchema),
    defaultValues: getDefaultValues(),
  });

  const watchStatus = form.watch("status");

  async function onSubmit(data: LivestockFormData) {
    if (!currentFarm?.id) {
      toast.error("Please select a farm first");
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedData = livestockFormToCreateData(data, currentFarm.id);

      if (isEditing && livestock) {
        const result = await updateLivestock({
          id: livestock.id,
          ...formattedData,
        });
        if (result.success) {
          toast.success("Livestock updated successfully");
          router.push("/inventory/livestock");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createLivestock(formattedData);
        if (result.success) {
          toast.success("Livestock added successfully");
          router.push("/inventory/livestock");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error("Error submitting livestock:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCancel = () => {
    router.push("/inventory/livestock");
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">
          {isEditing ? "Edit Livestock" : "Add Livestock"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Update the animal's information"
            : "Add a new animal to your farm"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        placeholder="Animal's name"
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
                name="species"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Species <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select species" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SPECIES_OPTIONS.map((species) => (
                          <SelectItem key={species} value={species}>
                            {species}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breed</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Angus, Yorkshire"
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
                name="tagNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Tag className="inline-block w-4 h-4 mr-1" />
                      Tag Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Tag or ear number"
                        autoComplete="off"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Birth Date</FormLabel>
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
                name="acquisitionDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Acquisition Date</FormLabel>
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

            {/* Physical Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Scale className="inline-block w-4 h-4 mr-1" />
                      Weight (lbs)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
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
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LIVESTOCK_GENDERS.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {gender.charAt(0) + gender.slice(1).toLowerCase()}
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
                name="acquisitionCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <DollarSign className="inline-block w-4 h-4 mr-1" />
                      Cost
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status and Field */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LIVESTOCK_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0) + status.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Current status of the animal
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fieldId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field/Location</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                      disabled={watchStatus === "SOLD" || watchStatus === "DECEASED"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No field assigned</SelectItem>
                        {fields.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Where the animal is located
                    </FormDescription>
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about this animal..."
                      className="resize-none"
                      rows={4}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
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
                disabled={isSubmitting}
                className="w-full sm:w-auto sm:ml-auto"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Livestock" : "Add Livestock"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
