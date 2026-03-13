"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { sendWelcomeEmail, sendPasswordResetEmail } from "@/lib/email";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function sendWelcomeEmailAction(
  email: string,
  firstName: string
): Promise<ActionResult> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    await sendWelcomeEmail({
      to: email,
      firstName,
      dashboardUrl: `${appUrl}/dashboard`,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return { success: false, error: "Failed to send welcome email" };
  }
}

export async function sendPasswordResetAction(
  email: string
): Promise<ActionResult> {
  try {
    const adminClient = createAdminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Generate the password reset link via Supabase admin API
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${appUrl}/api/auth/callback?next=/reset-password`,
      },
    });

    if (error) {
      console.error("Error generating reset link:", error);
      // Don't reveal whether user exists
      return { success: true };
    }

    if (data?.properties?.action_link) {
      await sendPasswordResetEmail({
        to: email,
        resetUrl: data.properties.action_link,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error in sendPasswordResetAction:", error);
    // Don't reveal errors to prevent email enumeration
    return { success: true };
  }
}
