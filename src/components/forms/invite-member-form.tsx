"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Info } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  teamInvitationFormSchema,
  type TeamInvitationFormData,
  type TeamRole,
  ROLE_PERMISSIONS,
  getAssignableRoles,
} from "@/schemas/team";
import { inviteTeamMember } from "@/actions/team";

interface InviteMemberFormProps {
  farmId: string;
  currentUserRole: TeamRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteMemberForm({
  farmId,
  currentUserRole,
  open,
  onOpenChange,
  onSuccess,
}: InviteMemberFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<TeamRole | null>(null);

  const assignableRoles = React.useMemo(
    () => getAssignableRoles(currentUserRole),
    [currentUserRole]
  );

  const form = useForm<TeamInvitationFormData>({
    resolver: zodResolver(teamInvitationFormSchema),
    defaultValues: {
      email: "",
      role: undefined,
      message: "",
    },
  });

  const onSubmit = async (data: TeamInvitationFormData) => {
    setIsSubmitting(true);

    try {
      const result = await inviteTeamMember(
        farmId,
        data.email,
        data.role,
        data.message
      );

      if (result.success) {
        toast.success(`Invitation sent to ${data.email}`);
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (value: string) => {
    setSelectedRole(value as TeamRole);
    form.setValue("role", value as TeamInvitationFormData["role"]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your farm. They will receive an email
            with a link to accept.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email Address <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Role <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={handleRoleChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assignableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0) + role.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the appropriate access level for this team member
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role Permissions Summary */}
            {selectedRole && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}{" "}
                    Permissions
                  </span>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {ROLE_PERMISSIONS[selectedRole].map((permission, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">-</span>
                      <span>{permission}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal message to include in the invitation email..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum 500 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* All Roles Reference */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="roles" className="border-none">
            <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline pt-0">
              View all role permissions
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 text-sm">
                {(
                  Object.entries(ROLE_PERMISSIONS) as [TeamRole, string[]][]
                ).map(([role, permissions]) => (
                  <div key={role}>
                    <h4 className="font-medium mb-1">
                      {role.charAt(0) + role.slice(1).toLowerCase()}
                    </h4>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {permissions.map((permission, index) => (
                        <li key={index} className="text-xs">
                          - {permission}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}
