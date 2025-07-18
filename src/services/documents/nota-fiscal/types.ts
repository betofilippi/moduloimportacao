// Types for Nota Fiscal processing
export interface NotaFiscalHeader {
  // Dados gerais da NF-e
  invoice_number: string;
  numero_nf: string;
  serie: string;
  data_emissao: string;
  data_saida: string;
  hora_saida: string;
  chave_acesso: string;
  natureza_operacao: string;
  protocolo_autorizacao: string;
  
  // Documento
  url_document?: string;
  mimetype?: string;
  title?: string;
  size?: string;
  
  // Emitente
  emitente_razao_social: string;
  
  // Destinatário
  destinatario_razao_social: string;
  
  // Valores financeiros
  valor_total_produtos: string;
  valor_total_nota: string;
  base_calculo_icms: string;
  valor_icms: string;
  valor_total_ipi: string;
  valor_frete: string;
  valor_seguro: string;
  desconto: string;
  outras_despesas: string;
  
  // Transporte
  frete_por_conta: string;
  quantidade_volumes: string;
  especie_volumes: string;
  peso_bruto: string;
  peso_liquido: string;
  
  // Informações adicionais
  informacoes_complementares?: string;
  informacoes_fisco?: string;
  di_number?: string;
}

export interface NotaFiscalItem {
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
  reference?: string;
}

export interface NotaFiscalProcessingResult {
  header: NotaFiscalHeader;
  items: NotaFiscalItem[];
}

export interface NotaFiscalData {
  header?: NotaFiscalHeader;
  items?: NotaFiscalItem[];
}