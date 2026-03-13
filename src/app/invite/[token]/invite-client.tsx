"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Shield,
  CheckCircle,
  Loader2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { acceptInvitation } from "@/actions/team";
import type { TeamRole } from "@/schemas/team";

interface InviteClientProps {
  token: string;
  invitation: {
    id: string;
    email: string;
    role: TeamRole;
    farmName: string;
    inviterName: string;
    expiresAt: string;
    status: string;
  };
  isLoggedIn: boolean;
  userEmail: string | null;
}

export function InviteClient({
  token,
  invitation,
  isLoggedIn,
  userEmail,
}: InviteClientProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = React.useState("");

  const emailMismatch =
    isLoggedIn &&
    userEmail &&
    userEmail.toLowerCase() !== invitation.email.toLowerCase();

  const handleAccept = async () => {
    setStatus("loading");
    const result = await acceptInvitation(token);
    if (result.success) {
      setStatus("success");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } else {
      setStatus("error");
      setErrorMessage(result.error);
    }
  };

  if (status === "success") {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle>Welcome to {invitation.farmName}!</CardTitle>
          <CardDescription>
            You have successfully joined the team as{" "}
            {invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Redirecting to your dashboard...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Users className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle>You&apos;re invited!</CardTitle>
        <CardDescription>
          {invitation.inviterName} has invited you to join their farm on
          HarvesTrackr.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Invitation Details */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Farm</span>
            <span className="font-medium">{invitation.farmName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge variant="secondary">
              <Shield className="h-3 w-3 mr-1" />
              {invitation.role.charAt(0) +
                invitation.role.slice(1).toLowerCase()}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Invited by</span>
            <span className="text-sm">{invitation.inviterName}</span>
          </div>
        </div>

        {/* Email mismatch warning */}
        {emailMismatch && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20 p-3">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              This invitation was sent to{" "}
              <strong>{invitation.email}</strong>, but you&apos;re
              signed in as <strong>{userEmail}</strong>. Please sign in
              with the correct account.
            </p>
          </div>
        )}

        {/* Error message */}
        {status === "error" && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {isLoggedIn ? (
          /* Logged in — show accept button */
          <Button
            className="w-full"
            size="lg"
            onClick={handleAccept}
            disabled={status === "loading" || !!emailMismatch}
          >
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Accept Invitation
          </Button>
        ) : (
          /* Not logged in — show login/signup options */
          <>
            <p className="text-sm text-center text-muted-foreground">
              Sign in or create an account to accept this invitation.
            </p>
            <Link href={`/login?redirectTo=/invite/${token}`} className="w-full">
              <Button className="w-full" size="lg">
                Sign In to Accept
              </Button>
            </Link>
            <Link href={`/signup?redirectTo=/invite/${token}`} className="w-full">
              <Button variant="outline" className="w-full" size="lg">
                Create an Account
              </Button>
            </Link>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
