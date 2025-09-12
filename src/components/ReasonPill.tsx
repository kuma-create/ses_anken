import { Badge } from "./ui/badge"

type ReasonType = 'must' | 'nice' | 'rate' | 'availability' | 'location' | 'workstyle'

interface ReasonPillProps {
  type: ReasonType
  text: string
  isPositive?: boolean
  className?: string
}

export function ReasonPill({ type, text, isPositive = true, className }: ReasonPillProps) {
  const getColor = (type: ReasonType, isPositive: boolean) => {
    if (!isPositive) {
      return 'bg-red-100 text-red-800 border-red-200'
    }
    
    switch (type) {
      case 'must':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'nice':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rate':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'availability':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'location':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'workstyle':
        return 'bg-teal-100 text-teal-800 border-teal-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getIcon = (type: ReasonType, isPositive: boolean) => {
    const iconClass = "w-3 h-3 mr-1"
    if (!isPositive) {
      return <span className={`${iconClass} text-red-500`}>✗</span>
    }
    return <span className={`${iconClass} text-current`}>✓</span>
  }

  return (
    <Badge 
      variant="outline" 
      className={`${getColor(type, isPositive)} text-xs flex items-center ${className}`}
    >
      {getIcon(type, isPositive)}
      {text}
    </Badge>
  )
}