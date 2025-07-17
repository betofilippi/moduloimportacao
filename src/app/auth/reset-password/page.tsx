"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({})
  
  const router = useRouter()
  const { resetPassword, isAuthenticated, loading } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, loading, router])

  const validateForm = () => {
    const newErrors: { email?: string } = {}

    if (!email.trim()) {
      newErrors.email = "Email é obrigatório"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Email inválido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await resetPassword(email)
      
      if (response.success) {
        setIsEmailSent(true)
        toast.success("Email de recuperação enviado com sucesso!")
      } else {
        const errorMessage = response.error || "Erro ao enviar email de recuperação"
        setErrors({ general: errorMessage })
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Password reset failed:", error)
      const errorMessage = "Erro inesperado. Tente novamente."
      setErrors({ general: errorMessage })
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Email Enviado!</CardTitle>
            <CardDescription>
              Enviamos um link de recuperação para seu email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-800">
                <p className="font-medium">Verifique sua caixa de entrada</p>
                <p className="mt-1">
                  Enviamos um link de recuperação para <strong>{email}</strong>
                </p>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Não recebeu o email?</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Verifique sua pasta de spam</li>
                <li>Aguarde alguns minutos</li>
                <li>Tente novamente com um email diferente</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => {
                  setIsEmailSent(false)
                  setEmail("")
                }}
                variant="outline"
                className="w-full"
              >
                Tentar outro email
              </Button>
              
              <Button 
                onClick={() => router.push('/auth/login')}
                className="w-full"
              >
                Voltar ao login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
          <CardDescription>
            Digite seu email para receber um link de recuperação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {errors.general}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            <Link 
              href="/auth/login" 
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}