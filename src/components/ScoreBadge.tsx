import { Badge } from "./ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { Decision } from "../lib/types"

interface ScoreBadgeProps {
  decision: Decision
  score: number
  className?: string
}

export function ScoreBadge({ decision, score, className }: ScoreBadgeProps) {
  const getVariant = (decision: Decision) => {
    switch (decision) {
      case 'A':
        return 'default' // blue
      case 'B':
        return 'secondary' // amber
      case 'C':
        return 'outline' // slate
      default:
        return 'outline'
    }
  }

  const getColor = (decision: Decision) => {
    switch (decision) {
      case 'A':
        return 'bg-blue-500 text-white'
      case 'B':
        return 'bg-amber-500 text-white'
      case 'C':
        return 'bg-slate-500 text-white'
      default:
        return 'bg-slate-500 text-white'
    }
  }

  const getText = (decision: Decision) => {
    switch (decision) {
      case 'A':
        return '推奨'
      case 'B':
        return '検討'
      case 'C':
        return '見送り'
      default:
        return '未判定'
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant={getVariant(decision)}
            className={`${getColor(decision)} ${className}`}
          >
            {decision} - {getText(decision)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>総合スコア: {score}点</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}