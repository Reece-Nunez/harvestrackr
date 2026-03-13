"use client";

import { toast } from "@/components/ui/toast";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning";
}

export function useToast() {
  const showToast = ({ title, description, variant = "default" }: ToastProps) => {
    const message = title || description || "";
    const options = description && title ? { description } : undefined;

    switch (variant) {
      case "destructive":
        toast.error(message, options);
        break;
      case "success":
        toast.success(message, options);
        break;
      case "warning":
        toast.warning(message, options);
        break;
      default:
        toast(message, options);
    }
  };

  return { toast: showToast };
}
