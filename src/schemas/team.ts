import { z } from "zod";

// Team roles matching the original app
export const TEAM_ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "EMPLOYEE",
  "VIEWER",
  "CONTRACTOR",
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

// Role permissions description for UI display
export const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
  OWNER: [
    "Full access to all farm data",
    "Manage team members and roles",
    "Delete farm and transfer ownership",
    "Access all reports and analytics",
  ],
  ADMIN: [
    "View and manage all farm data",
    "Invite and manage team members",
    "Edit farm settings",
    "Access advanced reports",
    "Cannot delete farm or change owner",
  ],
  MANAGER: [
    "View and create expenses, income, inventory",
    "Manage customers and invoices",
    "Invite team members",
    "View basic reports",
    "Cannot change team roles",
  ],
  EMPLOYEE: [
    "View expenses and income",
    "Create new expenses and income",
    "View inventory and customers",
    "View basic reports",
  ],
  VIEWER: [
    "View-only access to all data",
    "Cannot create or modify any records",
    "View basic reports",
  ],
  CONTRACTOR: [
    "View and create expenses only",
    "View basic reports",
    "Limited access to farm data",
  ],
};

// Invitation statuses
export const INVITATION_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const;

export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

// Team member schema for validation
export const teamMemberSchema = z.object({
  id: z.string().uuid(),
  farm_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(TEAM_ROLES),
  permissions: z.record(z.string(), z.boolean()).optional().nullable(),
  is_active: z.boolean().default(true),
  joined_at: z.string(),
  last_login_at: z.string().optional().nullable(),
  invited_by: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type TeamMemberData = z.infer<typeof teamMemberSchema>;

// Assignable roles (excludes OWNER)
export const ASSIGNABLE_ROLES = ["ADMIN", "MANAGER", "EMPLOYEE", "VIEWER", "CONTRACTOR"] as const;

// Team invitation form schema
export const teamInvitationFormSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  role: z.enum(ASSIGNABLE_ROLES).refine((val) => val !== undefined, {
    message: "Please select a role",
  }),
  message: z.string().max(500, "Message must be less than 500 characters").optional(),
});

export type TeamInvitationFormData = z.infer<typeof teamInvitationFormSchema>;

// Team invitation schema for server-side validation
export const teamInvitationSchema = z.object({
  id: z.string().uuid().optional(),
  farm_id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(TEAM_ROLES),
  status: z.enum(INVITATION_STATUSES).default("PENDING"),
  invited_by_user_id: z.string().uuid(),
  invited_by_name: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  expires_at: z.string(),
  accepted_at: z.string().optional().nullable(),
  rejected_at: z.string().optional().nullable(),
  created_at: z.string().optional(),
});

export type TeamInvitationData = z.infer<typeof teamInvitationSchema>;

// Schema for updating team member role
export const updateTeamMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  newRole: z.enum(ASSIGNABLE_ROLES),
});

export type UpdateTeamMemberRoleData = z.infer<typeof updateTeamMemberRoleSchema>;

// Team member with user info for display
export interface TeamMemberWithUser {
  id: string;
  farm_id: string;
  user_id: string;
  role: TeamRole;
  permissions: Record<string, boolean> | null;
  is_active: boolean;
  joined_at: string;
  last_login_at: string | null;
  invited_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

// Team invitation with inviter info for display
export interface TeamInvitationWithInviter {
  id: string;
  farm_id: string;
  email: string;
  role: TeamRole;
  status: InvitationStatus;
  invited_by_user_id: string;
  invited_by_name: string | null;
  message: string | null;
  expires_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
}

// Helper function to check if a role can be assigned by another role
export function canAssignRole(assignerRole: TeamRole, targetRole: TeamRole): boolean {
  const roleHierarchy: Record<TeamRole, number> = {
    OWNER: 5,
    ADMIN: 4,
    MANAGER: 3,
    EMPLOYEE: 2,
    VIEWER: 1,
    CONTRACTOR: 1,
  };

  // Cannot assign OWNER role
  if (targetRole === "OWNER") return false;

  // Only OWNER and ADMIN can assign roles
  if (assignerRole !== "OWNER" && assignerRole !== "ADMIN") return false;

  // ADMIN cannot assign ADMIN role
  if (assignerRole === "ADMIN" && targetRole === "ADMIN") return false;

  return roleHierarchy[assignerRole] > roleHierarchy[targetRole];
}

// Helper function to check if a role can manage another role
export function canManageRole(managerRole: TeamRole, targetRole: TeamRole): boolean {
  const roleHierarchy: Record<TeamRole, number> = {
    OWNER: 5,
    ADMIN: 4,
    MANAGER: 3,
    EMPLOYEE: 2,
    VIEWER: 1,
    CONTRACTOR: 1,
  };

  // OWNER can manage everyone except themselves
  if (managerRole === "OWNER" && targetRole !== "OWNER") return true;

  // ADMIN can manage everyone except OWNER and ADMIN
  if (managerRole === "ADMIN" && roleHierarchy[targetRole] < roleHierarchy["ADMIN"]) {
    return true;
  }

  return false;
}

// Get roles that can be assigned by a given role
export function getAssignableRoles(assignerRole: TeamRole): TeamRole[] {
  if (assignerRole === "OWNER") {
    return ["ADMIN", "MANAGER", "EMPLOYEE", "VIEWER", "CONTRACTOR"];
  }
  if (assignerRole === "ADMIN") {
    return ["MANAGER", "EMPLOYEE", "VIEWER", "CONTRACTOR"];
  }
  return [];
}
