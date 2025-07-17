"use client"

import * as React from "react"
import { useState } from "react"
import { BarChart3, Download, Calendar, Filter, TrendingUp, FileText, DollarSign, Package } from "lucide-react"

import { Layout } from "@/components/layout/layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function RelatoriosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")

  const reportData = [
    {
      month: "Janeiro",
      processes: 24,
      value: 1250000,
      documents: 156,
      clients: 18,
    },
    {
      month: "Fevereiro",
      processes: 31,
      value: 1580000,
      documents: 203,
      clients: 22,
    },
    {
      month: "Março",
      processes: 28,
      value: 1420000,
      documents: 181,
      clients: 20,
    },
    {
      month: "Abril",
      processes: 35,
      value: 1780000,
      documents: 225,
      clients: 25,
    },
    {
      month: "Maio",
      processes: 42,
      value: 2150000,
      documents: 271,
      clients: 28,
    },
    {
      month: "Junho",
      processes: 38,
      value: 1960000,
      documents: 245,
      clients: 24,
    },
  ]

  const topClients = [
    { name: "Empresa ABC Ltda", processes: 15, value: 750000 },
    { name: "Comércio XYZ S.A.", processes: 12, value: 640000 },
    { name: "Indústria 123", processes: 10, value: 520000 },
    { name: "Distribuidora DEF", processes: 8, value: 380000 },
    { name: "Exportadora GHI", processes: 6, value: 290000 },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const currentMonthData = reportData[reportData.length - 1]

  return (
    <Layout title="Relatórios" user={{ name: "João Silva", email: "joao@exemplo.com" }}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Período
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Processos do Mês
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonthData.processes}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12%</span> vs mês anterior
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Valor Total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(currentMonthData.value)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8%</span> vs mês anterior
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Documentos
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonthData.documents}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+15%</span> vs mês anterior
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Clientes Ativos
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonthData.clients}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+5%</span> vs mês anterior
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Evolução Mensal</CardTitle>
              <CardDescription>
                Número de processos por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                <BarChart3 className="h-16 w-16" />
                <p className="ml-4">Gráfico de evolução será implementado aqui</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
              <CardDescription>
                Status dos processos de importação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                <BarChart3 className="h-16 w-16" />
                <p className="ml-4">Gráfico de pizza será implementado aqui</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Monthly Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo Mensal</CardTitle>
              <CardDescription>
                Dados consolidados por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead>Processos</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.slice(-6).map((data) => (
                    <TableRow key={data.month}>
                      <TableCell className="font-medium">{data.month}</TableCell>
                      <TableCell>{data.processes}</TableCell>
                      <TableCell>{formatCurrency(data.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Clients Table */}
          <Card>
            <CardHeader>
              <CardTitle>Principais Clientes</CardTitle>
              <CardDescription>
                Clientes com mais processos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Processos</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClients.map((client) => (
                    <TableRow key={client.name}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.processes}</TableCell>
                      <TableCell>{formatCurrency(client.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}