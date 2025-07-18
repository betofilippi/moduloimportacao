"use client"

import * as React from "react"
import { BarChart3, FileText, Package, TrendingUp, Users, DollarSign } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const stats = [
    {
      title: "Processos de Importação",
      value: "24",
      change: "+12%",
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Documentos Processados",
      value: "156",
      change: "+8%",
      icon: Package,
      color: "text-green-600",
    },
    {
      title: "Clientes Ativos",
      value: "89",
      change: "+5%",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Valor Total",
      value: "R$ 2.4M",
      change: "+15%",
      icon: DollarSign,
      color: "text-orange-600",
    },
  ]

  const recentProcesses = [
    {
      id: "IMP-001",
      client: "Empresa ABC Ltda",
      status: "Em Andamento",
      value: "R$ 45.000",
      date: "2024-01-15",
    },
    {
      id: "IMP-002",
      client: "Comércio XYZ S.A.",
      status: "Concluído",
      value: "R$ 28.500",
      date: "2024-01-14",
    },
    {
      id: "IMP-003",
      client: "Indústria 123",
      status: "Pendente",
      value: "R$ 67.800",
      date: "2024-01-13",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{stat.change}</span> em relação ao mês passado
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Processos por Mês</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <BarChart3 className="h-16 w-16" />
              <p className="ml-4">Gráfico de processos será implementado aqui</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Processes */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Processos Recentes</CardTitle>
            <CardDescription>
              Últimos processos de importação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProcesses.map((process) => (
                <div
                  key={process.id}
                  className="flex items-center justify-between border-b pb-3 last:border-b-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{process.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {process.client}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{process.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {process.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesse rapidamente as funcionalidades mais utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:bg-accent transition-colors">
              <CardContent className="flex items-center justify-center p-6">
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Novo Processo</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-accent transition-colors">
              <CardContent className="flex items-center justify-center p-6">
                <div className="text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Upload de Documentos</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-accent transition-colors">
              <CardContent className="flex items-center justify-center p-6">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Relatórios</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}