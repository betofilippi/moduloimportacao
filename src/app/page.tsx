"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { PageLoading } from "@/components/ui/loading"

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    // Aguarda o carregamento do estado de autenticação
    if (!loading) {
      if (isAuthenticated) {
        // Usuário autenticado - redireciona para dashboard
        router.push("/dashboard")
      } else {
        // Usuário não autenticado - redireciona para login
        router.push("/auth/login")
      }
    }
  }, [isAuthenticated, loading, router])

  // Mostra loading enquanto verifica autenticação
  return <PageLoading />
}
