"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { updateFarm, FARM_TYPES, type UpdateFarmData } from "@/actions/farm";
import type { Farm, FarmType } from "@/types/database";

// Form schema
const farmSettingsFormSchema = z.object({
  name: z.string().min(1, "Farm name is required").max(100),
  farm_type: z.enum([
    "CROP",
    "LIVESTOCK",
    "DAIRY",
    "POULTRY",
    "MIXED",
    "ORGANIC",
    "VINEYARD",
    "ORCHARD",
    "AQUACULTURE",
    "OTHER",
  ] as const),
  description: z.string().max(500).optional(),
  acres: z.string().optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  business_registration: z.string().max(100).optional(),
  tax_id: z.string().max(100).optional(),
  phone_number: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  established_year: z.string().optional(),
});

type FarmSettingsFormData = z.infer<typeof farmSettingsFormSchema>;

interface FarmSettingsFormProps {
  farm: Farm;
  canEdit: boolean;
}

const FARM_TYPE_LABELS: Record<FarmType, string> = {
  CROP: "Crop Farm",
  LIVESTOCK: "Livestock Farm",
  DAIRY: "Dairy Farm",
  POULTRY: "Poultry Farm",
  MIXED: "Mixed Farm",
  ORGANIC: "Organic Farm",
  VINEYARD: "Vineyard",
  ORCHARD: "Orchard",
  AQUACULTURE: "Aquaculture",
  OTHER: "Other",
};

export function FarmSettingsForm({ farm, canEdit }: FarmSettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FarmSettingsFormData>({
    resolver: zodResolver(farmSettingsFormSchema),
    defaultValues: {
      name: farm.name,
      farm_type: farm.farm_type,
      description: farm.description || "",
      acres: farm.acres?.toString() || "",
      address: farm.address || "",
      city: farm.city || "",
      state: farm.state || "",
      zip_code: farm.zip_code || "",
      country: farm.country || "US",
      business_registration: farm.business_registration || "",
      tax_id: farm.tax_id || "",
      phone_number: farm.phone_number || "",
      email: farm.email || "",
      website: farm.website || "",
      established_year: farm.established_year?.toString() || "",
    },
  });

  const onSubmit = async (data: FarmSettingsFormData) => {
    if (!canEdit) {
      toast.error("You do not have permission to edit farm settings");
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData: UpdateFarmData = {
        name: data.name,
        farm_type: data.farm_type,
        description: data.description || undefined,
        acres: data.acres ? parseFloat(data.acres) : undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zip_code: data.zip_code || undefined,
        country: data.country || undefined,
        business_registration: data.business_registration || undefined,
        tax_id: data.tax_id || undefined,
        phone_number: data.phone_number || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
        established_year: data.established_year
          ? parseInt(data.established_year)
          : undefined,
      };

      const result = await updateFarm(farm.id, updateData);

      if (result.success) {
        toast.success("Farm settings updated successfully");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error updating farm:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Farm Information */}
        <Card>
          <CardHeader>
            <CardTitle>Farm Information</CardTitle>
            <CardDescription>
              Basic information about your farm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Farm Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter farm name"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="farm_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Farm Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!canEdit}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select farm type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FARM_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {FARM_TYPE_LABELS[type]}
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
                    <Textarea
                      placeholder="Brief description of your farm"
                      className="resize-none"
                      rows={3}
                      disabled={!canEdit}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="acres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Acres</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="established_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Established Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1800"
                        max={new Date().getFullYear()}
                        placeholder={new Date().getFullYear().toString()}
                        disabled={!canEdit}
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

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Farm address and location details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Farm Road"
                      disabled={!canEdit}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="City"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="State"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP/Postal Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12345"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="United States"
                      disabled={!canEdit}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              Business and tax-related information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="business_registration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Registration Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Registration number"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      State or federal business registration
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID / EIN</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="XX-XXXXXXX"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Employer Identification Number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              How customers and partners can reach you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@farm.com"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://www.yourfarm.com"
                      disabled={!canEdit}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
