import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

/**
 * Client-side Supabase client for browser usage
 * Uses anonymous key and row-level security
 */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

/**
 * Server-side Supabase client for API routes and server actions
 * Uses service role key to bypass RLS (use with caution)
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Create a server-side client with user context
 * Useful for server components that need to respect RLS
 */
export const createServerClient = (accessToken?: string) => {
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: accessToken ? {
          Authorization: `Bearer ${accessToken}`
        } : {}
      }
    }
  )
}

// Type exports for client instances
export type SupabaseClient = typeof supabase
export type SupabaseAdmin = typeof supabaseAdmin

// Custom error class for Supabase operations
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'SupabaseError'
  }
}

/**
 * Handle Supabase errors and convert them to custom error format
 */
export const handleSupabaseError = (error: any): SupabaseError => {
  if (error?.code) {
    return new SupabaseError(
      error.message || 'An error occurred',
      error.code,
      error.details
    )
  }
  
  return new SupabaseError(
    error?.message || 'An unknown error occurred'
  )
}

/**
 * Utility function to check if user is authenticated
 */
export const isAuthenticated = async (client: SupabaseClient = supabase): Promise<boolean> => {
  try {
    const { data: { user }, error } = await client.auth.getUser()
    return !error && !!user
  } catch {
    return false
  }
}

/**
 * Get current user with error handling
 */
export const getCurrentUser = async (client: SupabaseClient = supabase) => {
  try {
    const { data: { user }, error } = await client.auth.getUser()
    if (error) throw handleSupabaseError(error)
    return user
  } catch (error) {
    throw error instanceof SupabaseError ? error : handleSupabaseError(error)
  }
}

export default supabase