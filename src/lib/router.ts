import { create } from 'zustand'

interface RouterState {
  currentPath: string
  params: Record<string, string>
  navigate: (path: string, params?: Record<string, string>) => void
}

export const useRouter = create<RouterState>((set) => ({
  currentPath: '/',
  params: {},
  navigate: (path, params = {}) => set({ currentPath: path, params }),
}))

export function matchPath(pattern: string, path: string): { match: boolean; params: Record<string, string> } {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')
  
  if (patternParts.length !== pathParts.length) {
    return { match: false, params: {} }
  }
  
  const params: Record<string, string> = {}
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]
    const pathPart = pathParts[i]
    
    if (patternPart.startsWith('[') && patternPart.endsWith(']')) {
      const paramName = patternPart.slice(1, -1)
      params[paramName] = pathPart
    } else if (patternPart !== pathPart) {
      return { match: false, params: {} }
    }
  }
  
  return { match: true, params }
}