// Types for DI (Declaração de Importação) document processing

export interface DIHeader {
  numero_DI: string;
  numero_invoice: string;
  data_registro_DI: string;
  nome_importador: string;
  cnpj_importador: string;
  nome_adquirente: string;
  cnpj_adquirente: string;
  representante_legal_nome: string;
  representante_legal_CPF: string;
  modalidade_despacho: string;
  quantidade_total_adicoes: string;
  recinto_aduaneiro: string;
  numero_BL: string;
  numero_CE_Mercante: string;
  nome_navio: string;
  lista_containers: string;
  data_chegada: string;
  peso_bruto_total_kg: string;
  peso_liquido_total_kg: string;
  quantidade_total_embalagens: string;
  taxa_dolar: string;
  frete_usd: string;
  seguro_usd: string;
  VMLE_usd: string;
  VMLD_usd: string;
  tributo_II_recolhido_total: string;
  tributo_IPI_suspenso_total: string;
  tributo_IPI_recolhido_total: string;
  tributo_PIS_recolhido_total: string;
  tributo_COFINS_recolhido_total: string;
  valor_total_impostos_recolhidos: string;
}

export interface DIItem {
  invoice_number: string;
  numero_di: string;
  numero_adicao: string;
  ncm_completa: string;
  codigo_item: string;
  descricao_completa_detalhada_produto: string;
  reference: string;
  exportador_nome: string;
  pais_origem: string;
  pais_aquisicao: string;
  incoterm: string;
  quantidade_produto: string;
  unidade_comercial_produto: string;
  peso_liquido_adicao_kg: string;
  valor_unitario_produto_usd: string;
  valor_total_item_usd: string;
}

export interface DITaxInfo {
  invoice_number: string;
  numero_adicao: string;
  codigo_item: string;
  quantidade_item: string;
  vucv_usd: string;
  valor_total_item_usd: string;
  participacao_percentual_item: string;
  regime_tributacao_ii: string;
  aliquota_ii_percentual: string;
  valor_ii_recolhido: string;
  regime_tributacao_ipi: string;
  aliquota_ipi_percentual: string;
  valor_ipi_recolhido: string;
  base_calculo_pis: string;
  aliquota_pis_percentual: string;
  valor_pis_recolhido: string;
  base_calculo_cofins: string;
  aliquota_cofins_percentual: string;
  valor_cofins_recolhido: string;
  valor_total_tributos: string;
}

export interface DIProcessingResult {
  header: DIHeader;
  items: DIItem[];
  taxInfo: DITaxInfo[];
  summary?: {
    totalItems: number;
    totalAdditions: number;
    totalWeight: number;
    totalValue: number;
    totalTaxes: number;
  };
}

export interface DIValidationRules {
  requiredHeaderFields: (keyof DIHeader)[];
  requiredItemFields: (keyof DIItem)[];
  requiredTaxFields: (keyof DITaxInfo)[];
  numericFields: string[];
  dateFields: string[];
  cnpjFields: string[];
  cpfFields: string[];
}

export const diValidationRules: DIValidationRules = {
  requiredHeaderFields: [
    'numero_DI',
    'data_registro_DI',
    'nome_importador',
    'cnpj_importador',
    'quantidade_total_adicoes',
    'peso_bruto_total_kg',
    'peso_liquido_total_kg',
    'taxa_dolar',
    'VMLE_usd',
    'valor_total_impostos_recolhidos'
  ],
  requiredItemFields: [
    'numero_adicao',
    'ncm_completa',
    'codigo_item',
    'descricao_completa_detalhada_produto',
    'quantidade_produto',
    'unidade_comercial_produto',
    'valor_unitario_produto_usd',
    'valor_total_item_usd'
  ],
  requiredTaxFields: [
    'numero_adicao',
    'codigo_item',
    'valor_total_item_usd',
    'aliquota_ii_percentual',
    'valor_ii_recolhido',
    'valor_total_tributos'
  ],
  numericFields: [
    'quantidade_total_adicoes',
    'peso_bruto_total_kg',
    'peso_liquido_total_kg',
    'quantidade_total_embalagens',
    'taxa_dolar',
    'frete_usd',
    'seguro_usd',
    'VMLE_usd',
    'VMLD_usd',
    'tributo_II_recolhido_total',
    'tributo_IPI_suspenso_total',
    'tributo_IPI_recolhido_total',
    'tributo_PIS_recolhido_total',
    'tributo_COFINS_recolhido_total',
    'valor_total_impostos_recolhidos',
    'quantidade_produto',
    'valor_unitario_produto_usd',
    'valor_total_item_usd',
    'vucv_usd',
    'participacao_percentual_item',
    'aliquota_ii_percentual',
    'valor_ii_recolhido',
    'aliquota_ipi_percentual',
    'valor_ipi_recolhido',
    'base_calculo_pis',
    'aliquota_pis_percentual',
    'valor_pis_recolhido',
    'base_calculo_cofins',
    'aliquota_cofins_percentual',
    'valor_cofins_recolhido',
    'valor_total_tributos'
  ],
  dateFields: ['data_registro_DI', 'data_chegada'],
  cnpjFields: ['cnpj_importador', 'cnpj_adquirente'],
  cpfFields: ['representante_legal_CPF']
};

export interface DIProcessingOptions {
  calculateTotals?: boolean;
  validateTaxes?: boolean;
  mergeTaxWithItems?: boolean;
}