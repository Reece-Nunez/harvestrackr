import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { LandingContent } from "@/components/marketing/landing-content";

export default async function Home() {
  // Check if user is logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Otherwise, show the landing page
  return (
    <div className="w-full min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-8">
        <MarketingHeader />
        <main>
          <LandingContent />
        </main>
      </div>
      <MarketingFooter />
    </div>
  );
}
