"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updateProfileSchema,
  changePasswordSchema,
  preferencesSchema,
  type UpdateProfileData,
  type PreferencesData,
} from "@/schemas/profile";

// Result type for actions
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Update user profile
export async function updateProfile(
  data: UpdateProfileData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedData = updateProfileSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    // Check if email is being changed
    const emailChanged =
      validatedData.data.email.toLowerCase() !== user.email?.toLowerCase();

    // Update profile in users table
    const { error: profileError } = await supabase
      .from("users")
      .update({
        first_name: validatedData.data.first_name,
        last_name: validatedData.data.last_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      return { success: false, error: "Failed to update profile" };
    }

    // Update email in auth if changed
    if (emailChanged) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: validatedData.data.email,
      });

      if (emailError) {
        console.error("Error updating email:", emailError);
        return {
          success: false,
          error: "Failed to update email. Please try again.",
        };
      }

      // Also update email in users table
      await supabase
        .from("users")
        .update({ email: validatedData.data.email.toLowerCase() })
        .eq("id", user.id);

      return {
        success: true,
        data: {
          message:
            "Profile updated. Please check your new email for a confirmation link.",
        } as unknown as void,
      };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Upload avatar
export async function uploadAvatar(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Please upload an image (JPEG, PNG, WebP, or GIF)",
      };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: "File size must be less than 5MB" };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `avatars/${user.id}/${timestamp}.${fileExtension}`;

    // Delete old avatar if exists
    const { data: currentUser } = await supabase
      .from("users")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    if (currentUser?.avatar_url) {
      // Extract file path from URL
      const oldPath = currentUser.avatar_url.split("/").slice(-2).join("/");
      if (oldPath.startsWith("avatars/")) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }
    }

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError);
      return { success: false, error: "Failed to upload avatar" };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    // Update user profile
    const { error: updateError } = await supabase
      .from("users")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating avatar URL:", updateError);
      return { success: false, error: "Failed to update profile" };
    }

    revalidatePath("/profile");
    return { success: true, data: { url: publicUrl } };
  } catch (error) {
    console.error("Error in uploadAvatar:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Change password
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate passwords
    const validatedData = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword: newPassword,
    });
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid password",
      };
    }

    // Verify current password by re-signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return { success: false, error: "Failed to update password" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in changePassword:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Update preferences
export async function updatePreferences(
  preferences: PreferencesData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate preferences
    const validatedData = preferencesSchema.safeParse(preferences);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid preferences",
      };
    }

    // Get current preferences
    const { data: currentUser } = await supabase
      .from("users")
      .select("preferences")
      .eq("id", user.id)
      .single();

    const currentPreferences =
      (currentUser?.preferences as Record<string, unknown>) || {};

    // Merge preferences
    const newPreferences = {
      ...currentPreferences,
      ...validatedData.data,
    };

    // Update preferences
    const { error: updateError } = await supabase
      .from("users")
      .update({
        preferences: newPreferences,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating preferences:", updateError);
      return { success: false, error: "Failed to update preferences" };
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error in updatePreferences:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Get current user profile
export async function getProfile() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return null;
    }

    // Get user profile
    const { data: profile, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error("Error in getProfile:", error);
    return null;
  }
}
