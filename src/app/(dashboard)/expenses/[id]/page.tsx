import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "@/components/forms/expense-form";
import { getExpenseById } from "@/actions/expenses";

export const metadata: Metadata = {
  title: "Edit Expense | HarvesTrackr",
  description: "Edit an existing expense",
};

async function getCurrentFarmId() {
  const cookieStore = await cookies();
  const farmId = cookieStore.get("currentFarmId")?.value;
  if (farmId) return farmId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: farms } = await supabase
    .from("farms")
    .select("id")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .limit(1);

  return farms?.[0]?.id || null;
}

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    notFound();
  }

  const expense = await getExpenseById(id, farmId);

  if (!expense) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ExpenseForm expense={expense} mode="edit" />
    </div>
  );
}
