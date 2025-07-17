import { z } from 'zod'

// Common validation schemas
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const searchSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional()
})

// User validation schemas
export const userCreateSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  role: z.enum(['admin', 'user', 'viewer']).default('user'),
  profile: z.object({
    nome_completo: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    telefone: z.string().optional(),
    id_empresa: z.number().optional()
  }).optional()
})

export const userUpdateSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  role: z.enum(['admin', 'user', 'viewer']).optional(),
  profile: z.object({
    nome_completo: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
    telefone: z.string().optional(),
    id_empresa: z.number().optional()
  }).optional()
})

export const changePasswordSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(8, 'Nova senha deve ter no mínimo 8 caracteres'),
  confirm_password: z.string()
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Senhas não coincidem",
  path: ["confirm_password"]
})

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
})

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  nome_completo: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  telefone: z.string().optional(),
  id_empresa: z.number().optional()
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido')
})

// Process validation schemas
export const proformaInvoiceCreateSchema = z.object({
  id_fornecedor: z.number().optional(),
  numero_proforma: z.string().min(1, 'Número da proforma é obrigatório'),
  data_proforma: z.string().datetime('Data inválida'),
  id_condicao_pagamento: z.number().optional(),
  moeda: z.string().optional(),
  valor_total_fob: z.number().min(0, 'Valor deve ser positivo').optional(),
  valor_frete: z.number().min(0, 'Valor deve ser positivo').optional(),
  valor_seguro: z.number().min(0, 'Valor deve ser positivo').optional(),
  valor_total_cif: z.number().min(0, 'Valor deve ser positivo').optional(),
  peso_liquido_total: z.number().min(0, 'Peso deve ser positivo').optional(),
  peso_bruto_total: z.number().min(0, 'Peso deve ser positivo').optional(),
  volume_total_m3: z.number().min(0, 'Volume deve ser positivo').optional(),
  porto_origem: z.string().optional(),
  porto_destino: z.string().optional(),
  prazo_producao_dias: z.number().min(0, 'Prazo deve ser positivo').optional(),
  prazo_embarque_dias: z.number().min(0, 'Prazo deve ser positivo').optional(),
  observacoes: z.string().optional(),
  status: z.enum(['aberto', 'em_andamento', 'aguardando_documentos', 'finalizado', 'cancelado']).optional()
})

export const proformaInvoiceUpdateSchema = proformaInvoiceCreateSchema.partial()

export const proformaInvoiceItemCreateSchema = z.object({
  id_proforma: z.number(),
  id_produto: z.number().optional(),
  numero_item: z.number().min(1, 'Número do item é obrigatório'),
  descricao_produto: z.string().optional(),
  ncm: z.string().optional(),
  quantidade: z.number().min(0, 'Quantidade deve ser positiva').optional(),
  unidade_medida: z.string().optional(),
  valor_unitario: z.number().min(0, 'Valor deve ser positivo').optional(),
  valor_total: z.number().min(0, 'Valor deve ser positivo').optional(),
  peso_liquido_unitario: z.number().min(0, 'Peso deve ser positivo').optional(),
  peso_liquido_total: z.number().min(0, 'Peso deve ser positivo').optional(),
  peso_bruto_unitario: z.number().min(0, 'Peso deve ser positivo').optional(),
  peso_bruto_total: z.number().min(0, 'Peso deve ser positivo').optional()
})

export const proformaInvoiceItemUpdateSchema = proformaInvoiceItemCreateSchema.partial()

export const commercialInvoiceCreateSchema = z.object({
  id_proforma: z.number().optional(),
  numero_invoice: z.string().min(1, 'Número da invoice é obrigatório'),
  data_invoice: z.string().datetime('Data inválida'),
  vendedor: z.string().optional(),
  comprador: z.string().optional(),
  incoterm: z.string().optional(),
  porto_origem: z.string().optional(),
  porto_destino: z.string().optional(),
  valor_total_fob: z.number().min(0, 'Valor deve ser positivo').optional(),
  valor_frete: z.number().min(0, 'Valor deve ser positivo').optional(),
  valor_seguro: z.number().min(0, 'Valor deve ser positivo').optional(),
  valor_total_cif: z.number().min(0, 'Valor deve ser positivo').optional(),
  peso_liquido_total: z.number().min(0, 'Peso deve ser positivo').optional(),
  peso_bruto_total: z.number().min(0, 'Peso deve ser positivo').optional(),
  observacoes: z.string().optional()
})

export const commercialInvoiceUpdateSchema = commercialInvoiceCreateSchema.partial()

export const declaracaoImportacaoCreateSchema = z.object({
  numero_di: z.string().min(1, 'Número da DI é obrigatório'),
  data_registro: z.string().datetime('Data inválida'),
  data_desembaraco: z.string().datetime('Data inválida').optional(),
  canal: z.string().optional(),
  recinto_aduaneiro: z.string().optional(),
  urf_despacho: z.string().optional(),
  urf_entrada: z.string().optional(),
  via_transporte: z.string().optional(),
  tipo_declaracao: z.string().optional(),
  id_importador: z.number().optional(),
  valor_total_mercadoria: z.number().min(0, 'Valor deve ser positivo').optional(),
  valor_frete: z.number().min(0, 'Valor deve ser positivo').optional(),
  valor_seguro: z.number().min(0, 'Valor deve ser positivo').optional(),
  valor_cif: z.number().min(0, 'Valor deve ser positivo').optional(),
  peso_liquido_total: z.number().min(0, 'Peso deve ser positivo').optional(),
  observacoes: z.string().optional(),
  id_conhecimento_embarque: z.number().optional()
})

export const declaracaoImportacaoUpdateSchema = declaracaoImportacaoCreateSchema.partial()

// Document validation schemas
export const documentCreateSchema = z.object({
  id_proforma: z.number().optional(),
  id_commercial_invoice: z.number().optional(),
  id_packing_list: z.number().optional(),
  id_conhecimento_embarque: z.number().optional(),
  id_declaracao_importacao: z.number().optional(),
  id_nota_fiscal: z.number().optional(),
  tipo_documento: z.enum(['proforma', 'commercial_invoice', 'packing_list', 'bill_of_lading', 'declaracao_importacao', 'nota_fiscal', 'outros']),
  numero_documento: z.string().optional(),
  data_documento: z.string().datetime('Data inválida').optional(),
  arquivo_anexo: z.string().optional(),
  observacoes: z.string().optional()
})

export const documentUpdateSchema = documentCreateSchema.partial()

// Company and supplier validation schemas
export const empresaCreateSchema = z.object({
  cnpj: z.string().min(14, 'CNPJ inválido').max(18, 'CNPJ inválido'),
  razao_social: z.string().min(1, 'Razão social é obrigatória'),
  inscricao_estadual: z.string().optional(),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cep: z.string().optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  website: z.string().url('URL inválida').optional(),
  ativo: z.boolean().default(true)
})

export const empresaUpdateSchema = empresaCreateSchema.partial()

export const fornecedorCreateSchema = z.object({
  tipo_pessoa: z.enum(['fisica', 'juridica']),
  cnpj_cpf: z.string().optional(),
  nome_razao_social: z.string().min(1, 'Nome/Razão social é obrigatório'),
  inscricao_estadual: z.string().optional(),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cep: z.string().optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  pais: z.string().default('Brasil'),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  contato_responsavel: z.string().optional(),
  ativo: z.boolean().default(true)
})

export const fornecedorUpdateSchema = fornecedorCreateSchema.partial()

export const clienteCreateSchema = z.object({
  tipo_pessoa: z.enum(['fisica', 'juridica']),
  cnpj_cpf: z.string().min(1, 'CPF/CNPJ é obrigatório'),
  nome_razao_social: z.string().min(1, 'Nome/Razão social é obrigatório'),
  inscricao_estadual: z.string().optional(),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cep: z.string().optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  ativo: z.boolean().default(true)
})

export const clienteUpdateSchema = clienteCreateSchema.partial()

// Product validation schemas
export const produtoCreateSchema = z.object({
  id_modelo: z.number().optional(),
  id_fornecedor: z.number().optional(),
  codigo: z.string().min(1, 'Código é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  descricao_detalhada: z.string().optional(),
  ncm: z.string().optional(),
  unidade_medida: z.string().optional(),
  peso_liquido: z.number().min(0, 'Peso deve ser positivo').optional(),
  peso_bruto: z.number().min(0, 'Peso deve ser positivo').optional(),
  volume_m3: z.number().min(0, 'Volume deve ser positivo').optional(),
  preco_custo: z.number().min(0, 'Preço deve ser positivo').optional(),
  preco_venda: z.number().min(0, 'Preço deve ser positivo').optional(),
  estoque_minimo: z.number().min(0, 'Estoque deve ser positivo').optional(),
  estoque_maximo: z.number().min(0, 'Estoque deve ser positivo').optional(),
  lead_time_dias: z.number().min(0, 'Lead time deve ser positivo').optional(),
  ativo: z.boolean().default(true)
})

export const produtoUpdateSchema = produtoCreateSchema.partial()

// File upload validation schemas
export const uploadSchema = z.object({
  file: z.instanceof(File),
  tipo_documento: z.enum(['proforma', 'commercial_invoice', 'packing_list', 'bill_of_lading', 'declaracao_importacao', 'nota_fiscal', 'outros']),
  processo_id: z.number().optional(),
  observacoes: z.string().optional()
})

// Report validation schemas
export const reportFilterSchema = z.object({
  data_inicio: z.string().datetime('Data inválida'),
  data_fim: z.string().datetime('Data inválida'),
  fornecedor_id: z.number().optional(),
  status: z.enum(['aberto', 'em_andamento', 'aguardando_documentos', 'finalizado', 'cancelado']).optional(),
  tipo_relatorio: z.enum(['processos', 'financeiro', 'documentos', 'fornecedores']).default('processos')
}).refine((data) => {
  const startDate = new Date(data.data_inicio)
  const endDate = new Date(data.data_fim)
  return startDate <= endDate
}, {
  message: "Data inicial deve ser anterior à data final",
  path: ["data_fim"]
})

// Process filter schemas
export const processFilterSchema = z.object({
  fornecedor_id: z.number().optional(),
  status: z.enum(['aberto', 'em_andamento', 'aguardando_documentos', 'finalizado', 'cancelado']).optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  numero_proforma: z.string().optional(),
  valor_min: z.number().min(0, 'Valor deve ser positivo').optional(),
  valor_max: z.number().min(0, 'Valor deve ser positivo').optional(),
  moeda: z.string().optional(),
  porto_origem: z.string().optional(),
  porto_destino: z.string().optional()
})

// ID validation schemas
export const idSchema = z.object({
  id: z.string().transform((val) => parseInt(val)).refine((val) => !isNaN(val) && val > 0, {
    message: "ID deve ser um número positivo"
  })
})

export const uuidSchema = z.object({
  id: z.string().uuid('ID inválido')
})

// Bulk operations schemas
export const bulkDeleteSchema = z.object({
  ids: z.array(z.number().positive('ID deve ser positivo')).min(1, 'Pelo menos um ID deve ser fornecido')
})

export const bulkUpdateSchema = z.object({
  ids: z.array(z.number().positive('ID deve ser positivo')).min(1, 'Pelo menos um ID deve ser fornecido'),
  data: z.record(z.string(), z.any())
})

// Export all schemas
export const validationSchemas = {
  // Common
  pagination: paginationSchema,
  search: searchSchema,
  id: idSchema,
  uuid: uuidSchema,
  bulkDelete: bulkDeleteSchema,
  bulkUpdate: bulkUpdateSchema,
  
  // Auth
  login: loginSchema,
  register: registerSchema,
  resetPassword: resetPasswordSchema,
  changePassword: changePasswordSchema,
  
  // Users
  userCreate: userCreateSchema,
  userUpdate: userUpdateSchema,
  
  // Processes
  proformaInvoiceCreate: proformaInvoiceCreateSchema,
  proformaInvoiceUpdate: proformaInvoiceUpdateSchema,
  proformaInvoiceItemCreate: proformaInvoiceItemCreateSchema,
  proformaInvoiceItemUpdate: proformaInvoiceItemUpdateSchema,
  commercialInvoiceCreate: commercialInvoiceCreateSchema,
  commercialInvoiceUpdate: commercialInvoiceUpdateSchema,
  declaracaoImportacaoCreate: declaracaoImportacaoCreateSchema,
  declaracaoImportacaoUpdate: declaracaoImportacaoUpdateSchema,
  processFilter: processFilterSchema,
  
  // Documents
  documentCreate: documentCreateSchema,
  documentUpdate: documentUpdateSchema,
  
  // Companies
  empresaCreate: empresaCreateSchema,
  empresaUpdate: empresaUpdateSchema,
  fornecedorCreate: fornecedorCreateSchema,
  fornecedorUpdate: fornecedorUpdateSchema,
  clienteCreate: clienteCreateSchema,
  clienteUpdate: clienteUpdateSchema,
  
  // Products
  produtoCreate: produtoCreateSchema,
  produtoUpdate: produtoUpdateSchema,
  
  // Uploads
  upload: uploadSchema,
  
  // Reports
  reportFilter: reportFilterSchema
}