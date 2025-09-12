import { projectId, publicAnonKey } from '../utils/supabase/info'

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-b70e7431`

export const pdfApi = {
  parseProjectPdf: async (text: string) => {
    const response = await fetch(`${API_BASE}/parse-project-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ text }),
    })

    const result = await response.json()
    return result
  },

  parseTalentPdf: async (text: string) => {
    const response = await fetch(`${API_BASE}/parse-talent-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ text }),
    })

    const result = await response.json()
    return result
  },
}