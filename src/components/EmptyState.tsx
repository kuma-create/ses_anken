import { Button } from "./ui/button"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  children?: React.ReactNode
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  children
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-sm">{description}</p>
      <div className="space-y-3">
        {actionLabel && onAction && (
          <Button onClick={onAction} className="bg-[#1E63F3] hover:bg-[#1E63F3]/90">
            {actionLabel}
          </Button>
        )}
        {children}
      </div>
    </div>
  )
}