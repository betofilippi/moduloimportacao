import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const value = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1]
          
          return decodeURIComponent(value || '')
        },
        set(name: string, value: string, options: any) {
          const cookieOptions = [
            `${name}=${encodeURIComponent(value)}`,
            options?.maxAge && `Max-Age=${options.maxAge}`,
            options?.path && `Path=${options.path}`,
            options?.domain && `Domain=${options.domain}`,
            options?.sameSite && `SameSite=${options.sameSite}`,
            options?.secure && 'Secure',
            options?.httpOnly && 'HttpOnly'
          ].filter(Boolean).join('; ')
          
          document.cookie = cookieOptions
        },
        remove(name: string, options: any) {
          const cookieOptions = [
            `${name}=`,
            'Max-Age=0',
            options?.path && `Path=${options.path}`,
            options?.domain && `Domain=${options.domain}`
          ].filter(Boolean).join('; ')
          
          document.cookie = cookieOptions
        }
      }
    }
  )
}