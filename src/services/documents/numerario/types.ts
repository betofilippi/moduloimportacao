// Types for Numerário (Nota Fiscal) document processing

export interface NumerarioHeader {
  invoice_number: string;
  numero_nf: string;
  serie: string;
  data_emissao: string;
  data_saida: string;
  hora_saida: string;
  chave_acesso: string;
  natureza_operacao: string;
  protocolo_autorizacao: string;
  url_document: string;
  mimetype: string;
  title: string;
  size: string;
  emitente_razao_social: string;
  destinatario_razao_social: string;
  valor_total_produtos: string;
  valor_total_nota: string;
  base_calculo_icms: string;
  valor_icms: string;
  valor_total_ipi: string;
  valor_frete: string;
  valor_seguro: string;
  desconto: string;
  outras_despesas: string;
  frete_por_conta: string;
  quantidade_volumes: string;
  especie_volumes: string;
  peso_bruto: string;
  peso_liquido: string;
  informacoes_complementares: string;
  informacoes_fisco: string;
  di_number: string;
}

export interface NumerarioItem {
  invoice_number: string;
  codigo_produto: string;
  descricao_produto: string;
  ncm_sh: string;
  cfop: string;
  unidade: string;
  quantidade: string;
  valor_unitario: string;
  valor_total_produto: string;
  base_icms: string;
  valor_icms_produto: string;
  aliquota_icms: string;
  valor_ipi_produto: string;
  aliquota_ipi: string;
  reference: string;
}

export interface NumerarioDIInfo {
  numero_di: string;
}

export interface NumerarioProcessingResult {
  diInfo: NumerarioDIInfo;
  header: NumerarioHeader;
  items: NumerarioItem[];
  summary?: {
    totalItems: number;
    totalValue: number;
    totalICMS: number;
    totalIPI: number;
    totalWeight: number;
  };
}

export interface NumerarioValidationRules {
  requiredHeaderFields: (keyof NumerarioHeader)[];
  requiredItemFields: (keyof NumerarioItem)[];
  numericFields: string[];
  dateFields: string[];
  cnpjFields: string[];
}

export const numerarioValidationRules: NumerarioValidationRules = {
  requiredHeaderFields: [
    'numero_nf',
    'serie',
    'data_emissao',
    'chave_acesso',
    'emitente_razao_social',
    'destinatario_razao_social',
    'valor_total_produtos',
    'valor_total_nota'
  ],
  requiredItemFields: [
    'codigo_produto',
    'descricao_produto',
    'ncm_sh',
    'cfop',
    'unidade',
    'quantidade',
    'valor_unitario',
    'valor_total_produto'
  ],
  numericFields: [
    'valor_total_produtos',
    'valor_total_nota',
    'base_calculo_icms',
    'valor_icms',
    'valor_total_ipi',
    'valor_frete',
    'valor_seguro',
    'desconto',
    'outras_despesas',
    'quantidade_volumes',
    'peso_bruto',
    'peso_liquido',
    'quantidade',
    'valor_unitario',
    'valor_total_produto',
    'base_icms',
    'valor_icms_produto',
    'aliquota_icms',
    'valor_ipi_produto',
    'aliquota_ipi'
  ],
  dateFields: ['data_emissao', 'data_saida'],
  cnpjFields: [] // These would be in the full NF-e data if needed
};

export interface NumerarioProcessingOptions {
  extractDI?: boolean;
  calculateTotals?: boolean;
  validateTaxes?: boolean;
}