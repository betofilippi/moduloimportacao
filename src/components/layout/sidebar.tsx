"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Users,
  Upload,
  Settings,
  LogOut,
  Building2,
  Package,
  Truck,
  Banknote,
  FileText,
  FileUp,
  DollarSign,
  Plane,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  ScanLine,
  FolderOpen,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiredRole?: string[]
}

interface NavGroup {
  groupLabel: string
  items: NavItem[]
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut, hasRole, isAdmin } = useAuth()

  const navItems: NavGroup[] = [
    {
      groupLabel: "Geral",
      items: [
        {
          title: "Dashboard",
          href: "/dashboard",
          icon: Home,
          requiredRole: ['admin', 'user']
        },
      ],
    },
    {
      groupLabel: "Processos",
      items: [
        {
          title: "Processos de Importação",
          href: "/processo-importacao",
          icon: FolderOpen,
          requiredRole: ['admin', 'user'],
        },
        {
          title: "Importações (Em Desenvolvimento)",
          href: "/processos",
          icon: Upload,
          requiredRole: ['admin', 'user'],
        },/*
        {
          title: "Documentos",
          href: "/processos/documentos",
          icon: FileText,
          requiredRole: ['admin', 'user', 'viewer'],
        },
        {
          title: "Declarações",
          href: "/processos/declaracoes",
          icon: FileUp,
          requiredRole: ['admin', 'user'],
        },*/
        {
          title: "OCR - Extração",
          href: "/ocr",
          icon: ScanLine,
          requiredRole: ['admin', 'user'],
        },
      ],
    },
  ]

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

  // Filter navigation items based on user role
  const filteredNavItems = navItems.map(group => ({
    ...group,
    items: group.items.filter(item => 
      !item.requiredRole || hasRole(item.requiredRole as any)
    )
  })).filter(group => group.items.length > 0)

  return (
    <div className={cn(
      "flex h-full flex-col border-r bg-background transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="text-lg font-semibold">
            Sistema ERP
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="ml-auto"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((group, index) => (
          <div key={index} className="space-y-2">
            {!collapsed && (
              <h3 className="mb-2 px-2 text-sm font-medium text-muted-foreground">
                {group.groupLabel}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname === item.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              ))}
            </div>
            {index < filteredNavItems.length - 1 && <Separator className="my-4" />}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="space-y-1">
          {isAdmin && (
            <Link
              href="/configuracoes"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === "/configuracoes"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Shield className="h-4 w-4" />
              {!collapsed && <span>Configurações</span>}
            </Link>
          )}
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              pathname === "/settings"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>Preferências</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </div>
    </div>
  )
}