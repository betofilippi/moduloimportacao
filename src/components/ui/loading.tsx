import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

interface LoadingProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ size = "md", text, className }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center gap-2", className)}
      >
        <Loader2 className={cn("animate-spin", sizeClasses[size])} />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    )
  }
)
Loading.displayName = "Loading"

// Page-level loading component
const PageLoading = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loading size="lg" text="Carregando..." />
    </div>
  )
}

// Card-level loading component
const CardLoading = () => {
  return (
    <div className="flex h-32 items-center justify-center">
      <Loading text="Carregando dados..." />
    </div>
  )
}

// Button loading state
const ButtonLoading = ({ text = "Carregando..." }: { text?: string }) => {
  return (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {text}
    </>
  )
}

export { Loading, PageLoading, CardLoading, ButtonLoading }