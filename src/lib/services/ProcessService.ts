import { supabaseAdmin } from '@/lib/supabase'
import { 
  ProformaInvoice, 
  ProformaInvoiceItem, 
  CommercialInvoice, 
  CommercialInvoiceItem,
  DeclaracaoImportacao,
  FechamentoImportacao,
  ProformaInvoiceInsert,
  ProformaInvoiceUpdate,
  CommercialInvoiceInsert,
  CommercialInvoiceUpdate,
  ImportProcessSummary,
  ImportProcessFilter,
  PaginationParams
} from '@/types/database'

export class ProcessService {
  private supabase = supabaseAdmin

  // Proforma Invoice operations
  async createProformaInvoice(data: ProformaInvoiceInsert): Promise<ProformaInvoice> {
    const { data: proforma, error } = await this.supabase
      .from('imp_05_proforma_invoices')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return proforma
  }

  async getProformaInvoices(
    filters: ImportProcessFilter = {},
    pagination: PaginationParams = {}
  ): Promise<{ data: ProformaInvoice[]; total: number }> {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = pagination

    let query = this.supabase
      .from('imp_05_proforma_invoices')
      .select(`
        *,
        fornecedor:cad_04_fornecedores(nome_razao_social),
        condicao_pagamento:vnd_07_condicoes_pagamento(descricao)
      `)

    // Apply filters
    if (filters.fornecedor_id) {
      query = query.eq('id_fornecedor', filters.fornecedor_id)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.data_inicio) {
      query = query.gte('data_proforma', filters.data_inicio)
    }
    if (filters.data_fim) {
      query = query.lte('data_proforma', filters.data_fim)
    }
    if (filters.numero_proforma) {
      query = query.ilike('numero_proforma', `%${filters.numero_proforma}%`)
    }
    if (filters.valor_min) {
      query = query.gte('valor_total_fob', filters.valor_min)
    }
    if (filters.valor_max) {
      query = query.lte('valor_total_fob', filters.valor_max)
    }

    // Get total count
    const { count } = await (query as any).select('*', { count: 'exact' })

    // Apply pagination and sorting
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    return {
      data: data || [],
      total: count || 0
    }
  }

  async getProformaInvoiceById(id: number): Promise<ProformaInvoice | null> {
    const { data, error } = await this.supabase
      .from('imp_05_proforma_invoices')
      .select(`
        *,
        fornecedor:cad_04_fornecedores(*),
        condicao_pagamento:vnd_07_condicoes_pagamento(*),
        items:imp_06_proforma_invoice_itens(*)
      `)
      .eq('id_proforma', id)
      .single()

    if (error) throw error
    return data
  }

  async updateProformaInvoice(id: number, data: ProformaInvoiceUpdate): Promise<ProformaInvoice> {
    const { data: updated, error } = await this.supabase
      .from('imp_05_proforma_invoices')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id_proforma', id)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  async deleteProformaInvoice(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('imp_05_proforma_invoices')
      .delete()
      .eq('id_proforma', id)

    if (error) throw error
  }

  // Proforma Invoice Items operations
  async createProformaInvoiceItem(data: any): Promise<ProformaInvoiceItem> {
    const { data: item, error } = await this.supabase
      .from('imp_06_proforma_invoice_itens')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return item
  }

  async getProformaInvoiceItems(proformaId: number): Promise<ProformaInvoiceItem[]> {
    const { data, error } = await this.supabase
      .from('imp_06_proforma_invoice_itens')
      .select(`
        *,
        produto:prd_03_produtos(codigo, descricao)
      `)
      .eq('id_proforma', proformaId)
      .order('numero_item')

    if (error) throw error
    return data || []
  }

  async updateProformaInvoiceItem(id: number, data: any): Promise<ProformaInvoiceItem> {
    const { data: updated, error } = await this.supabase
      .from('imp_06_proforma_invoice_itens')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id_item_proforma', id)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  async deleteProformaInvoiceItem(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('imp_06_proforma_invoice_itens')
      .delete()
      .eq('id_item_proforma', id)

    if (error) throw error
  }

  // Commercial Invoice operations
  async createCommercialInvoice(data: CommercialInvoiceInsert): Promise<CommercialInvoice> {
    const { data: invoice, error } = await this.supabase
      .from('imp_07_commercial_invoices')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return invoice
  }

  async getCommercialInvoices(
    filters: ImportProcessFilter = {},
    pagination: PaginationParams = {}
  ): Promise<{ data: CommercialInvoice[]; total: number }> {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = pagination

    let query = this.supabase
      .from('imp_07_commercial_invoices')
      .select(`
        *,
        proforma:imp_05_proforma_invoices(numero_proforma, id_fornecedor)
      `)

    // Apply filters
    if (filters.data_inicio) {
      query = query.gte('data_invoice', filters.data_inicio)
    }
    if (filters.data_fim) {
      query = query.lte('data_invoice', filters.data_fim)
    }
    if (filters.valor_min) {
      query = query.gte('valor_total_fob', filters.valor_min)
    }
    if (filters.valor_max) {
      query = query.lte('valor_total_fob', filters.valor_max)
    }

    // Get total count
    const { count } = await (query as any).select('*', { count: 'exact' })

    // Apply pagination and sorting
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    return {
      data: data || [],
      total: count || 0
    }
  }

  async getCommercialInvoiceById(id: number): Promise<CommercialInvoice | null> {
    const { data, error } = await this.supabase
      .from('imp_07_commercial_invoices')
      .select(`
        *,
        proforma:imp_05_proforma_invoices(*),
        items:imp_08_commercial_invoice_itens(*)
      `)
      .eq('id_commercial_invoice', id)
      .single()

    if (error) throw error
    return data
  }

  async updateCommercialInvoice(id: number, data: CommercialInvoiceUpdate): Promise<CommercialInvoice> {
    const { data: updated, error } = await this.supabase
      .from('imp_07_commercial_invoices')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id_commercial_invoice', id)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  async deleteCommercialInvoice(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('imp_07_commercial_invoices')
      .delete()
      .eq('id_commercial_invoice', id)

    if (error) throw error
  }

  // Commercial Invoice Items operations
  async createCommercialInvoiceItem(data: any): Promise<CommercialInvoiceItem> {
    const { data: item, error } = await this.supabase
      .from('imp_08_commercial_invoice_itens')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return item
  }

  async getCommercialInvoiceItems(invoiceId: number): Promise<CommercialInvoiceItem[]> {
    const { data, error } = await this.supabase
      .from('imp_08_commercial_invoice_itens')
      .select(`
        *,
        produto:prd_03_produtos(codigo, descricao)
      `)
      .eq('id_commercial_invoice', invoiceId)
      .order('numero_item')

    if (error) throw error
    return data || []
  }

  async updateCommercialInvoiceItem(id: number, data: any): Promise<CommercialInvoiceItem> {
    const { data: updated, error } = await this.supabase
      .from('imp_08_commercial_invoice_itens')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id_item_commercial', id)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  async deleteCommercialInvoiceItem(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('imp_08_commercial_invoice_itens')
      .delete()
      .eq('id_item_commercial', id)

    if (error) throw error
  }

  // Declaracao de Importacao operations
  async createDeclaracaoImportacao(data: any): Promise<DeclaracaoImportacao> {
    const { data: declaracao, error } = await this.supabase
      .from('imp_11_declaracoes_importacao')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return declaracao
  }

  async getDeclaracoesImportacao(
    filters: any = {},
    pagination: PaginationParams = {}
  ): Promise<{ data: DeclaracaoImportacao[]; total: number }> {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = pagination

    let query = this.supabase
      .from('imp_11_declaracoes_importacao')
      .select(`
        *,
        importador:cad_01_empresas(razao_social)
      `)

    // Apply filters
    if (filters.canal) {
      query = query.eq('canal', filters.canal)
    }
    if (filters.recinto_aduaneiro) {
      query = query.eq('recinto_aduaneiro', filters.recinto_aduaneiro)
    }
    if (filters.urf_despacho) {
      query = query.eq('urf_despacho', filters.urf_despacho)
    }
    if (filters.data_inicio) {
      query = query.gte('data_registro', filters.data_inicio)
    }
    if (filters.data_fim) {
      query = query.lte('data_registro', filters.data_fim)
    }

    // Get total count
    const { count } = await (query as any).select('*', { count: 'exact' })

    // Apply pagination and sorting
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    return {
      data: data || [],
      total: count || 0
    }
  }

  async getDeclaracaoImportacaoById(id: number): Promise<DeclaracaoImportacao | null> {
    const { data, error } = await this.supabase
      .from('imp_11_declaracoes_importacao')
      .select(`
        *,
        importador:cad_01_empresas(*),
        conhecimento_embarque:imp_10_conhecimentos_embarque(*)
      `)
      .eq('id_declaracao_importacao', id)
      .single()

    if (error) throw error
    return data
  }

  async updateDeclaracaoImportacao(id: number, data: any): Promise<DeclaracaoImportacao> {
    const { data: updated, error } = await this.supabase
      .from('imp_11_declaracoes_importacao')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id_declaracao_importacao', id)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  async deleteDeclaracaoImportacao(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('imp_11_declaracoes_importacao')
      .delete()
      .eq('id_declaracao_importacao', id)

    if (error) throw error
  }

  // Fechamento de Importacao operations
  async createFechamentoImportacao(data: any): Promise<FechamentoImportacao> {
    const { data: fechamento, error } = await this.supabase
      .from('imp_17_fechamentos_importacao')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return fechamento
  }

  async getFechamentosImportacao(
    filters: any = {},
    pagination: PaginationParams = {}
  ): Promise<{ data: FechamentoImportacao[]; total: number }> {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = pagination

    let query = this.supabase
      .from('imp_17_fechamentos_importacao')
      .select(`
        *,
        proforma:imp_05_proforma_invoices(numero_proforma),
        declaracao:imp_11_declaracoes_importacao(numero_di)
      `)

    // Apply filters
    if (filters.status_processo) {
      query = query.eq('status_processo', filters.status_processo)
    }
    if (filters.data_inicio) {
      query = query.gte('data_fechamento', filters.data_inicio)
    }
    if (filters.data_fim) {
      query = query.lte('data_fechamento', filters.data_fim)
    }

    // Get total count
    const { count } = await (query as any).select('*', { count: 'exact' })

    // Apply pagination and sorting
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    return {
      data: data || [],
      total: count || 0
    }
  }

  async getFechamentoImportacaoById(id: number): Promise<FechamentoImportacao | null> {
    const { data, error } = await this.supabase
      .from('imp_17_fechamentos_importacao')
      .select(`
        *,
        proforma:imp_05_proforma_invoices(*),
        declaracao:imp_11_declaracoes_importacao(*)
      `)
      .eq('id_fechamento_importacao', id)
      .single()

    if (error) throw error
    return data
  }

  async updateFechamentoImportacao(id: number, data: any): Promise<FechamentoImportacao> {
    const { data: updated, error } = await this.supabase
      .from('imp_17_fechamentos_importacao')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id_fechamento_importacao', id)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  async deleteFechamentoImportacao(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('imp_17_fechamentos_importacao')
      .delete()
      .eq('id_fechamento_importacao', id)

    if (error) throw error
  }

  // Process summary and analytics
  async getProcessSummary(
    filters: ImportProcessFilter = {},
    pagination: PaginationParams = {}
  ): Promise<{ data: ImportProcessSummary[]; total: number }> {
    const { page = 1, limit = 10, sortBy = 'data_proforma', sortOrder = 'desc' } = pagination

    let query = this.supabase
      .from('imp_05_proforma_invoices')
      .select(`
        id_proforma,
        numero_proforma,
        data_proforma,
        status,
        valor_total_fob,
        valor_total_cif,
        fornecedor:cad_04_fornecedores(nome_razao_social),
        commercial_invoices:imp_07_commercial_invoices(id_commercial_invoice),
        declaracoes:imp_11_declaracoes_importacao(id_declaracao_importacao),
        fechamentos:imp_17_fechamentos_importacao(id_fechamento_importacao)
      `)

    // Apply filters
    if (filters.fornecedor_id) {
      query = query.eq('id_fornecedor', filters.fornecedor_id)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.data_inicio) {
      query = query.gte('data_proforma', filters.data_inicio)
    }
    if (filters.data_fim) {
      query = query.lte('data_proforma', filters.data_fim)
    }

    // Get total count
    const { count } = await (query as any).select('*', { count: 'exact' })

    // Apply pagination and sorting
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    // Transform data to ImportProcessSummary format
    const summaries: ImportProcessSummary[] = (data || []).map(item => ({
      id_proforma: item.id_proforma,
      numero_proforma: item.numero_proforma,
      fornecedor: (item.fornecedor as any)?.nome_razao_social || '',
      status: item.status || 'aberto',
      valor_total_fob: item.valor_total_fob || 0,
      valor_total_cif: item.valor_total_cif || 0,
      data_proforma: item.data_proforma,
      has_commercial_invoice: (item.commercial_invoices || []).length > 0,
      has_declaracao_importacao: (item.declaracoes || []).length > 0,
      has_fechamento: (item.fechamentos || []).length > 0
    }))

    return {
      data: summaries,
      total: count || 0
    }
  }

  // Process statistics
  async getProcessStats(filters: ImportProcessFilter = {}) {
    let query = this.supabase
      .from('imp_05_proforma_invoices')
      .select('status, valor_total_fob, valor_total_cif, data_proforma')

    // Apply filters
    if (filters.fornecedor_id) {
      query = query.eq('id_fornecedor', filters.fornecedor_id)
    }
    if (filters.data_inicio) {
      query = query.gte('data_proforma', filters.data_inicio)
    }
    if (filters.data_fim) {
      query = query.lte('data_proforma', filters.data_fim)
    }

    const { data, error } = await query

    if (error) throw error

    // Calculate statistics
    const stats = {
      total_processes: data?.length || 0,
      total_fob: data?.reduce((sum, item) => sum + (item.valor_total_fob || 0), 0) || 0,
      total_cif: data?.reduce((sum, item) => sum + (item.valor_total_cif || 0), 0) || 0,
      by_status: data?.reduce((acc, item) => {
        const status = item.status || 'aberto'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {},
      average_fob: data?.length ? (data.reduce((sum, item) => sum + (item.valor_total_fob || 0), 0) / data.length) : 0,
      average_cif: data?.length ? (data.reduce((sum, item) => sum + (item.valor_total_cif || 0), 0) / data.length) : 0
    }

    return stats
  }

  // Bulk operations
  async bulkUpdateStatus(ids: number[], status: string): Promise<void> {
    const { error } = await this.supabase
      .from('imp_05_proforma_invoices')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .in('id_proforma', ids)

    if (error) throw error
  }

  async bulkDeleteProformaInvoices(ids: number[]): Promise<void> {
    const { error } = await this.supabase
      .from('imp_05_proforma_invoices')
      .delete()
      .in('id_proforma', ids)

    if (error) throw error
  }

  // Search operations
  async searchProcesses(searchTerm: string, limit = 10): Promise<ProformaInvoice[]> {
    const { data, error } = await this.supabase
      .from('imp_05_proforma_invoices')
      .select(`
        *,
        fornecedor:cad_04_fornecedores(nome_razao_social)
      `)
      .or(`numero_proforma.ilike.%${searchTerm}%,observacoes.ilike.%${searchTerm}%`)
      .limit(limit)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}

export const processService = new ProcessService()