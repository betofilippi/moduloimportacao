/**
 * Centralized session refresh manager to prevent multiple concurrent refresh requests
 */

import { createSupabaseBrowserClient } from './supabase-browser';

class SessionManager {
  private static instance: SessionManager;
  private refreshPromise: Promise<any> | null = null;
  private lastRefreshTime: number = 0;
  private minRefreshInterval: number = 60000; // 1 minute minimum between refreshes
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Refresh session with debouncing to prevent too many requests
   */
  async refreshSession(): Promise<{ success: boolean; error?: string }> {
    const now = Date.now();
    
    // If we're already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      console.log('Session refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    // Check if enough time has passed since last refresh
    if (now - this.lastRefreshTime < this.minRefreshInterval) {
      console.log('Session refresh throttled, too soon since last refresh');
      return { success: true };
    }

    // Mark as refreshing
    this.isRefreshing = true;
    this.lastRefreshTime = now;

    // Create and store the refresh promise
    this.refreshPromise = this.performRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Session refresh error:', error.message);
        return { success: false, error: error.message };
      }

      if (!data.session) {
        console.error('No session returned after refresh');
        return { success: false, error: 'No session' };
      }

      console.log('Session refreshed successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Session refresh exception:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Start automatic session refresh
   */
  startAutoRefresh(intervalMinutes: number = 10): void {
    this.stopAutoRefresh();
    
    // Initial refresh after 1 minute
    setTimeout(() => {
      this.refreshSession();
    }, 60000);

    // Set up recurring refresh
    this.refreshTimer = setInterval(() => {
      this.refreshSession();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic session refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check if session is valid without refreshing
   */
  async checkSession(): Promise<{ valid: boolean; session: any }> {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        return { valid: false, session: null };
      }

      // Check if session is about to expire (within 5 minutes)
      const expiresAt = new Date(session.expires_at!).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiresAt - now < fiveMinutes) {
        // Session is about to expire, trigger a refresh
        console.log('Session expiring soon, triggering refresh...');
        await this.refreshSession();
      }

      return { valid: true, session };
    } catch (error) {
      console.error('Error checking session:', error);
      return { valid: false, session: null };
    }
  }
}

export const sessionManager = SessionManager.getInstance();