"use client"

import * as React from "react"
import { useState } from "react"
import { Save, User, Bell, Shield, Database, Globe, Moon, Sun } from "lucide-react"

import { Layout } from "@/components/layout/layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function ConfiguracoesPage() {
  const [userSettings, setUserSettings] = useState({
    name: "João Silva",
    email: "joao@exemplo.com",
    phone: "(11) 99999-9999",
    company: "Empresa ABC Ltda",
  })

  const [systemSettings, setSystemSettings] = useState({
    theme: "light",
    language: "pt-BR",
    timezone: "America/Sao_Paulo",
    currency: "BRL",
  })

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  })

  const handleUserSettingsChange = (field: string, value: string) => {
    setUserSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleSystemSettingsChange = (field: string, value: string) => {
    setSystemSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    // TODO: Implement save logic
    console.log("Saving settings...")
  }

  return (
    <Layout title="Configurações" user={{ name: "João Silva", email: "joao@exemplo.com" }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Configurações do Sistema</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie suas preferências e configurações do sistema
            </p>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>

        {/* User Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil do Usuário
            </CardTitle>
            <CardDescription>
              Configure suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={userSettings.name}
                  onChange={(e) => handleUserSettingsChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userSettings.email}
                  onChange={(e) => handleUserSettingsChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={userSettings.phone}
                  onChange={(e) => handleUserSettingsChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  value={userSettings.company}
                  onChange={(e) => handleUserSettingsChange("company", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Configurações do Sistema
            </CardTitle>
            <CardDescription>
              Configure preferências do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Tema</Label>
                <select
                  id="theme"
                  value={systemSettings.theme}
                  onChange={(e) => handleSystemSettingsChange("theme", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                  <option value="system">Sistema</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <select
                  id="language"
                  value={systemSettings.language}
                  onChange={(e) => handleSystemSettingsChange("language", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Fuso Horário</Label>
                <select
                  id="timezone"
                  value={systemSettings.timezone}
                  onChange={(e) => handleSystemSettingsChange("timezone", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
                  <option value="America/New_York">New York (UTC-5)</option>
                  <option value="Europe/London">London (UTC+0)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moeda</Label>
                <select
                  id="currency"
                  value={systemSettings.currency}
                  onChange={(e) => handleSystemSettingsChange("currency", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="BRL">Real (R$)</option>
                  <option value="USD">Dólar ($)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure como você deseja receber notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações por email
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => handleNotificationChange("email", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Push</p>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações push no navegador
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.push}
                  onChange={(e) => handleNotificationChange("push", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">SMS</p>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações por SMS
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.sms}
                  onChange={(e) => handleNotificationChange("sms", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança
            </CardTitle>
            <CardDescription>
              Configure opções de segurança da conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                Alterar Senha
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Autenticação em Duas Etapas
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Histórico de Login
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Backup e Dados
            </CardTitle>
            <CardDescription>
              Configure backup e gerenciamento de dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                Fazer Backup dos Dados
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Importar Dados
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Exportar Dados
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}