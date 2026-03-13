"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  MoreHorizontal,
  Mail,
  Clock,
  RefreshCw,
  X,
  Shield,
  Users,
  Trash2,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { InviteMemberForm } from "@/components/forms/invite-member-form";
import {
  type TeamMemberWithUser,
  type TeamInvitationWithInviter,
  type TeamRole,
  canManageRole,
  getAssignableRoles,
} from "@/schemas/team";
import {
  updateTeamMemberRole,
  removeTeamMember,
  cancelInvitation,
  resendInvitation,
} from "@/actions/team";

interface TeamManagementProps {
  farmId: string;
  farmName: string;
  currentUserRole: TeamRole;
  currentUserId: string;
  initialMembers: TeamMemberWithUser[];
  initialInvitations: TeamInvitationWithInviter[];
}

export function TeamManagement({
  farmId,
  farmName,
  currentUserRole,
  currentUserId,
  initialMembers,
  initialInvitations,
}: TeamManagementProps) {
  const router = useRouter();
  const [members, setMembers] = React.useState(initialMembers);
  const [invitations, setInvitations] = React.useState(initialInvitations);
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [memberToDelete, setMemberToDelete] = React.useState<TeamMemberWithUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const canInvite =
    currentUserRole === "OWNER" ||
    currentUserRole === "ADMIN" ||
    currentUserRole === "MANAGER";
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    setIsLoading(true);
    try {
      const result = await updateTeamMemberRole(memberId, newRole);
      if (result.success) {
        toast.success("Role updated successfully");
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to update role");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToDelete) return;

    setIsLoading(true);
    try {
      const result = await removeTeamMember(memberToDelete.id);
      if (result.success) {
        toast.success("Team member removed");
        setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to remove team member");
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setIsLoading(true);
    try {
      const result = await cancelInvitation(invitationId);
      if (result.success) {
        toast.success("Invitation cancelled");
        setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to cancel invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setIsLoading(true);
    try {
      const result = await resendInvitation(invitationId);
      if (result.success) {
        toast.success("Invitation resent");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to resend invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  const getRoleBadgeVariant = (role: TeamRole) => {
    switch (role) {
      case "OWNER":
        return "default";
      case "ADMIN":
        return "secondary";
      case "MANAGER":
        return "outline";
      default:
        return "outline";
    }
  };

  const memberColumns: ColumnDef<TeamMemberWithUser>[] = [
    {
      accessorKey: "user",
      header: "Member",
      cell: ({ row }) => {
        const member = row.original;
        const user = member.user;
        const fullName =
          user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : user?.email || "Unknown User";

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatar_url || undefined} />
              <AvatarFallback>
                {getInitials(user?.first_name, user?.last_name, user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{fullName}</span>
              <span className="text-xs text-muted-foreground">
                {user?.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const role = row.original.role as TeamRole;
        return (
          <Badge variant={getRoleBadgeVariant(role)}>
            {role.charAt(0) + role.slice(1).toLowerCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "joined_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Joined" />
      ),
      cell: ({ row }) => {
        const joinedAt = row.original.joined_at;
        return (
          <span className="text-sm text-muted-foreground">
            {format(new Date(joinedAt), "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      accessorKey: "last_login_at",
      header: "Last Login",
      cell: ({ row }) => {
        const lastLogin = row.original.last_login_at;
        return lastLogin ? (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(lastLogin), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Never</span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const member = row.original;
        const memberRole = member.role as TeamRole;
        const isCurrentUser = member.user_id === currentUserId;
        const canManageMember = canManageRole(currentUserRole, memberRole);
        const assignableRoles = getAssignableRoles(currentUserRole);

        if (isCurrentUser || memberRole === "OWNER" || !canManage) {
          return null;
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {canManageMember && assignableRoles.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Shield className="mr-2 h-4 w-4" />
                    Change Role
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {assignableRoles.map((role) => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => handleRoleChange(member.id, role)}
                        disabled={role === memberRole || isLoading}
                      >
                        {role.charAt(0) + role.slice(1).toLowerCase()}
                        {role === memberRole && " (current)"}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {canManageMember && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      setMemberToDelete(member);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Member
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            Manage team members for {farmName}
          </p>
        </div>
        {canInvite && (
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={memberColumns}
            data={members}
            searchKey="user"
            searchPlaceholder="Search members..."
            showPagination={members.length > 10}
          />
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {canManage && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {invitations.length} pending invitation
              {invitations.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {invitation.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">
                          {invitation.role.charAt(0) +
                            invitation.role.slice(1).toLowerCase()}
                        </Badge>
                        <span>-</span>
                        <Clock className="h-3 w-3" />
                        <span>
                          Expires{" "}
                          {formatDistanceToNow(new Date(invitation.expires_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvitation(invitation.id)}
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancelInvitation(invitation.id)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No invitations message */}
      {canManage && invitations.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending invitations. Click &quot;Invite Member&quot; to add team
              members.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invite Member Dialog */}
      <InviteMemberForm
        farmId={farmId}
        currentUserRole={currentUserRole}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {memberToDelete?.user?.first_name && memberToDelete?.user?.last_name
                  ? `${memberToDelete.user.first_name} ${memberToDelete.user.last_name}`
                  : memberToDelete?.user?.email}
              </strong>{" "}
              from the team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
