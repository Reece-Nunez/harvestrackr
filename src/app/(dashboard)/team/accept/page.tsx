"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { acceptInvitation } from "@/actions/team";

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid invitation link — no token provided.");
      return;
    }

    async function accept() {
      const result = await acceptInvitation(token!);
      if (result.success) {
        setStatus("success");
        setMessage("You have successfully joined the farm!");
      } else {
        setStatus("error");
        setMessage(result.error);
      }
    }

    accept();
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>
            {status === "loading" && "Processing your invitation..."}
            {status === "success" && "Welcome to the team!"}
            {status === "error" && "Something went wrong"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "loading" && (
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600" />
              <p className="text-center text-muted-foreground">{message}</p>
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center text-muted-foreground">{message}</p>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
