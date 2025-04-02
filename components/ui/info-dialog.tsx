import React from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface InfoDialogProps {
  title?: string
  children: React.ReactNode
  buttonSize?: "default" | "sm" | "lg" | "icon"
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  className?: string
}

/**
 * Reusable info dialog component for displaying detailed information about charts and visualizations.
 * @param title Dialog title (default: "Figure Notes")
 * @param children Content to display in the dialog body
 * @param buttonSize Size of the info button (default: "icon")
 * @param buttonVariant Style variant of the button (default: "ghost")
 * @param className Additional classes to apply to the button
 */
export function InfoDialog({
  title = "Figure Notes",
  children,
  buttonSize = "icon",
  buttonVariant = "ghost",
  className,
}: InfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={className || "h-8 w-8"}>
          <Info className="h-4 w-4" />
          <span className="sr-only">Figure Notes</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto dark:bg-[#2F3A2F]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
} 