import { Metadata } from "next";
import { ExpenseForm } from "@/components/forms/expense-form";

export const metadata: Metadata = {
  title: "Add Expense | HarvesTrackr",
  description: "Add a new expense to your farm",
};

export default function NewExpensePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <ExpenseForm mode="create" />
    </div>
  );
}
