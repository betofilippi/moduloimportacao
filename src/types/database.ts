export interface Database {
  public: {
    Tables: {
      // Cadastros (Registrations)
      cad_01_empresas: {
        Row: {
          id_empresa: number
          cnpj: string
          razao_social: string
          inscricao_estadual: string | null
          endereco: string | null
          bairro: string | null
          cep: string | null
          municipio: string | null
          uf: string | null
          telefone: string | null
          email: string | null
          website: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id_empresa?: number
          cnpj: string
          razao_social: string
          inscricao_estadual?: string | null
          endereco?: string | null
          bairro?: string | null
          cep?: string | null
          municipio?: string | null
          uf?: string | null
          telefone?: string | null
          email?: string | null
          website?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_empresa?: number
          cnpj?: string
          razao_social?: string
          inscricao_estadual?: string | null
          endereco?: string | null
          bairro?: string | null
          cep?: string | null
          municipio?: string | null
          uf?: string | null
          telefone?: string | null
          email?: string | null
          website?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cad_02_bancos: {
        Row: {
          id_banco: number
          nome: string
          codigo: string
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id_banco?: number
          nome: string
          codigo: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_banco?: number
          nome?: string
          codigo?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cad_03_clientes: {
        Row: {
          id_cliente: number
          tipo_pessoa: string
          cnpj_cpf: string
          nome_razao_social: string
          inscricao_estadual: string | null
          endereco: string | null
          bairro: string | null
          cep: string | null
          municipio: string | null
          uf: string | null
          telefone: string | null
          email: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id_cliente?: number
          tipo_pessoa: string
          cnpj_cpf: string
          nome_razao_social: string
          inscricao_estadual?: string | null
          endereco?: string | null
          bairro?: string | null
          cep?: string | null
          municipio?: string | null
          uf?: string | null
          telefone?: string | null
          email?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_cliente?: number
          tipo_pessoa?: string
          cnpj_cpf?: string
          nome_razao_social?: string
          inscricao_estadual?: string | null
          endereco?: string | null
          bairro?: string | null
          cep?: string | null
          municipio?: string | null
          uf?: string | null
          telefone?: string | null
          email?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cad_04_fornecedores: {
        Row: {
          id_fornecedor: number
          tipo_pessoa: string
          cnpj_cpf: string | null
          nome_razao_social: string
          inscricao_estadual: string | null
          endereco: string | null
          bairro: string | null
          cep: string | null
          municipio: string | null
          uf: string | null
          pais: string
          telefone: string | null
          email: string | null
          contato_responsavel: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id_fornecedor?: number
          tipo_pessoa: string
          cnpj_cpf?: string | null
          nome_razao_social: string
          inscricao_estadual?: string | null
          endereco?: string | null
          bairro?: string | null
          cep?: string | null
          municipio?: string | null
          uf?: string | null
          pais?: string
          telefone?: string | null
          email?: string | null
          contato_responsavel?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_fornecedor?: number
          tipo_pessoa?: string
          cnpj_cpf?: string | null
          nome_razao_social?: string
          inscricao_estadual?: string | null
          endereco?: string | null
          bairro?: string | null
          cep?: string | null
          municipio?: string | null
          uf?: string | null
          pais?: string
          telefone?: string | null
          email?: string | null
          contato_responsavel?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cad_05_transportadores: {
        Row: {
          id_transportador: number
          id_fornecedor: number | null
          tipo_transporte: string | null
          capacidade_carga: number | null
          created_at: string
          updated_at: string
          id_nota_fiscal: number | null
        }
        Insert: {
          id_transportador?: number
          id_fornecedor?: number | null
          tipo_transporte?: string | null
          capacidade_carga?: number | null
          created_at?: string
          updated_at?: string
          id_nota_fiscal?: number | null
        }
        Update: {
          id_transportador?: number
          id_fornecedor?: number | null
          tipo_transporte?: string | null
          capacidade_carga?: number | null
          created_at?: string
          updated_at?: string
          id_nota_fiscal?: number | null
        }
      }

      // Import System Tables
      imp_05_proforma_invoices: {
        Row: {
          id_proforma: number
          id_fornecedor: number | null
          numero_proforma: string
          data_proforma: string
          id_condicao_pagamento: number | null
          moeda: string | null
          valor_total_fob: number | null
          valor_frete: number | null
          valor_seguro: number | null
          valor_total_cif: number | null
          peso_liquido_total: number | null
          peso_bruto_total: number | null
          volume_total_m3: number | null
          porto_origem: string | null
          porto_destino: string | null
          prazo_producao_dias: number | null
          prazo_embarque_dias: number | null
          observacoes: string | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id_proforma?: number
          id_fornecedor?: number | null
          numero_proforma: string
          data_proforma: string
          id_condicao_pagamento?: number | null
          moeda?: string | null
          valor_total_fob?: number | null
          valor_frete?: number | null
          valor_seguro?: number | null
          valor_total_cif?: number | null
          peso_liquido_total?: number | null
          peso_bruto_total?: number | null
          volume_total_m3?: number | null
          porto_origem?: string | null
          porto_destino?: string | null
          prazo_producao_dias?: number | null
          prazo_embarque_dias?: number | null
          observacoes?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_proforma?: number
          id_fornecedor?: number | null
          numero_proforma?: string
          data_proforma?: string
          id_condicao_pagamento?: number | null
          moeda?: string | null
          valor_total_fob?: number | null
          valor_frete?: number | null
          valor_seguro?: number | null
          valor_total_cif?: number | null
          peso_liquido_total?: number | null
          peso_bruto_total?: number | null
          volume_total_m3?: number | null
          porto_origem?: string | null
          porto_destino?: string | null
          prazo_producao_dias?: number | null
          prazo_embarque_dias?: number | null
          observacoes?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      imp_06_proforma_invoice_itens: {
        Row: {
          id_item_proforma: number
          id_proforma: number
          id_produto: number | null
          numero_item: number
          descricao_produto: string | null
          ncm: string | null
          quantidade: number | null
          unidade_medida: string | null
          valor_unitario: number | null
          valor_total: number | null
          peso_liquido_unitario: number | null
          peso_liquido_total: number | null
          peso_bruto_unitario: number | null
          peso_bruto_total: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id_item_proforma?: number
          id_proforma: number
          id_produto?: number | null
          numero_item: number
          descricao_produto?: string | null
          ncm?: string | null
          quantidade?: number | null
          unidade_medida?: string | null
          valor_unitario?: number | null
          valor_total?: number | null
          peso_liquido_unitario?: number | null
          peso_liquido_total?: number | null
          peso_bruto_unitario?: number | null
          peso_bruto_total?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_item_proforma?: number
          id_proforma?: number
          id_produto?: number | null
          numero_item?: number
          descricao_produto?: string | null
          ncm?: string | null
          quantidade?: number | null
          unidade_medida?: string | null
          valor_unitario?: number | null
          valor_total?: number | null
          peso_liquido_unitario?: number | null
          peso_liquido_total?: number | null
          peso_bruto_unitario?: number | null
          peso_bruto_total?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      imp_07_commercial_invoices: {
        Row: {
          id_commercial_invoice: number
          id_proforma: number | null
          numero_invoice: string
          data_invoice: string
          vendedor: string | null
          comprador: string | null
          incoterm: string | null
          porto_origem: string | null
          porto_destino: string | null
          valor_total_fob: number | null
          valor_frete: number | null
          valor_seguro: number | null
          valor_total_cif: number | null
          peso_liquido_total: number | null
          peso_bruto_total: number | null
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id_commercial_invoice?: number
          id_proforma?: number | null
          numero_invoice: string
          data_invoice: string
          vendedor?: string | null
          comprador?: string | null
          incoterm?: string | null
          porto_origem?: string | null
          porto_destino?: string | null
          valor_total_fob?: number | null
          valor_frete?: number | null
          valor_seguro?: number | null
          valor_total_cif?: number | null
          peso_liquido_total?: number | null
          peso_bruto_total?: number | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_commercial_invoice?: number
          id_proforma?: number | null
          numero_invoice?: string
          data_invoice?: string
          vendedor?: string | null
          comprador?: string | null
          incoterm?: string | null
          porto_origem?: string | null
          porto_destino?: string | null
          valor_total_fob?: number | null
          valor_frete?: number | null
          valor_seguro?: number | null
          valor_total_cif?: number | null
          peso_liquido_total?: number | null
          peso_bruto_total?: number | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      imp_08_commercial_invoice_itens: {
        Row: {
          id_item_commercial: number
          id_commercial_invoice: number
          id_produto: number | null
          numero_item: number
          descricao_produto: string | null
          ncm: string | null
          quantidade: number | null
          unidade_medida: string | null
          valor_unitario_fob: number | null
          valor_total_fob: number | null
          peso_liquido: number | null
          peso_bruto: number | null
          referencia: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id_item_commercial?: number
          id_commercial_invoice: number
          id_produto?: number | null
          numero_item: number
          descricao_produto?: string | null
          ncm?: string | null
          quantidade?: number | null
          unidade_medida?: string | null
          valor_unitario_fob?: number | null
          valor_total_fob?: number | null
          peso_liquido?: number | null
          peso_bruto?: number | null
          referencia?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_item_commercial?: number
          id_commercial_invoice?: number
          id_produto?: number | null
          numero_item?: number
          descricao_produto?: string | null
          ncm?: string | null
          quantidade?: number | null
          unidade_medida?: string | null
          valor_unitario_fob?: number | null
          valor_total_fob?: number | null
          peso_liquido?: number | null
          peso_bruto?: number | null
          referencia?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      imp_11_declaracoes_importacao: {
        Row: {
          id_declaracao_importacao: number
          numero_di: string
          data_registro: string
          data_desembaraco: string | null
          canal: string | null
          recinto_aduaneiro: string | null
          urf_despacho: string | null
          urf_entrada: string | null
          via_transporte: string | null
          tipo_declaracao: string | null
          id_importador: number | null
          valor_total_mercadoria: number | null
          valor_frete: number | null
          valor_seguro: number | null
          valor_cif: number | null
          peso_liquido_total: number | null
          observacoes: string | null
          created_at: string
          updated_at: string
          id_conhecimento_embarque: number | null
        }
        Insert: {
          id_declaracao_importacao?: number
          numero_di: string
          data_registro: string
          data_desembaraco?: string | null
          canal?: string | null
          recinto_aduaneiro?: string | null
          urf_despacho?: string | null
          urf_entrada?: string | null
          via_transporte?: string | null
          tipo_declaracao?: string | null
          id_importador?: number | null
          valor_total_mercadoria?: number | null
          valor_frete?: number | null
          valor_seguro?: number | null
          valor_cif?: number | null
          peso_liquido_total?: number | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
          id_conhecimento_embarque?: number | null
        }
        Update: {
          id_declaracao_importacao?: number
          numero_di?: string
          data_registro?: string
          data_desembaraco?: string | null
          canal?: string | null
          recinto_aduaneiro?: string | null
          urf_despacho?: string | null
          urf_entrada?: string | null
          via_transporte?: string | null
          tipo_declaracao?: string | null
          id_importador?: number | null
          valor_total_mercadoria?: number | null
          valor_frete?: number | null
          valor_seguro?: number | null
          valor_cif?: number | null
          peso_liquido_total?: number | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
          id_conhecimento_embarque?: number | null
        }
      }
      imp_13_documentos_importacao: {
        Row: {
          id_documento_importacao: number
          id_proforma: number | null
          id_commercial_invoice: number | null
          id_packing_list: number | null
          id_conhecimento_embarque: number | null
          id_declaracao_importacao: number | null
          id_nota_fiscal: number | null
          tipo_documento: string
          numero_documento: string | null
          data_documento: string | null
          arquivo_anexo: string | null
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id_documento_importacao?: number
          id_proforma?: number | null
          id_commercial_invoice?: number | null
          id_packing_list?: number | null
          id_conhecimento_embarque?: number | null
          id_declaracao_importacao?: number | null
          id_nota_fiscal?: number | null
          tipo_documento: string
          numero_documento?: string | null
          data_documento?: string | null
          arquivo_anexo?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_documento_importacao?: number
          id_proforma?: number | null
          id_commercial_invoice?: number | null
          id_packing_list?: number | null
          id_conhecimento_embarque?: number | null
          id_declaracao_importacao?: number | null
          id_nota_fiscal?: number | null
          tipo_documento?: string
          numero_documento?: string | null
          data_documento?: string | null
          arquivo_anexo?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      imp_17_fechamentos_importacao: {
        Row: {
          id_fechamento_importacao: number
          id_proforma: number
          id_declaracao_importacao: number | null
          data_fechamento: string
          numero_processo: string | null
          status_processo: string | null
          valor_total_produtos_fob: number | null
          valor_total_frete: number | null
          valor_total_seguro: number | null
          valor_total_impostos: number | null
          valor_total_despesas: number | null
          valor_total_processo: number | null
          taxa_cambio_media: number | null
          observacoes_finais: string | null
          documentos_pendentes: string | null
          proximos_passos: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id_fechamento_importacao?: number
          id_proforma: number
          id_declaracao_importacao?: number | null
          data_fechamento: string
          numero_processo?: string | null
          status_processo?: string | null
          valor_total_produtos_fob?: number | null
          valor_total_frete?: number | null
          valor_total_seguro?: number | null
          valor_total_impostos?: number | null
          valor_total_despesas?: number | null
          valor_total_processo?: number | null
          taxa_cambio_media?: number | null
          observacoes_finais?: string | null
          documentos_pendentes?: string | null
          proximos_passos?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_fechamento_importacao?: number
          id_proforma?: number
          id_declaracao_importacao?: number | null
          data_fechamento?: string
          numero_processo?: string | null
          status_processo?: string | null
          valor_total_produtos_fob?: number | null
          valor_total_frete?: number | null
          valor_total_seguro?: number | null
          valor_total_impostos?: number | null
          valor_total_despesas?: number | null
          valor_total_processo?: number | null
          taxa_cambio_media?: number | null
          observacoes_finais?: string | null
          documentos_pendentes?: string | null
          proximos_passos?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // Products
      prd_03_produtos: {
        Row: {
          id_produto: number
          id_modelo: number | null
          id_fornecedor: number | null
          codigo: string
          descricao: string
          descricao_detalhada: string | null
          ncm: string | null
          unidade_medida: string | null
          peso_liquido: number | null
          peso_bruto: number | null
          volume_m3: number | null
          preco_custo: number | null
          preco_venda: number | null
          estoque_minimo: number | null
          estoque_maximo: number | null
          lead_time_dias: number | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id_produto?: number
          id_modelo?: number | null
          id_fornecedor?: number | null
          codigo: string
          descricao: string
          descricao_detalhada?: string | null
          ncm?: string | null
          unidade_medida?: string | null
          peso_liquido?: number | null
          peso_bruto?: number | null
          volume_m3?: number | null
          preco_custo?: number | null
          preco_venda?: number | null
          estoque_minimo?: number | null
          estoque_maximo?: number | null
          lead_time_dias?: number | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_produto?: number
          id_modelo?: number | null
          id_fornecedor?: number | null
          codigo?: string
          descricao?: string
          descricao_detalhada?: string | null
          ncm?: string | null
          unidade_medida?: string | null
          peso_liquido?: number | null
          peso_bruto?: number | null
          volume_m3?: number | null
          preco_custo?: number | null
          preco_venda?: number | null
          estoque_minimo?: number | null
          estoque_maximo?: number | null
          lead_time_dias?: number | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // Payment Conditions
      vnd_07_condicoes_pagamento: {
        Row: {
          id_condicao_pagamento: number
          codigo: string
          descricao: string
          dias_vencimento: number | null
          desconto_percentual: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id_condicao_pagamento?: number
          codigo: string
          descricao: string
          dias_vencimento?: number | null
          desconto_percentual?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_condicao_pagamento?: number
          codigo?: string
          descricao?: string
          dias_vencimento?: number | null
          desconto_percentual?: number | null
          created_at?: string
          updated_at?: string
        }
      }

      // User management tables (standard Supabase auth)
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          role: 'admin' | 'user' | 'viewer'
          profile: {
            nome_completo?: string
            telefone?: string
            id_empresa?: number
          } | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          role?: 'admin' | 'user' | 'viewer'
          profile?: {
            nome_completo?: string
            telefone?: string
            id_empresa?: number
          } | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          role?: 'admin' | 'user' | 'viewer'
          profile?: {
            nome_completo?: string
            telefone?: string
            id_empresa?: number
          } | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'user' | 'viewer'
      status_processo: 'aberto' | 'em_andamento' | 'aguardando_documentos' | 'finalizado' | 'cancelado'
      tipo_pessoa: 'fisica' | 'juridica'
      tipo_documento: 'proforma' | 'commercial_invoice' | 'packing_list' | 'bill_of_lading' | 'declaracao_importacao' | 'nota_fiscal' | 'outros'
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific entity types
export type Empresa = Tables<'cad_01_empresas'>
export type Banco = Tables<'cad_02_bancos'>
export type Cliente = Tables<'cad_03_clientes'>
export type Fornecedor = Tables<'cad_04_fornecedores'>
export type Transportador = Tables<'cad_05_transportadores'>

export type ProformaInvoice = Tables<'imp_05_proforma_invoices'>
export type ProformaInvoiceItem = Tables<'imp_06_proforma_invoice_itens'>
export type CommercialInvoice = Tables<'imp_07_commercial_invoices'>
export type CommercialInvoiceItem = Tables<'imp_08_commercial_invoice_itens'>
export type DeclaracaoImportacao = Tables<'imp_11_declaracoes_importacao'>
export type DocumentoImportacao = Tables<'imp_13_documentos_importacao'>
export type FechamentoImportacao = Tables<'imp_17_fechamentos_importacao'>

export type Produto = Tables<'prd_03_produtos'>
export type CondicaoPagamento = Tables<'vnd_07_condicoes_pagamento'>
export type User = Tables<'users'>

// Insert types
export type EmpresaInsert = TablesInsert<'cad_01_empresas'>
export type ProformaInvoiceInsert = TablesInsert<'imp_05_proforma_invoices'>
export type CommercialInvoiceInsert = TablesInsert<'imp_07_commercial_invoices'>
export type UserInsert = TablesInsert<'users'>

// Update types
export type EmpresaUpdate = TablesUpdate<'cad_01_empresas'>
export type ProformaInvoiceUpdate = TablesUpdate<'imp_05_proforma_invoices'>
export type CommercialInvoiceUpdate = TablesUpdate<'imp_07_commercial_invoices'>
export type UserUpdate = TablesUpdate<'users'>

// Enum types
export type UserRole = Database['public']['Enums']['user_role']
export type StatusProcesso = Database['public']['Enums']['status_processo']
export type TipoPessoa = Database['public']['Enums']['tipo_pessoa']
export type TipoDocumento = Database['public']['Enums']['tipo_documento']

// Complex query result types
export type ProformaWithItems = ProformaInvoice & {
  items: ProformaInvoiceItem[]
  fornecedor?: Fornecedor
  condicao_pagamento?: CondicaoPagamento
}

export type CommercialInvoiceWithItems = CommercialInvoice & {
  items: CommercialInvoiceItem[]
  proforma?: ProformaInvoice
}

export type ImportProcessSummary = {
  id_proforma: number
  numero_proforma: string
  fornecedor: string
  status: string
  valor_total_fob: number
  valor_total_cif: number
  data_proforma: string
  has_commercial_invoice: boolean
  has_declaracao_importacao: boolean
  has_fechamento: boolean
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Filter and query types
export interface ImportProcessFilter {
  fornecedor_id?: number
  status?: string
  data_inicio?: string
  data_fim?: string
  numero_proforma?: string
  valor_min?: number
  valor_max?: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface QueryParams extends PaginationParams {
  search?: string
  filters?: Record<string, any>
}