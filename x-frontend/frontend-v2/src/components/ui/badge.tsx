import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-blue-50 text-blue-700 border-transparent",
        primary: "bg-blue-100 text-blue-800 border-transparent",
        secondary: "bg-gray-100 text-gray-800 border-transparent",
        success: "bg-green-100 text-green-800 border-transparent",
        warning: "bg-yellow-100 text-yellow-800 border-transparent",
        danger: "bg-red-100 text-red-800 border-transparent",
        info: "bg-blue-50 text-blue-600 border-transparent",
        purple: "bg-purple-100 text-purple-700 border-transparent",
        orange: "bg-orange-100 text-orange-700 border-transparent",
        outline: "border border-gray-300 bg-transparent text-gray-700",
      },
      size: {
        sm: "px-2.5 py-0.5 text-sm md:text-base", // Mobile-first, readable
        md: "px-3 py-1 text-base md:text-lg", // Default size
        lg: "px-3.5 py-1.5 text-lg md:text-xl", // Larger for emphasis
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
