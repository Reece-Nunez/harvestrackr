import { Metadata } from "next";
import { CustomerForm } from "@/components/forms/customer-form";

export const metadata: Metadata = {
  title: "Add Customer | HarvesTrackr",
  description: "Add a new customer to your farm",
};

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <CustomerForm mode="create" />
    </div>
  );
}
