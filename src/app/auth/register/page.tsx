"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, Eye, EyeOff, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { UserRole } from "@/types/database"
import { toast } from "sonner"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nome_completo: "",
    email: "",
    password: "",
    confirmPassword: "",
    telefone: "",
    role: "user" as UserRole
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number
    feedback: string[]
  }>({ score: 0, feedback: [] })
  
  const router = useRouter()
  const { signUp, isAuthenticated, loading } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, loading, router])

  const calculatePasswordStrength = (password: string) => {
    const checks = [
      { regex: /.{8,}/, message: "Pelo menos 8 caracteres" },
      { regex: /[a-z]/, message: "Pelo menos uma letra minúscula" },
      { regex: /[A-Z]/, message: "Pelo menos uma letra maiúscula" },
      { regex: /[0-9]/, message: "Pelo menos um número" },
      { regex: /[^A-Za-z0-9]/, message: "Pelo menos um caractere especial" }
    ]

    const passedChecks = checks.filter(check => check.regex.test(password))
    const failedChecks = checks.filter(check => !check.regex.test(password))

    setPasswordStrength({
      score: passedChecks.length,
      feedback: failedChecks.map(check => check.message)
    })
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nome_completo.trim()) {
      newErrors.nome_completo = "Nome é obrigatório"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido"
    }

    if (!formData.password.trim()) {
      newErrors.password = "Senha é obrigatória"
    } else if (passwordStrength.score < 3) {
      newErrors.password = "Senha muito fraca"
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirmação de senha é obrigatória"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem"
    }

    if (formData.telefone && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(formData.telefone)) {
      newErrors.telefone = "Formato inválido. Use (XX) XXXXX-XXXX"
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
      const response = await signUp({
        email: formData.email,
        password: formData.password,
        nome_completo: formData.nome_completo,
        telefone: formData.telefone || undefined,
        role: formData.role
      })
      
      if (response.success) {
        toast.success("Conta criada com sucesso! Verifique seu email para confirmar.")
        router.push("/auth/login")
      } else {
        const errorMessage = response.error?.message || "Erro ao criar conta"
        setErrors({ general: errorMessage })
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Registration failed:", error)
      const errorMessage = "Erro inesperado. Tente novamente."
      setErrors({ general: errorMessage })
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (field === 'password') {
      calculatePasswordStrength(value)
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
    }
    return value
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Registrar-se</CardTitle>
          <CardDescription>
            Crie uma nova conta para acessar o sistema
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
              <Label htmlFor="nome_completo">Nome Completo</Label>
              <Input
                id="nome_completo"
                type="text"
                placeholder="Seu nome completo"
                value={formData.nome_completo}
                onChange={(e) => handleInputChange('nome_completo', e.target.value)}
                className={errors.nome_completo ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {errors.nome_completo && (
                <p className="text-sm text-destructive">{errors.nome_completo}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone (opcional)</Label>
              <Input
                id="telefone"
                type="tel"
                placeholder="(XX) XXXXX-XXXX"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', formatPhoneNumber(e.target.value))}
                className={errors.telefone ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {errors.telefone && (
                <p className="text-sm text-destructive">{errors.telefone}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Perfil</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => handleInputChange('role', value)}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.role ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione seu perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 w-full rounded-full ${
                          i < passwordStrength.score
                            ? passwordStrength.score < 3
                              ? "bg-red-500"
                              : passwordStrength.score < 4
                              ? "bg-yellow-500"
                              : "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {passwordStrength.feedback.map((feedback, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-500" />
                          {feedback}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            Já tem uma conta?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}