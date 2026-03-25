import { type ReactNode } from "react"
import { Separator } from "@/components/ui/separator"

type PageTemplateProps = {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export function PageTemplate({
  title,
  description,
  actions,
  children,
}: PageTemplateProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <Separator />
      {children}
    </div>
  )
}
