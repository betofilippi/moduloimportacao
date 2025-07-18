"use client"

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  SignInCredentials, 
  SignUpCredentials,
  getCurrentUser,
  signIn,
  signUp,
  signOut,
  resetPassword,
  updatePassword,
  onAuthStateChange
} from '@/lib/auth'
import { sessionManager } from '@/lib/sessionManager'

interface AuthContextType {
  user: any | null
  loading: boolean
  signIn: (credentials: SignInCredentials) => Promise<any>
  signUp: (credentials: SignUpCredentials) => Promise<any>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: string; success: boolean }>
  updatePassword: (newPassword: string) => Promise<{ error?: string; success: boolean }>
  refreshUser: () => Promise<void>
  hasRole: (role: string | string[]) => boolean
  isAdmin: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Handle session expiration
  const handleSessionExpired = useCallback(() => {
    setUser(null)
    sessionManager.stopAutoRefresh()
    router.push('/auth/login?expired=true')
  }, [router])

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
        
        // If we have a user, start auto refresh
        if (currentUser) {
          sessionManager.startAutoRefresh(10) // 10 minutes
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])
  
  // Listen for auth state changes
  useEffect(() => {
    const { data } = onAuthStateChange((authUser) => {
      setUser(authUser)
      setLoading(false)
      
      // Start or stop refresh based on auth state
      if (authUser) {
        sessionManager.startAutoRefresh(10)
      } else {
        sessionManager.stopAutoRefresh()
      }
    })

    return () => {
      data.subscription.unsubscribe()
      sessionManager.stopAutoRefresh()
    }
  }, [])

  // Auth actions
  const handleSignIn = async (credentials: SignInCredentials): Promise<any> => {
    setLoading(true)
    try {
      const response = await signIn(credentials)
      if (response.success && response.user) {
        setUser(response.user)
        startSessionRefresh()
        // Force a router refresh to update server components
        router.refresh()
      }
      return response
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (credentials: SignUpCredentials): Promise<any> => {
    setLoading(true)
    try {
      const response = await signUp(credentials)
      if (response.success && response.user) {
        setUser(response.user)
        startSessionRefresh()
        // Force a router refresh to update server components
        router.refresh()
      }
      return response
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async (): Promise<void> => {
    setLoading(true)
    try {
      await signOut()
      setUser(null)
      // Force a router refresh to update server components
      router.refresh()
      router.push('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (email: string) => {
    return resetPassword(email)
  }

  const handleUpdatePassword = async (newPassword: string) => {
    return updatePassword(newPassword)
  }

  const refreshUser = async (): Promise<void> => {
    if (!user) return
    
    try {
      // First check session validity
      const { valid } = await sessionManager.checkSession()
      if (!valid) {
        handleSessionExpired()
        return
      }
      
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  // Helper functions
  const hasRole = (role: string | string[]): boolean => {
    if (!user?.user_metadata?.role) return false
    
    const userRole = user.user_metadata.role
    
    if (Array.isArray(role)) {
      return role.includes(userRole)
    }
    
    return userRole === role
  }

  const isAdmin = hasRole('admin')
  const isAuthenticated = !!user

  const value: AuthContextType = {
    user,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    updatePassword: handleUpdatePassword,
    refreshUser,
    hasRole,
    isAdmin,
    isAuthenticated,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}