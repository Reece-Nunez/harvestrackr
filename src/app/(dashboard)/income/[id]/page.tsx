import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { IncomeForm } from "@/components/forms/income-form";

export const metadata: Metadata = {
  title: "Edit Income | HarvestTrackr",
  description: "Edit an existing income record",
};

interface EditIncomePageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getIncome(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get the income record
  const { data: income, error } = await supabase
    .from("income")
    .select(
      `
      *,
      farm:farm_id (
        id,
        owner_id
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !income) {
    return null;
  }

  // Verify user has access to this farm
  const farm = income.farm as { id: string; owner_id: string } | null;
  if (!farm) {
    return null;
  }

  if (farm.owner_id !== user.id) {
    // Check if user is a team member
    const { data: teamAccess } = await supabase
      .from("team_members")
      .select("id")
      .eq("farm_id", farm.id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!teamAccess) {
      return null;
    }
  }

  return income;
}

export default async function EditIncomePage({ params }: EditIncomePageProps) {
  const { id } = await params;
  const income = await getIncome(id);

  if (!income) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/income">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back to income</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Income</h1>
          <p className="text-muted-foreground">
            Update the income record details
          </p>
        </div>
      </div>

      {/* Form */}
      <IncomeForm income={income} mode="edit" />
    </div>
  );
}
