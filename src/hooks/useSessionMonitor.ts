import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { sessionManager } from '@/lib/sessionManager';

/**
 * Hook that monitors session validity and redirects to login when expired
 * Now uses centralized sessionManager to prevent multiple refresh requests
 */
export function useSessionMonitor() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const checkSession = useCallback(async () => {
    if (!user) return;

    try {
      const { valid } = await sessionManager.checkSession();

      if (!valid) {
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

    // Only check on window focus, not on interval
    // The sessionManager already handles periodic refreshes
    const handleFocus = () => {
      // Debounce focus checks
      const timeSinceLastCheck = Date.now() - (window as any).lastFocusCheck || 0;
      if (timeSinceLastCheck > 30000) { // 30 seconds minimum between focus checks
        (window as any).lastFocusCheck = Date.now();
        checkSession();
      }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, checkSession]);

  return { checkSession };
}