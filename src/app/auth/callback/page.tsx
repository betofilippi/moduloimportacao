"use client"

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { updatePassword } from '@/lib/auth'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPasswordReset, setIsPasswordReset] = useState(false)
  
  // Password reset form state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({})

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth callback error:', error)
          setError(error.message)
          setLoading(false)
          return
        }

        const type = searchParams.get('type')
        
        if (type === 'recovery') {
          // Password recovery flow
          if (data.session) {
            setIsPasswordReset(true)
            setSuccess('Sessão de recuperação ativa. Defina sua nova senha.')
          } else {
            setError('Sessão de recuperação inválida ou expirada.')
          }
        } else if (type === 'signup') {
          // Email confirmation flow
          if (data.session) {
            setSuccess('Email confirmado com sucesso! Redirecionando...')
            setTimeout(() => {
              router.push('/dashboard')
            }, 2000)
          } else {
            setError('Falha na confirmação do email.')
          }
        } else {
          // General auth callback
          if (data.session) {
            router.push('/dashboard')
          } else {
            router.push('/auth/login')
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Erro inesperado durante a autenticação.')
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  const validatePasswordForm = () => {
    const errors: { newPassword?: string; confirmPassword?: string } = {}

    if (!newPassword.trim()) {
      errors.newPassword = 'Nova senha é obrigatória'
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Nova senha deve ter pelo menos 6 caracteres'
    }

    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Confirmação de senha é obrigatória'
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem'
    }

    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validatePasswordForm()) {
      return
    }

    setIsUpdating(true)
    setPasswordErrors({})

    try {
      const response = await updatePassword(newPassword)
      
      if (response.success) {
        toast.success('Senha atualizada com sucesso!')
        setSuccess('Senha atualizada com sucesso! Redirecionando...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        const errorMessage = response.error || 'Erro ao atualizar senha'
        setPasswordErrors({ newPassword: errorMessage })
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Password update failed:', error)
      const errorMessage = 'Erro inesperado. Tente novamente.'
      setPasswordErrors({ newPassword: errorMessage })
      toast.error(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Processando autenticação...</p>
        </div>
      </div>
    )
  }

  if (isPasswordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
            <CardDescription>
              Digite sua nova senha para concluir a recuperação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              {success && (
                <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                  <CheckCircle className="h-4 w-4" />
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={passwordErrors.newPassword ? "border-destructive pr-10" : "pr-10"}
                    disabled={isUpdating}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    disabled={isUpdating}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={passwordErrors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                    disabled={isUpdating}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isUpdating}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isUpdating}
              >
                {isUpdating ? "Atualizando..." : "Atualizar Senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {error ? (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Erro na Autenticação</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          ) : success ? (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Sucesso!</CardTitle>
              <CardDescription>{success}</CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-2xl">Processando...</CardTitle>
              <CardDescription>Aguarde enquanto processamos sua solicitação</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => router.push('/auth/login')}
              variant={error ? "default" : "outline"}
              className="w-full"
            >
              Ir para Login
            </Button>
            
            {error && (
              <Button 
                onClick={() => router.push('/auth/register')}
                variant="outline"
                className="w-full"
              >
                Criar Nova Conta
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}