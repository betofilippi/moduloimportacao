"use client"

import * as React from "react"
import { useState } from "react"
import { Plus, Search, Filter, Download, Eye, Edit, Trash2 } from "lucide-react"

import { Layout } from "@/components/layout/layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function ProcessosPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const processes = [
    {
      id: "IMP-001",
      client: "Empresa ABC Ltda",
      status: "Em Andamento",
      value: "R$ 45.000",
      date: "2024-01-15",
      documents: 5,
      responsible: "João Silva",
    },
    {
      id: "IMP-002",
      client: "Comércio XYZ S.A.",
      status: "Concluído",
      value: "R$ 28.500",
      date: "2024-01-14",
      documents: 8,
      responsible: "Maria Santos",
    },
    {
      id: "IMP-003",
      client: "Indústria 123",
      status: "Pendente",
      value: "R$ 67.800",
      date: "2024-01-13",
      documents: 3,
      responsible: "Pedro Costa",
    },
    {
      id: "IMP-004",
      client: "Distribuidora DEF",
      status: "Em Andamento",
      value: "R$ 52.300",
      date: "2024-01-12",
      documents: 6,
      responsible: "Ana Lima",
    },
    {
      id: "IMP-005",
      client: "Exportadora GHI",
      status: "Concluído",
      value: "R$ 89.200",
      date: "2024-01-11",
      documents: 12,
      responsible: "Carlos Oliveira",
    },
  ]

  const filteredProcesses = processes.filter(process =>
    process.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    process.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    process.responsible.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluído":
        return "bg-green-100 text-green-800"
      case "Em Andamento":
        return "bg-blue-100 text-blue-800"
      case "Pendente":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Layout title="Processos de Importação" user={{ name: "João Silva", email: "joao@exemplo.com" }}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar processos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Processo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Processo de Importação</DialogTitle>
                  <DialogDescription>
                    Crie um novo processo de importação preenchendo as informações abaixo.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cliente</label>
                    <Input placeholder="Nome do cliente" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Valor</label>
                    <Input placeholder="R$ 0,00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Responsável</label>
                    <Input placeholder="Nome do responsável" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline">Cancelar</Button>
                    <Button>Criar Processo</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Process Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total de Processos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {processes.filter(p => p.status === "Em Andamento").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Concluídos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {processes.filter(p => p.status === "Concluído").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Processos</CardTitle>
            <CardDescription>
              Gerencie todos os processos de importação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcesses.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="font-medium">{process.id}</TableCell>
                    <TableCell>{process.client}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(process.status)}`}>
                        {process.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{process.value}</TableCell>
                    <TableCell>{process.date}</TableCell>
                    <TableCell>{process.documents}</TableCell>
                    <TableCell>{process.responsible}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}