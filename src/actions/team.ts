"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  teamInvitationFormSchema,
  updateTeamMemberRoleSchema,
  type TeamMemberWithUser,
  type TeamInvitationWithInviter,
  type TeamRole,
  canManageRole,
} from "@/schemas/team";

// Result type for actions
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Get team members for a farm
export async function getTeamMembers(
  farmId: string
): Promise<ActionResult<TeamMemberWithUser[]>> {
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

    // Fetch team members with user info (using hint for user_id relationship)
    const { data: teamMembers, error } = await supabase
      .from("team_members")
      .select(
        `
        *,
        user:users!team_members_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          avatar_url
        )
      `
      )
      .eq("farm_id", farmId)
      .eq("is_active", true)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching team members:", error);
      return { success: false, error: "Failed to fetch team members" };
    }

    // Transform the data to match the expected type
    const transformedMembers: TeamMemberWithUser[] = (teamMembers || []).map((member) => ({
      ...member,
      permissions: member.permissions as Record<string, boolean> | null,
      user: member.user as TeamMemberWithUser['user'],
    }));

    return { success: true, data: transformedMembers };
  } catch (error) {
    console.error("Error in getTeamMembers:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Get pending invitations for a farm
export async function getPendingInvitations(
  farmId: string
): Promise<ActionResult<TeamInvitationWithInviter[]>> {
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

    // Fetch pending invitations
    const { data: invitations, error } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("farm_id", farmId)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invitations:", error);
      return { success: false, error: "Failed to fetch invitations" };
    }

    return { success: true, data: invitations as TeamInvitationWithInviter[] };
  } catch (error) {
    console.error("Error in getPendingInvitations:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Invite a team member
export async function inviteTeamMember(
  farmId: string,
  email: string,
  role: string,
  message?: string
): Promise<ActionResult<{ id: string }>> {
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
    const validatedData = teamInvitationFormSchema.safeParse({ email, role, message });
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    // Check if user has permission to invite
    const { data: currentMember, error: memberError } = await supabase
      .from("team_members")
      .select("role")
      .eq("farm_id", farmId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (memberError || !currentMember) {
      return { success: false, error: "You are not a member of this farm" };
    }

    const currentRole = currentMember.role as TeamRole;
    if (currentRole !== "OWNER" && currentRole !== "ADMIN" && currentRole !== "MANAGER") {
      return { success: false, error: "You do not have permission to invite members" };
    }

    // Get user info for invitation
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const inviterName =
      userData?.first_name && userData?.last_name
        ? `${userData.first_name} ${userData.last_name}`
        : user.email || "Farm Team";

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from("team_invitations")
      .select("id")
      .eq("farm_id", farmId)
      .eq("email", email.toLowerCase())
      .eq("status", "PENDING")
      .single();

    if (existingInvitation) {
      return { success: false, error: "An invitation has already been sent to this email" };
    }

    // Check if user is already a member
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existingUser) {
      const { data: existingMember } = await supabase
        .from("team_members")
        .select("id")
        .eq("farm_id", farmId)
        .eq("user_id", existingUser.id)
        .eq("is_active", true)
        .single();

      if (existingMember) {
        return { success: false, error: "This user is already a member of the farm" };
      }
    }

    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const { data: invitation, error: inviteError } = await supabase
      .from("team_invitations")
      .insert({
        farm_id: farmId,
        email: email.toLowerCase(),
        role: validatedData.data.role,
        status: "PENDING",
        invited_by_user_id: user.id,
        invited_by_name: inviterName,
        message: validatedData.data.message || null,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return { success: false, error: "Failed to create invitation" };
    }

    // Send invitation email via Supabase auth magic link
    // The invited user will get an email to sign up / sign in
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { data: farmData } = await supabase
      .from("farms")
      .select("name")
      .eq("id", farmId)
      .single();

    const farmName = farmData?.name || "a farm";

    try {
      // Use Supabase's built-in email to invite or notify the user
      const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(
        email.toLowerCase(),
        {
          redirectTo: `${appUrl}/team/accept?token=${invitation.id}`,
          data: {
            invited_to_farm: farmName,
            invited_by: inviterName,
            role: validatedData.data.role,
          },
        }
      );

      if (emailError) {
        // Non-fatal: invitation is created, email just didn't send
        console.warn("Could not send invitation email:", emailError.message);
      }
    } catch (emailErr) {
      console.warn("Email sending failed:", emailErr);
    }

    revalidatePath("/team");
    return { success: true, data: { id: invitation.id } };
  } catch (error) {
    console.error("Error in inviteTeamMember:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Update team member role
export async function updateTeamMemberRole(
  memberId: string,
  newRole: string
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
    const validatedData = updateTeamMemberRoleSchema.safeParse({ memberId, newRole });
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    // Get target member info
    const { data: targetMember, error: targetError } = await supabase
      .from("team_members")
      .select("farm_id, role, user_id")
      .eq("id", memberId)
      .single();

    if (targetError || !targetMember) {
      return { success: false, error: "Team member not found" };
    }

    // Check if user has permission
    const { data: currentMember, error: memberError } = await supabase
      .from("team_members")
      .select("role")
      .eq("farm_id", targetMember.farm_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (memberError || !currentMember) {
      return { success: false, error: "You are not a member of this farm" };
    }

    const currentRole = currentMember.role as TeamRole;
    const targetRole = targetMember.role as TeamRole;

    // Cannot change OWNER role
    if (targetRole === "OWNER") {
      return { success: false, error: "Cannot change the owner's role" };
    }

    // Check if user can manage this role
    if (!canManageRole(currentRole, targetRole)) {
      return { success: false, error: "You do not have permission to change this member's role" };
    }

    // Update role
    const { error: updateError } = await supabase
      .from("team_members")
      .update({
        role: validatedData.data.newRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (updateError) {
      console.error("Error updating role:", updateError);
      return { success: false, error: "Failed to update role" };
    }

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Error in updateTeamMemberRole:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Remove team member
export async function removeTeamMember(memberId: string): Promise<ActionResult> {
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

    // Get target member info
    const { data: targetMember, error: targetError } = await supabase
      .from("team_members")
      .select("farm_id, role, user_id")
      .eq("id", memberId)
      .single();

    if (targetError || !targetMember) {
      return { success: false, error: "Team member not found" };
    }

    // Cannot remove OWNER
    if (targetMember.role === "OWNER") {
      return { success: false, error: "Cannot remove the farm owner" };
    }

    // Check if user has permission
    const { data: currentMember, error: memberError } = await supabase
      .from("team_members")
      .select("role")
      .eq("farm_id", targetMember.farm_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (memberError || !currentMember) {
      return { success: false, error: "You are not a member of this farm" };
    }

    const currentRole = currentMember.role as TeamRole;
    const targetRole = targetMember.role as TeamRole;

    // Check if user can manage this role
    if (!canManageRole(currentRole, targetRole)) {
      return { success: false, error: "You do not have permission to remove this member" };
    }

    // Soft delete - set is_active to false
    const { error: deleteError } = await supabase
      .from("team_members")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (deleteError) {
      console.error("Error removing member:", deleteError);
      return { success: false, error: "Failed to remove team member" };
    }

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Error in removeTeamMember:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Cancel invitation
export async function cancelInvitation(invitationId: string): Promise<ActionResult> {
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

    // Get invitation info
    const { data: invitation, error: inviteError } = await supabase
      .from("team_invitations")
      .select("farm_id, status")
      .eq("id", invitationId)
      .single();

    if (inviteError || !invitation) {
      return { success: false, error: "Invitation not found" };
    }

    if (invitation.status !== "PENDING") {
      return { success: false, error: "Only pending invitations can be cancelled" };
    }

    // Check if user has permission
    const { data: currentMember, error: memberError } = await supabase
      .from("team_members")
      .select("role")
      .eq("farm_id", invitation.farm_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (memberError || !currentMember) {
      return { success: false, error: "You are not a member of this farm" };
    }

    const currentRole = currentMember.role as TeamRole;
    if (currentRole !== "OWNER" && currentRole !== "ADMIN") {
      return { success: false, error: "You do not have permission to cancel invitations" };
    }

    // Cancel invitation
    const { error: cancelError } = await supabase
      .from("team_invitations")
      .update({ status: "CANCELLED" })
      .eq("id", invitationId);

    if (cancelError) {
      console.error("Error cancelling invitation:", cancelError);
      return { success: false, error: "Failed to cancel invitation" };
    }

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Error in cancelInvitation:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Resend invitation
export async function resendInvitation(invitationId: string): Promise<ActionResult> {
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

    // Get invitation info
    const { data: invitation, error: inviteError } = await supabase
      .from("team_invitations")
      .select("farm_id, status, email")
      .eq("id", invitationId)
      .single();

    if (inviteError || !invitation) {
      return { success: false, error: "Invitation not found" };
    }

    if (invitation.status !== "PENDING") {
      return { success: false, error: "Only pending invitations can be resent" };
    }

    // Check if user has permission
    const { data: currentMember, error: memberError } = await supabase
      .from("team_members")
      .select("role")
      .eq("farm_id", invitation.farm_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (memberError || !currentMember) {
      return { success: false, error: "You are not a member of this farm" };
    }

    const currentRole = currentMember.role as TeamRole;
    if (currentRole !== "OWNER" && currentRole !== "ADMIN") {
      return { success: false, error: "You do not have permission to resend invitations" };
    }

    // Update expiry date
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    const { error: updateError } = await supabase
      .from("team_invitations")
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq("id", invitationId);

    if (updateError) {
      console.error("Error resending invitation:", updateError);
      return { success: false, error: "Failed to resend invitation" };
    }

    // Resend invitation email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    try {
      const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(
        invitation.email,
        {
          redirectTo: `${appUrl}/team/accept?token=${invitationId}`,
        }
      );
      if (emailError) {
        console.warn("Could not resend invitation email:", emailError.message);
      }
    } catch (emailErr) {
      console.warn("Email resend failed:", emailErr);
    }

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Error in resendInvitation:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Accept invitation (for invitation acceptance flow)
export async function acceptInvitation(token: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Please sign in to accept the invitation" };
    }

    // Get invitation by ID (token is the invitation ID for now)
    const { data: invitation, error: inviteError } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("id", token)
      .eq("status", "PENDING")
      .single();

    if (inviteError || !invitation) {
      return { success: false, error: "Invitation not found or already processed" };
    }

    // Check if invitation is for this user
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      return { success: false, error: "This invitation is for a different email address" };
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from("team_invitations")
        .update({ status: "EXPIRED" })
        .eq("id", token);
      return { success: false, error: "This invitation has expired" };
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("farm_id", invitation.farm_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (existingMember) {
      return { success: false, error: "You are already a member of this farm" };
    }

    // Create team member
    const { error: memberError } = await supabase.from("team_members").insert({
      farm_id: invitation.farm_id,
      user_id: user.id,
      role: invitation.role,
      is_active: true,
      joined_at: new Date().toISOString(),
      invited_by: invitation.invited_by_user_id,
    });

    if (memberError) {
      console.error("Error creating team member:", memberError);
      return { success: false, error: "Failed to join the farm" };
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from("team_invitations")
      .update({
        status: "ACCEPTED",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", token);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
    }

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Error in acceptInvitation:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Get current user's role in a farm
export async function getUserRole(farmId: string): Promise<ActionResult<TeamRole>> {
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

    // Get user's team member record
    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .select("role")
      .eq("farm_id", farmId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (memberError || !member) {
      return { success: false, error: "You are not a member of this farm" };
    }

    return { success: true, data: member.role as TeamRole };
  } catch (error) {
    console.error("Error in getUserRole:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
