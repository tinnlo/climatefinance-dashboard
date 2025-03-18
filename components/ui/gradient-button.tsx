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
      secondary: "bg-gradient-to-r from-[#2F3A2F]/90 to-[#4A5A4A] hover:from-[#2F3A2F] hover:to-[#4A5A4A]/90 dark:from-[#2F3A2F] dark:to-[#4A5A4A] dark:hover:from-[#2F3A2F] dark:hover:to-[#4A5A4A]/90 text-white"
    }
    
    const blurStyles = {
      primary: "bg-gradient-to-r from-emerald-700/20 to-forest/30 dark:from-zinc-900/30 dark:to-forest/40",
      secondary: "bg-gradient-to-r from-[#2F3A2F]/20 to-[#4A5A4A]/30 dark:from-[#2F3A2F]/30 dark:to-[#4A5A4A]/40"
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