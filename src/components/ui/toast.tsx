"use client"

import { toast as sonnerToast, type ExternalToast } from "sonner"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react"

type ToastType = "success" | "error" | "warning" | "info" | "loading"

interface ToastOptions extends ExternalToast {
  type?: ToastType
}

const iconMap = {
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <XCircle className="h-5 w-5 text-destructive" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  info: <Info className="h-5 w-5 text-info" />,
  loading: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
}

function toast(message: string, options?: ToastOptions) {
  const { type, ...rest } = options || {}

  if (type === "loading") {
    return sonnerToast.loading(message, rest)
  }

  if (type && iconMap[type]) {
    return sonnerToast(message, {
      icon: iconMap[type],
      ...rest,
    })
  }

  return sonnerToast(message, rest)
}

toast.success = (message: string, options?: ExternalToast) =>
  sonnerToast.success(message, {
    icon: iconMap.success,
    ...options,
  })

toast.error = (message: string, options?: ExternalToast) =>
  sonnerToast.error(message, {
    icon: iconMap.error,
    ...options,
  })

toast.warning = (message: string, options?: ExternalToast) =>
  sonnerToast.warning(message, {
    icon: iconMap.warning,
    ...options,
  })

toast.info = (message: string, options?: ExternalToast) =>
  sonnerToast.info(message, {
    icon: iconMap.info,
    ...options,
  })

toast.loading = (message: string, options?: ExternalToast) =>
  sonnerToast.loading(message, {
    icon: iconMap.loading,
    ...options,
  })

toast.promise = <T,>(
  promise: Promise<T> | (() => Promise<T>),
  options: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: unknown) => string)
  }
) =>
  sonnerToast.promise(promise, {
    loading: options.loading,
    success: options.success,
    error: options.error,
  })

toast.dismiss = (toastId?: string | number) => sonnerToast.dismiss(toastId)

toast.custom = sonnerToast.custom

export { toast }
