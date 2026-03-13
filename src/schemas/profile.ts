import { z } from "zod";

// Schema for updating profile
export const updateProfileSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(50),
  last_name: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email address"),
});

export type UpdateProfileData = z.infer<typeof updateProfileSchema>;

// Schema for changing password
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

// Schema for preferences
export const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  emailNotifications: z.boolean().optional(),
  weeklyReports: z.boolean().optional(),
  marketAlerts: z.boolean().optional(),
});

export type PreferencesData = z.infer<typeof preferencesSchema>;
