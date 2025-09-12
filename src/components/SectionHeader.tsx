import { Button } from "./ui/button"
import { Plus } from "lucide-react"

interface SectionHeaderProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  children?: React.ReactNode
}

export function SectionHeader({ 
  title, 
  description, 
  actionLabel, 
  onAction,
  children 
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {actionLabel && onAction && (
          <Button onClick={onAction} className="bg-[#1E63F3] hover:bg-[#1E63F3]/90">
            <Plus className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}