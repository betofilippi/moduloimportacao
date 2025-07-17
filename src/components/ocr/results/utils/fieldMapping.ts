'use client';

import { TABLE_FIELD_MAPPINGS } from '@/config/nocodb-tables';

/**
 * Creates a flexible data accessor that can read from both OCR (English) and database (Portuguese) field names
 * @param ocrField - The field name from OCR extraction (English)
 * @param dbField - The field name from database (Portuguese)
 * @returns A function that retrieves the value from either field name
 */
export function createFlexibleAccessor(ocrField: string, dbField?: string) {
  return (data: any) => {
    // First try the OCR field name
    if (data && data[ocrField] !== undefined) {
      return data[ocrField];
    }
    
    // Then try the database field name if provided
    if (dbField && data && data[dbField] !== undefined) {
      return data[dbField];
    }
    
    // Return undefined if neither field exists
    return undefined;
  };
}

/**
 * Creates accessors for DI fields using the field mappings
 */
export const diFieldAccessors = {
  // Header fields - DI uses same field names for OCR and database
  header: {
    numero_DI: createFlexibleAccessor('numero_DI'),
    data_registro_DI: createFlexibleAccessor('data_registro_DI'),
    recinto_aduaneiro: createFlexibleAccessor('recinto_aduaneiro'),
    numero_BL: createFlexibleAccessor('numero_BL'),
    nome_navio: createFlexibleAccessor('nome_navio'),
    modalidade_despacho: createFlexibleAccessor('modalidade_despacho'),
    VMLE_usd: createFlexibleAccessor('VMLE_usd'),
    valor_total_impostos_recolhidos: createFlexibleAccessor('valor_total_impostos_recolhidos'),
    taxa_dolar: createFlexibleAccessor('taxa_dolar'),
  },
  
  // Item fields - mapping OCR names to database names
  items: {
    numero_adicao: createFlexibleAccessor('numero_adicao'),
    NCM: createFlexibleAccessor('NCM', 'ncm_completa'),
    descricao_mercadoria: createFlexibleAccessor('descricao_mercadoria', 'descricao_completa_detalhada_produto'),
    quantidade_unidade_medida: (data: any) => {
      // Try OCR format first
      if (data.quantidade_unidade_medida !== undefined) {
        return data.quantidade_unidade_medida;
      }
      // Fall back to database format (combine quantidade + unidade)
      if (data.quantidade_produto !== undefined && data.unidade_comercial_produto !== undefined) {
        return `${data.quantidade_produto} ${data.unidade_comercial_produto}`;
      }
      return undefined;
    },
    VMLE_usd: createFlexibleAccessor('VMLE_usd', 'valor_total_item_usd'),
    condicao_venda: createFlexibleAccessor('condicao_venda', 'incoterm'),
  },
  
  // Tax fields
  taxInfo: {
    tipo_imposto: createFlexibleAccessor('tipo_imposto'),
    valor_imposto_real: createFlexibleAccessor('valor_imposto_real'),
    aliquota: createFlexibleAccessor('aliquota'),
  }
};

/**
 * Helper to get value using flexible accessor
 */
export function getFieldValue(data: any, accessor: (data: any) => any): any {
  return accessor(data);
}

/**
 * Normalizes monetary values that use comma as decimal separator
 * Converts "199.931,42" to "199931.42"
 */
export function normalizeMonetaryValue(value: any): string {
  if (!value) return '0';
  
  // Convert to string if not already
  const strValue = value.toString();
  
  // If it contains comma as decimal separator (Brazilian format)
  if (strValue.includes(',') && strValue.includes('.')) {
    // Remove thousand separators (dots) and replace comma with dot
    return strValue.replace(/\./g, '').replace(',', '.');
  } else if (strValue.includes(',')) {
    // Just comma, replace with dot
    return strValue.replace(',', '.');
  }
  
  // Already in correct format or no decimals
  return strValue;
}

/**
 * Maps database format to OCR format for consistency
 */
export function mapDatabaseToOCRFormat(data: any, section: 'header' | 'items' | 'taxInfo'): any {
  if (!data) return data;
  
  // For arrays, map each item
  if (Array.isArray(data)) {
    return data.map(item => mapDatabaseToOCRFormat(item, section));
  }
  
  // Create mapped object
  const mapped: any = { ...data };
  
  // Map specific fields based on section
  if (section === 'items') {
    // Map database fields to OCR fields
    if (data.ncm_completa !== undefined && data.NCM === undefined) {
      mapped.NCM = data.ncm_completa;
    }
    if (data.descricao_completa_detalhada_produto !== undefined && data.descricao_mercadoria === undefined) {
      mapped.descricao_mercadoria = data.descricao_completa_detalhada_produto;
    }
    if (data.quantidade_produto !== undefined && data.unidade_comercial_produto !== undefined && data.quantidade_unidade_medida === undefined) {
      mapped.quantidade_unidade_medida = `${data.quantidade_produto} ${data.unidade_comercial_produto}`;
    }
    if (data.valor_total_item_usd !== undefined && data.VMLE_usd === undefined) {
      mapped.VMLE_usd = data.valor_total_item_usd;
    }
    if (data.incoterm !== undefined && data.condicao_venda === undefined) {
      mapped.condicao_venda = data.incoterm;
    }
  }
  
  return mapped;
}

/**
 * Creates accessors for SWIFT fields using the field mappings
 */
export const swiftFieldAccessors = {
  // Main fields
  tipo_mensagem: createFlexibleAccessor('message_type', 'tipo_mensagem'),
  referencia_remetente: createFlexibleAccessor('senders_reference', 'referencia_remetente'),
  referencia_transacao: createFlexibleAccessor('transaction_reference', 'referencia_transacao'),
  uetr: createFlexibleAccessor('uetr'),
  codigo_operacao_bancaria: createFlexibleAccessor('bank_operation_code', 'codigo_operacao_bancaria'),
  data_valor: createFlexibleAccessor('value_date', 'data_valor'),
  moeda: createFlexibleAccessor('currency', 'moeda'),
  valor: createFlexibleAccessor('amount', 'valor'),
  bic_instituicao_conta: createFlexibleAccessor('account_with_institution_bic', 'bic_instituicao_conta'),
  informacoes_remessa: createFlexibleAccessor('remittance_information', 'informacoes_remessa'),
  numero_fatura: createFlexibleAccessor('fatura', 'invoiceNumber'),
  detalhes_tarifas: createFlexibleAccessor('details_of_charges', 'detalhes_tarifas'),
  
  // Nested fields accessors
  cliente_ordenante: {
    nome: (data: any) => data?.ordering_customer?.name || data?.cliente_ordenante_nome || data?.cliente_ordenante?.nome,
    endereco: (data: any) => data?.ordering_customer?.address || data?.cliente_ordenante_endereco || data?.cliente_ordenante?.endereco,
  },
  
  instituicao_ordenante: {
    nome: (data: any) => data?.ordering_institution?.name || data?.instituicao_ordenante_nome || data?.instituicao_ordenante?.nome,
    bic: (data: any) => data?.ordering_institution?.bic || data?.instituicao_ordenante_bic || data?.instituicao_ordenante?.bic,
    endereco: (data: any) => data?.ordering_institution?.address || data?.instituicao_ordenante_endereco || data?.instituicao_ordenante?.endereco,
  },
  
  instituicao_receptora: {
    nome: (data: any) => data?.receiver_institution?.name || data?.instituicao_receptora_nome || data?.instituicao_receptora?.nome,
    bic: (data: any) => data?.receiver_institution?.bic || data?.instituicao_receptora_bic || data?.instituicao_receptora?.bic,
  },
  
  beneficiario: {
    conta: (data: any) => data?.beneficiary?.account || data?.beneficiario_conta || data?.beneficiario?.conta,
    nome: (data: any) => data?.beneficiary?.name || data?.beneficiario_nome || data?.beneficiario?.nome,
    endereco: (data: any) => data?.beneficiary?.address || data?.beneficiario_endereco || data?.beneficiario?.endereco,
  }
};

/**
 * Creates accessors for Numerário fields using the field mappings
 */
export const numerarioFieldAccessors = {
  // Main fields
  numero_fatura: createFlexibleAccessor('invoice_number', 'invoiceNumber'),
  tipo_documento: createFlexibleAccessor('tipo_documento'),
  data_documento: createFlexibleAccessor('data_documento'),
  cnpj_cliente: createFlexibleAccessor('cliente_cnpj', 'cnpj_cliente'),
  nome_cliente: createFlexibleAccessor('cliente_nome', 'nome_cliente'),
  taxa_cambio: createFlexibleAccessor('cambio_brl', 'taxa_cambio'),
  valor_reais: createFlexibleAccessor('valor_reais'),
  banco: createFlexibleAccessor('banco'),
  conta_destino: createFlexibleAccessor('conta_destino'),
  forma_pagamento: createFlexibleAccessor('forma_pagamento'),
  parcelas: createFlexibleAccessor('parcelas'),
  impostos: createFlexibleAccessor('impostos'),
  taxas: createFlexibleAccessor('taxas'),
  desconto: createFlexibleAccessor('desconto'),
  valor_liquido: createFlexibleAccessor('valor_liquido'),
  vendedor: createFlexibleAccessor('vendedor'),
  comissao: createFlexibleAccessor('comissao'),
  referencia_pedido: createFlexibleAccessor('referencia_pedido'),
  observacoes: createFlexibleAccessor('observacoes'),
  categoria: createFlexibleAccessor('categoria'),
  nf_emitida: createFlexibleAccessor('nf_emitida'),
  numero_nf: createFlexibleAccessor('numero_nf'),
  data_emissao_nf: createFlexibleAccessor('data_emissao_nf'),
  chave_nf: createFlexibleAccessor('chave_nf'),
  criado_por: createFlexibleAccessor('created_by', 'criado_por'),
  atualizado_por: createFlexibleAccessor('updated_by', 'atualizado_por'),
};