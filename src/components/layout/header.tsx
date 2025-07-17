"use client"

import * as React from "react"
import { Bell, Search, User, LogOut, Settings, UserCircle, Shield } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const router = useRouter()
  const { user, signOut, isAdmin } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success("Logout realizado com sucesso!")
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout failed:", error)
      toast.error("Erro ao fazer logout")
    }
  }

  const getUserInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="text-xs">Admin</Badge>
      case 'user':
        return <Badge variant="default" className="text-xs">Usuário</Badge>
      case 'viewer':
        return <Badge variant="secondary" className="text-xs">Visualizador</Badge>
      default:
        return null
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-64 pl-10"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-xs"></span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-4 text-sm text-muted-foreground">
              Nenhuma notificação no momento
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                {getUserInitials(user?.user_metadata?.nome_completo)}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">
                    {user?.user_metadata?.nome_completo || "Usuário"}
                  </p>
                  {getRoleBadge(user?.user_metadata?.role)}
                </div>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || "usuario@exemplo.com"}
                </p>
                {user?.user_metadata?.telefone && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.user_metadata.telefone}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => router.push('/profile')}
              className="cursor-pointer"
            >
              <UserCircle className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            
            {isAdmin && (
              <DropdownMenuItem 
                onClick={() => router.push('/configuracoes')}
                className="cursor-pointer"
              >
                <Shield className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem 
              onClick={() => router.push('/settings')}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Preferências
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}