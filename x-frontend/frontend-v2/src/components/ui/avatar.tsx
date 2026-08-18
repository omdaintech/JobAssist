import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const avatarVariants = cva(
    "flex items-center justify-center font-bold text-white bg-eu-blue",
    {
        variants: {
            size: {
                xs: "w-6 h-6 text-xs",
                sm: "w-8 h-8 text-sm",
                md: "w-10 h-10 text-sm",
                lg: "w-12 h-12 text-base",
                xl: "w-16 h-16 text-lg",
                "2xl": "w-24 h-24 text-2xl"
            },
            shape: {
                round: "rounded-full",
                square: "rounded-lg",
                circle: "rounded-full",
                rounded: "rounded-xl"
            },
            variant: {
                primary: "bg-eu-blue",
                secondary: "bg-eu-blue/10 text-eu-blue",
                outline: "border-2 border-eu-blue text-eu-blue bg-transparent"
            }
        },
        defaultVariants: {
            size: "md",
            shape: "round",
            variant: "primary"
        }
    }
)

export interface AvatarProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
    children: React.ReactNode
    shadow?: boolean
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, size, shape, variant, shadow, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    avatarVariants({ size, shape, variant }),
                    shadow && "shadow-lg",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        )
    }
)
Avatar.displayName = "Avatar"

export { Avatar, avatarVariants } 