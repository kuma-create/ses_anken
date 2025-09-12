import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../utils/supabase/info'

// Build Supabase URL from project id
const supabaseUrl = `https://${projectId}.supabase.co`

// Use the official SDK to call Edge Functions.
const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: { persistSession: false },
})

async function invokeFunction<T = any>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (error) {
    const details =
      (error as any)?.message ||
      (error as any)?.error ||
      JSON.stringify(error, null, 2)
    throw new Error(`[Edge Function: ${name}] ${details}`)
  }
  return data as T
}

type ParsedProject = {
  title?: string
  description?: string
  company?: string
  location?: string
  budget?: string
  deadline?: string
}

function normalizeProject(p: any): Required<ParsedProject> {
  return {
    title: p?.title ?? "",
    description: p?.description ?? "",
    company: p?.company ?? "",
    location: p?.location ?? "",
    budget: p?.budget ?? "",
    deadline: p?.deadline ?? "",
  }
}

export const pdfApi = {
  parseProjectPdf: async (text: string) => {
    const res = await invokeFunction('parse-project-pdf', { text })
    const project = (res as any)?.project ?? res
    return normalizeProject(project)
  },
  parseTalentPdf: async (text: string) => invokeFunction('parse-talent-pdf', { text }),
}