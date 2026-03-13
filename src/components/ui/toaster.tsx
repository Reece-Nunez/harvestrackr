"use client"

import { Toaster as SonnerToaster } from "sonner"
import { useTheme } from "next-themes"

interface ToasterProps {
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center"
  expand?: boolean
  richColors?: boolean
  closeButton?: boolean
  duration?: number
}

function Toaster({
  position = "bottom-right",
  expand = false,
  richColors = true,
  closeButton = true,
  duration = 4000,
}: ToasterProps) {
  const { theme } = useTheme()

  return (
    <SonnerToaster
      theme={theme as "light" | "dark" | "system" | undefined}
      position={position}
      expand={expand}
      richColors={richColors}
      closeButton={closeButton}
      duration={duration}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:border-border",
        },
      }}
    />
  )
}

export { Toaster }
