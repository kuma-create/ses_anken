import { createClient } from 'npm:@supabase/supabase-js'

// Server-side Supabase client with service role key
export const createServerSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  return createClient(supabaseUrl, serviceRoleKey)
}

// Regular client for user operations
export const createClientSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  
  return createClient(supabaseUrl, anonKey)
}

export const supabase = createServerSupabaseClient()