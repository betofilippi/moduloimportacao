import { supabaseAdmin } from '@/lib/supabase'
import { 
  DocumentoImportacao,
  TipoDocumento,
  PaginationParams
} from '@/types/database'

export class DocumentService {
  private supabase = supabaseAdmin

  // Main document operations
  async createDocument(data: {
    id_proforma?: number
    id_commercial_invoice?: number
    id_packing_list?: number
    id_conhecimento_embarque?: number
    id_declaracao_importacao?: number
    id_nota_fiscal?: number
    tipo_documento: TipoDocumento
    numero_documento?: string
    data_documento?: string
    arquivo_anexo?: string
    observacoes?: string
  }): Promise<DocumentoImportacao> {
    const { data: document, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return document
  }

  async getDocuments(
    filters: {
      tipo_documento?: TipoDocumento
      id_proforma?: number
      id_commercial_invoice?: number
      id_declaracao_importacao?: number
      data_inicio?: string
      data_fim?: string
      numero_documento?: string
    } = {},
    pagination: PaginationParams = {}
  ): Promise<{ data: DocumentoImportacao[]; total: number }> {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = pagination

    let query = this.supabase
      .from('imp_13_documentos_importacao')
      .select(`
        *,
        proforma:imp_05_proforma_invoices(numero_proforma),
        commercial_invoice:imp_07_commercial_invoices(numero_invoice),
        declaracao:imp_11_declaracoes_importacao(numero_di)
      `)

    // Apply filters
    if (filters.tipo_documento) {
      query = query.eq('tipo_documento', filters.tipo_documento)
    }
    if (filters.id_proforma) {
      query = query.eq('id_proforma', filters.id_proforma)
    }
    if (filters.id_commercial_invoice) {
      query = query.eq('id_commercial_invoice', filters.id_commercial_invoice)
    }
    if (filters.id_declaracao_importacao) {
      query = query.eq('id_declaracao_importacao', filters.id_declaracao_importacao)
    }
    if (filters.data_inicio) {
      query = query.gte('data_documento', filters.data_inicio)
    }
    if (filters.data_fim) {
      query = query.lte('data_documento', filters.data_fim)
    }
    if (filters.numero_documento) {
      query = query.ilike('numero_documento', `%${filters.numero_documento}%`)
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

  async getDocumentById(id: number): Promise<DocumentoImportacao | null> {
    const { data, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .select(`
        *,
        proforma:imp_05_proforma_invoices(*),
        commercial_invoice:imp_07_commercial_invoices(*),
        declaracao:imp_11_declaracoes_importacao(*)
      `)
      .eq('id_documento_importacao', id)
      .single()

    if (error) throw error
    return data
  }

  async updateDocument(id: number, data: {
    tipo_documento?: TipoDocumento
    numero_documento?: string
    data_documento?: string
    arquivo_anexo?: string
    observacoes?: string
  }): Promise<DocumentoImportacao> {
    const { data: updated, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id_documento_importacao', id)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  async deleteDocument(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .delete()
      .eq('id_documento_importacao', id)

    if (error) throw error
  }

  // Get documents by process
  async getDocumentsByProforma(proformaId: number): Promise<DocumentoImportacao[]> {
    const { data, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .select('*')
      .eq('id_proforma', proformaId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getDocumentsByCommercialInvoice(invoiceId: number): Promise<DocumentoImportacao[]> {
    const { data, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .select('*')
      .eq('id_commercial_invoice', invoiceId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getDocumentsByDeclaracaoImportacao(declaracaoId: number): Promise<DocumentoImportacao[]> {
    const { data, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .select('*')
      .eq('id_declaracao_importacao', declaracaoId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Document type operations
  async getDocumentsByType(tipoDocumento: TipoDocumento): Promise<DocumentoImportacao[]> {
    const { data, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .select(`
        *,
        proforma:imp_05_proforma_invoices(numero_proforma),
        commercial_invoice:imp_07_commercial_invoices(numero_invoice),
        declaracao:imp_11_declaracoes_importacao(numero_di)
      `)
      .eq('tipo_documento', tipoDocumento)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Document statistics
  async getDocumentStats(filters: {
    data_inicio?: string
    data_fim?: string
    tipo_documento?: TipoDocumento
  } = {}) {
    let query = this.supabase
      .from('imp_13_documentos_importacao')
      .select('tipo_documento, created_at')

    // Apply filters
    if (filters.data_inicio) {
      query = query.gte('created_at', filters.data_inicio)
    }
    if (filters.data_fim) {
      query = query.lte('created_at', filters.data_fim)
    }
    if (filters.tipo_documento) {
      query = query.eq('tipo_documento', filters.tipo_documento)
    }

    const { data, error } = await query

    if (error) throw error

    // Calculate statistics
    const stats = {
      total_documents: data?.length || 0,
      by_type: data?.reduce((acc, item) => {
        const type = item.tipo_documento
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {},
      by_month: data?.reduce((acc, item) => {
        const month = new Date(item.created_at).toISOString().slice(0, 7) // YYYY-MM
        acc[month] = (acc[month] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
    }

    return stats
  }

  // Search operations
  async searchDocuments(searchTerm: string, limit = 10): Promise<DocumentoImportacao[]> {
    const { data, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .select(`
        *,
        proforma:imp_05_proforma_invoices(numero_proforma),
        commercial_invoice:imp_07_commercial_invoices(numero_invoice),
        declaracao:imp_11_declaracoes_importacao(numero_di)
      `)
      .or(`numero_documento.ilike.%${searchTerm}%,observacoes.ilike.%${searchTerm}%`)
      .limit(limit)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Bulk operations
  async bulkUpdateDocumentType(ids: number[], tipoDocumento: TipoDocumento): Promise<void> {
    const { error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .update({ 
        tipo_documento: tipoDocumento, 
        updated_at: new Date().toISOString() 
      })
      .in('id_documento_importacao', ids)

    if (error) throw error
  }

  async bulkDeleteDocuments(ids: number[]): Promise<void> {
    const { error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .delete()
      .in('id_documento_importacao', ids)

    if (error) throw error
  }

  // Document validation
  async validateDocumentComplete(processId: number): Promise<{
    isComplete: boolean
    missingDocuments: TipoDocumento[]
    availableDocuments: TipoDocumento[]
  }> {
    const requiredDocuments: TipoDocumento[] = [
      'proforma',
      'commercial_invoice',
      'packing_list',
      'bill_of_lading',
      'declaracao_importacao'
    ]

    const { data, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .select('tipo_documento')
      .eq('id_proforma', processId)

    if (error) throw error

    const availableDocuments = data?.map(doc => doc.tipo_documento as TipoDocumento) || []
    const missingDocuments = requiredDocuments.filter(doc => !availableDocuments.includes(doc))

    return {
      isComplete: missingDocuments.length === 0,
      missingDocuments,
      availableDocuments
    }
  }

  // Document linking operations
  async linkDocumentToProcess(documentId: number, processData: {
    id_proforma?: number
    id_commercial_invoice?: number
    id_declaracao_importacao?: number
  }): Promise<DocumentoImportacao> {
    const { data: updated, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .update({ 
        ...processData,
        updated_at: new Date().toISOString() 
      })
      .eq('id_documento_importacao', documentId)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  async unlinkDocumentFromProcess(documentId: number, processType: 'proforma' | 'commercial_invoice' | 'declaracao_importacao'): Promise<DocumentoImportacao> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    switch (processType) {
      case 'proforma':
        updateData.id_proforma = null
        break
      case 'commercial_invoice':
        updateData.id_commercial_invoice = null
        break
      case 'declaracao_importacao':
        updateData.id_declaracao_importacao = null
        break
    }

    const { data: updated, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .update(updateData)
      .eq('id_documento_importacao', documentId)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  // Document timeline
  async getDocumentTimeline(processId: number): Promise<{
    type: 'document'
    id: number
    name: string
    date: string
    status: string
    tipo_documento: TipoDocumento
  }[]> {
    const { data, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .select('*')
      .eq('id_proforma', processId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return (data || []).map(doc => ({
      type: 'document' as const,
      id: doc.id_documento_importacao,
      name: doc.numero_documento || `${doc.tipo_documento} - ${doc.id_documento_importacao}`,
      date: doc.created_at,
      status: 'completed',
      tipo_documento: doc.tipo_documento as TipoDocumento
    }))
  }

  // File operations
  async updateDocumentFile(documentId: number, fileName: string, fileUrl: string): Promise<DocumentoImportacao> {
    const { data: updated, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .update({ 
        arquivo_anexo: fileUrl,
        updated_at: new Date().toISOString() 
      })
      .eq('id_documento_importacao', documentId)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  async removeDocumentFile(documentId: number): Promise<DocumentoImportacao> {
    const { data: updated, error } = await this.supabase
      .from('imp_13_documentos_importacao')
      .update({ 
        arquivo_anexo: null,
        updated_at: new Date().toISOString() 
      })
      .eq('id_documento_importacao', documentId)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  // Document templates and automation
  async getDocumentTemplate(tipoDocumento: TipoDocumento): Promise<{
    fields: string[]
    required_fields: string[]
    validation_rules: Record<string, any>
  }> {
    const templates = {
      proforma: {
        fields: ['numero_documento', 'data_documento', 'id_proforma'],
        required_fields: ['numero_documento', 'data_documento'],
        validation_rules: {
          numero_documento: { type: 'string', minLength: 1 },
          data_documento: { type: 'date' }
        }
      },
      commercial_invoice: {
        fields: ['numero_documento', 'data_documento', 'id_commercial_invoice'],
        required_fields: ['numero_documento', 'data_documento'],
        validation_rules: {
          numero_documento: { type: 'string', minLength: 1 },
          data_documento: { type: 'date' }
        }
      },
      packing_list: {
        fields: ['numero_documento', 'data_documento'],
        required_fields: ['numero_documento'],
        validation_rules: {
          numero_documento: { type: 'string', minLength: 1 }
        }
      },
      bill_of_lading: {
        fields: ['numero_documento', 'data_documento'],
        required_fields: ['numero_documento'],
        validation_rules: {
          numero_documento: { type: 'string', minLength: 1 }
        }
      },
      declaracao_importacao: {
        fields: ['numero_documento', 'data_documento', 'id_declaracao_importacao'],
        required_fields: ['numero_documento', 'data_documento'],
        validation_rules: {
          numero_documento: { type: 'string', minLength: 1 },
          data_documento: { type: 'date' }
        }
      },
      nota_fiscal: {
        fields: ['numero_documento', 'data_documento', 'id_nota_fiscal'],
        required_fields: ['numero_documento', 'data_documento'],
        validation_rules: {
          numero_documento: { type: 'string', minLength: 1 },
          data_documento: { type: 'date' }
        }
      },
      outros: {
        fields: ['numero_documento', 'data_documento', 'observacoes'],
        required_fields: ['observacoes'],
        validation_rules: {
          observacoes: { type: 'string', minLength: 1 }
        }
      }
    }

    return templates[tipoDocumento] || templates.outros
  }
}

export const documentService = new DocumentService()