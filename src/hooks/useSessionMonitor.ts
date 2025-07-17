import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

/**
 * Hook that monitors session validity and redirects to login when expired
 */
export function useSessionMonitor() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const checkSession = useCallback(async () => {
    if (!user) return;

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.log('Session expired or invalid, redirecting to login');
        // Sign out and redirect
        await signOut();
        router.push('/auth/login?expired=true');
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  }, [user, signOut, router]);

  useEffect(() => {
    if (!user) return;

    // Check session immediately
    checkSession();

    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);

    // Also check on window focus
    const handleFocus = () => checkSession();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, checkSession]);

  return { checkSession };
}