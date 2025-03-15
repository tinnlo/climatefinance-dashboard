import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  loadingText?: string
  variant?: "primary" | "secondary"
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, children, isLoading, loadingText, variant = "primary", ...props }, ref) => {
    const baseStyles = "relative transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden group"
    
    const variantStyles = {
      primary: "bg-gradient-to-r from-emerald-700/90 to-forest hover:from-emerald-800 hover:to-forest dark:from-zinc-900 dark:to-forest dark:hover:from-zinc-900 dark:hover:to-forest/90 text-white",
      secondary: "bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600 text-gray-800 dark:text-white"
    }
    
    const blurStyles = {
      primary: "bg-gradient-to-r from-emerald-700/20 to-forest/30 dark:from-zinc-900/30 dark:to-forest/40",
      secondary: "bg-gradient-to-r from-gray-200/20 to-gray-300/40 dark:from-gray-700/20 dark:to-gray-600/40"
    }
    
    return (
      <Button
        className={cn(baseStyles, variantStyles[variant], className)}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        <span className="relative z-10">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              {loadingText || "Loading..."}
            </>
          ) : (
            children
          )}
        </span>
        <div className={cn("absolute -inset-1 rounded-full blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200", blurStyles[variant])} />
      </Button>
    )
  }
)

GradientButton.displayName = "GradientButton"

export { GradientButton } 