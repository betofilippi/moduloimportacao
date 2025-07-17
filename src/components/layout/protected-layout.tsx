"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useSessionMonitor } from '@/hooks/useSessionMonitor'
import { Header } from './header'
import { Sidebar } from './sidebar'

interface ProtectedLayoutProps {
  children: React.ReactNode
  title: string
  requiredRole?: 'admin' | 'user' | 'viewer' | string[]
}

export function ProtectedLayout({ children, title, requiredRole }: ProtectedLayoutProps) {
  const router = useRouter()
  const { user, loading, hasRole, isAuthenticated } = useAuth()
  
  // Monitor session validity
  useSessionMonitor()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (!loading && isAuthenticated && requiredRole) {
      if (!hasRole(requiredRole as any)) {
        router.push('/dashboard')
        return
      }
    }
  }, [loading, isAuthenticated, hasRole, requiredRole, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect in useEffect
  }

  if (requiredRole && !hasRole(requiredRole as any)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">🚫</div>
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}