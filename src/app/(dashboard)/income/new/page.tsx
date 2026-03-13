import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IncomeForm } from "@/components/forms/income-form";

export const metadata: Metadata = {
  title: "Add Income | HarvestTrackr",
  description: "Record a new income transaction for your farm",
};

export default function NewIncomePage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Add Income</h1>
          <p className="text-muted-foreground">
            Record a new income transaction for your farm
          </p>
        </div>
      </div>

      {/* Form */}
      <IncomeForm mode="create" />
    </div>
  );
}
