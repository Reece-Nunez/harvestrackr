import { createClient } from "@/lib/supabase/server";
import { getInvitationDetails } from "@/actions/team";
import { InviteClient } from "./invite-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  // Fetch invitation details (public, uses admin client)
  const result = await getInvitationDetails(token);

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle>Invalid Invitation</CardTitle>
          <CardDescription>
            This invitation link is invalid or has been removed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/login">
            <Button variant="outline">Go to Login</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const invitation = result.data;

  // Check if expired
  if (new Date(invitation.expiresAt) < new Date()) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle>Invitation Expired</CardTitle>
          <CardDescription>
            This invitation has expired. Please ask the farm administrator to
            send a new one.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/login">
            <Button variant="outline">Go to Login</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Check if already accepted/cancelled
  if (invitation.status !== "PENDING") {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-3">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle>Invitation {invitation.status.toLowerCase()}</CardTitle>
          <CardDescription>
            This invitation has already been {invitation.status.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/login">
            <Button variant="outline">Go to Login</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Check if user is logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <InviteClient
      token={token}
      invitation={invitation}
      isLoggedIn={!!user}
      userEmail={user?.email || null}
    />
  );
}
