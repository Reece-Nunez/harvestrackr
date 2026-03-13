import * as React from "react"
import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const spinnerVariants = cva("animate-spin text-muted-foreground", {
  variants: {
    size: {
      default: "h-4 w-4",
      sm: "h-3 w-3",
      lg: "h-6 w-6",
      xl: "h-8 w-8",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, label = "Loading...", ...props }, ref) => {
    return (
      <Loader2
        ref={ref}
        className={cn(spinnerVariants({ size, className }))}
        aria-label={label}
        {...props}
      />
    )
  }
)
Spinner.displayName = "Spinner"

function SpinnerWithText({
  text = "Loading...",
  size,
  className,
}: {
  text?: string
  size?: VariantProps<typeof spinnerVariants>["size"]
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Spinner size={size} />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  )
}

function SpinnerFullPage({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

export { Spinner, SpinnerWithText, SpinnerFullPage, spinnerVariants }
