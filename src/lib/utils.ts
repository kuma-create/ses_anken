import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString()}万円`
  }
  return `${amount.toLocaleString()}円`
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function getWorkStyleLabel(workStyle: string): string {
  switch (workStyle) {
    case 'onsite':
      return '出社'
    case 'remote':
      return 'リモート'
    case 'hybrid':
      return 'ハイブリッド'
    default:
      return '未設定'
  }
}