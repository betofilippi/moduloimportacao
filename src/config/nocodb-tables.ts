/**
 * NocoDB Table Configuration
 *
 * Centralizes all table IDs and configurations for document storage
 * Update these IDs after creating the tables in NocoDB
 */

import { any } from "zod";

export const NOCODB_TABLES = {
  // DI (Declaração de Importação) Tables
  DI: {
    HEADERS: "m9qiln8qgkcnmef", // Main DI information
    ITEMS: "mqlpl3s0wwm7lo3", // Product items
    TAX_INFO: "mbjo5merhxuki9p", // Tax information per item
  },

  // Commercial Invoice Tables
  COMMERCIAL_INVOICE: {
    HEADERS: "mtqwpm79yju1buj",
    ITEMS: "mi6rg0i8prkersd",
  },

  // Packing List Tables
  PACKING_LIST: {
    HEADERS: "m5cyxr0o5pqqfx0",
    CONTAINER: "mpj2tx2ad68vcqt",
    ITEMS: "m0qyfhv7iih2tqo",
  },

  // Proforma Invoice Tables
  PROFORMA_INVOICE: {
    HEADERS: "mvqdwtl7vyq3k9t",
    ITEMS: "mccm8hfg71d1ecr",
  },

  // Single Tables
  SWIFT: "tbl_swift_transactions",
  NUMERARIO: "tbl_numerario_operations",

  // Upload tracking
  DOCUMENT_UPLOADS: "m6vjb2ircsf2kry", // Track all uploaded files

  // Audit/Metadata Tables
  AUDIT: {
    DOCUMENT_SAVES: "tbl_document_saves", // Track all save operations
    PROCESSING_LOGS: "tbl_processing_logs", // OCR processing history
  },
} as const;

/**
 * Table field mappings
 * Maps document fields to NocoDB column names
 */
export const TABLE_FIELD_MAPPINGS = {
  // DI Header Fields
  DI_HEADER: {
    numero_DI: "numero_DI",
    numero_invoice: "numero_invoice",
    data_registro_DI: "data_registro_DI",
    nome_importador: "nome_importador",
    cnpj_importador: "cnpj_importador",
    nome_adquirente: "nome_adquirente",
    cnpj_adquirente: "cnpj_adquirente",
    representante_legal_nome: "representante_legal_nome",
    representante_legal_CPF: "representante_legal_CPF",
    modalidade_despacho: "modalidade_despacho",
    quantidade_total_adicoes: "quantidade_total_adicoes",
    recinto_aduaneiro: "recinto_aduaneiro",
    numero_BL: "numero_BL",
    numero_CE_Mercante: "numero_CE_Mercante",
    nome_navio: "nome_navio",
    lista_containers: "lista_containers",
    data_chegada: "data_chegada",
    peso_bruto_total_kg: "peso_bruto_total_kg",
    peso_liquido_total_kg: "peso_liquido_total_kg",
    quantidade_total_embalagens: "quantidade_total_embalagens",
    taxa_dolar: "taxa_dolar",
    frete_usd: "frete_usd",
    seguro_usd: "seguro_usd",
    VMLE_usd: "VMLE_usd",
    VMLD_usd: "VMLD_usd",
    tributo_II_recolhido_total: "tributo_II_recolhido_total",
    tributo_IPI_suspenso_total: "tributo_IPI_suspenso_total",
    tributo_IPI_recolhido_total: "tributo_IPI_recolhido_total",
    tributo_PIS_recolhido_total: "tributo_PIS_recolhido_total",
    tributo_COFINS_recolhido_total: "tributo_COFINS_recolhido_total",
    valor_total_impostos_recolhidos: "valor_total_impostos_recolhidos",
  },

  // DI Item Fields - OCR retorna snake_case → banco usa camelCase
  DI_ITEM: {
    numero_di: "numero_di",
    numero_adicao: "numero_adicao",
    invoice_number: "invoice_number",
    ncm_completa: "ncm_completa",
    codigo_item: "codigo_item",
    descricao_completa_detalhada_produto:
      "descricao_completa_detalhada_produto",
    reference: "reference",
    exportador_nome: "exportador_nome",
    pais_origem: "pais_origem",
    pais_aquisicao: "pais_aquisicao",
    incoterm: "incoterm",
    quantidade_produto: "quantidade_produto",
    unidade_comercial_produto: "unidade_comercial_produto",
    peso_liquido_adicao_kg: "peso_liquido_adicao_kg",
    valor_unitario_produto_usd: "valor_unitario_produto_usd",
    valor_total_item_usd: "valor_total_item_usd",
  },

  DI_TAX_ITEM: {
    invoice_number: "invoice_number",
    numero_adicao: "numero_adicao",
    codigo_item: "codigo_item",
    quantidade_item: "quantidade_item",
    vucv_usd: "vucv_usd",
    valor_total_item_usd: "valor_total_item_usd",
    participacao_percentual_item: "participacao_percentual_item",
    regime_tributacao_ii: "regime_tributacao_ii",
    aliquota_ii_percentual: "aliquota_ii_percentual",
    valor_ii_recolhido: "valor_ii_recolhido",
    regime_tributacao_ipi: "regime_tributacao_ipi",
    aliquota_ipi_percentual: "aliquota_ipi_percentual",
    valor_ipi_recolhido: "valor_ipi_recolhido",
    base_calculo_pis: "base_calculo_pis",
    aliquota_pis_percentual: "aliquota_pis_percentual",
    valor_pis_recolhido: "valor_pis_recolhido",
    base_calculo_cofins: "base_calculo_cofins",
    aliquota_cofins_percentual: "aliquota_cofins_percentual",
    valor_cofins_recolhido: "valor_cofins_recolhido",
    valor_total_tributos: "valor_total_tributos",
  },
  // Commercial Invoice Fields
  COMMERCIAL_INVOICE_HEADER: {
    invoice_number: "invoiceNumber",
    invoice_date: "dataFatura",
    load_port: "portoEmbarque",
    destination_port: "portoDestino",
    shipper_company: "nomeExportador",
    shipper_address: "enderecoExportador",
    shipper_tel: "telefoneExportador",
    shipper_email: "emailExportador",
    consignee_company: "nomeImportador",
    consignee_address: "enderecoImportador",
    consignee_cnpj: "cnpjImportador",
    notify_party_company: "nomeNotificado",
    notify_party_cnpj: "cnpjNotificado",
    notify_party_address: "enderecoNotificado",
    total_amount_usd: "valorTotalUsd",
    total_amount_words: "valorTotalExtenso",
  },

  COMMERCIAL_INVOICE_ITEM: {
    invoice_number: "invoiceNumber",
    item_number: "numeroItem",
    reference: "referencia",
    name_chinese: "nomeChinês",
    name_english: "nomeIngles",
    quantity: "quantidade",
    unit: "unidade",
    unit_price_usd: "precoUnitarioUsd",
    amount_usd: "valorTotalUsd",
  },

  // Packing List Fields
  PACKING_LIST_HEADER: {
    consignee: "destinatario",
    contracted_company: "empresa_contratada",
    contracted_email: "email_contratado",
    date: "data",
    destination: "destino",
    invoice: "invoiceNumber",
    items_qty_total: "quantidade_total_itens",
    load_port: "porto_embarque",
    notify_party: "parte_notificada",
    package_total: "total_volumes",
    total_gw: "peso_bruto_total"
  },

    PACKING_LIST_CONTAINER: {
        booking: "reserva",
    container: "container",
    from_item: "item_inicial",
    from_package: "pacote_inicial",
    invoice: "invoiceNumber",
    peso_bruto: "peso_bruto",
    quantidade_de_pacotes: "quantidade_volumes",
    tipo_container: "tipo_container",
    to_item: "item_final",
    to_package: "pacote_final",
    volume: "volume"
  },

  PACKING_LIST_ITEM: {
    altura_pacote: "altura_pacote",
    comprimento_pacote: "comprimento_pacote",
    container: "container",
    descricao_chines: "descricao_chines",
    descricao_ingles: "descricao_ingles",
    item_number: "numero_item",
    largura_pacote: "largura_pacote",
    marcacao_do_pacote: "marcacao_pacote",
    peso_bruto_por_pacote: "peso_bruto_unitario",
    peso_bruto_total: "peso_bruto_total",
    peso_liquido_por_pacote: "peso_liquido_unitario",
    peso_liquido_total: "peso_liquido_total",
    quantidade_de_pacotes: "quantidade_pacotes",
    quantidade_por_pacote: "quantidade_unitaria",
    quantidade_total: "quantidade_total",
    reference: "referencia"
  },

  // Proforma Invoice Fields
  PROFORMA_INVOICE_HEADER: {
    contracted_company: "empresa_contratada",
    contracted_email: "email_contratado",
    invoice_number: "invoiceNumber",
    date: "data_fatura",
    load_port: "porto_embarque",
    destination: "destino",
    total_price: "preco_total",
    payment_terms: "condicoes_pagamento",
    package: "embalagem"
  },

  PROFORMA_INVOICE_ITEM: {
    item_number: "numero_item",
    item: "item",
    description_in_english: "descricao_ingles",
    description_in_chinese: "descricao_chines",
    specifications: "especificacoes",
    quantity: "quantidade",
    unit_price: "preco_unitario",
    package: "embalagem",
  },

  // Swift Fields - Mapeamento para português
  SWIFT: {
  tipo_mensagem: "message_type",
  referencia_remetente: "senders_reference",
  referencia_transacao: "transaction_reference",
  uetr: "uetr",
  codigo_operacao_bancaria: "bank_operation_code",
  data_valor: "value_date",
  moeda: "currency",
  valor: "amount",
  cliente_ordenante: "ordering_customer",
  instituicao_ordenante: "ordering_institution",
  bic_instituicao_conta: "account_with_institution_bic",
  instituicao_receptora: "receiver_institution",
  beneficiario: "beneficiary",
  informacoes_remessa: "remittance_information",
  invoiceNumber: "fatura",
  detalhes_tarifas: "details_of_charges",
  
  // Campos aninhados - ordering_customer
  cliente_ordenante_nome: "ordering_customer.name",
  cliente_ordenante_endereco: "ordering_customer.address",
  
  // Campos aninhados - ordering_institution
  instituicao_ordenante_nome: "ordering_institution.name",
  instituicao_ordenante_bic: "ordering_institution.bic",
  instituicao_ordenante_endereco: "ordering_institution.address",
  
  // Campos aninhados - receiver_institution
  instituicao_receptora_nome: "receiver_institution.name",
  instituicao_receptora_bic: "receiver_institution.bic",
  
  // Campos aninhados - beneficiary
  beneficiario_conta: "beneficiary.account",
  beneficiario_nome: "beneficiary.name",
  beneficiario_endereco: "beneficiary.address",
  },

  // Numerario Fields - Mapeamento para português
  NUMERARIO: {
  invoiceNumber: "invoice_number",
  tipo_documento: "tipo_documento",
  data_documento: "data_documento",
  cnpj_cliente: "cliente_cnpj",
  nome_cliente: "cliente_nome",
  taxa_cambio: "cambio_brl",
  valor_reais: "valor_reais",
  banco: "banco",
  conta_destino: "conta_destino",
  forma_pagamento: "forma_pagamento",
  parcelas: "parcelas",
  impostos: "impostos",
  taxas: "taxas",
  desconto: "desconto",
  valor_liquido: "valor_liquido",
  vendedor: "vendedor",
  comissao: "comissao",
  referencia_pedido: "referencia_pedido",
  observacoes: "observacoes",
  categoria: "categoria",
  nf_emitida: "nf_emitida",
  numero_nf: "numero_nf",
  data_emissao_nf: "data_emissao_nf"
  },
} as const;

/**
 * Get table ID for a document type
 */
export function getTableId(
  documentType: string,
  tableType?: "HEADERS" | "ITEMS" | "TAX_INFO"
): string {
  const upperType = documentType.toUpperCase().replace(/ /g, "_");

  // Type guard to check if the document type has multiple tables
  const hasMultipleTables = (
    type: string
  ): type is
    | "DI"
    | "COMMERCIAL_INVOICE"
    | "PACKING_LIST"
    | "PROFORMA_INVOICE" => {
    return (
      type === "DI" ||
      type === "COMMERCIAL_INVOICE" ||
      type === "PACKING_LIST" ||
      type === "PROFORMA_INVOICE"
    );
  };

  if (hasMultipleTables(upperType)) {
    const tables = NOCODB_TABLES[upperType];
    if (!tableType) {
      throw new Error(`Table type required for ${documentType}`);
    }

    // Type-safe property access
    if (upperType === "DI" && tableType in tables) {
      return tables[tableType as keyof typeof tables];
    } else if (
      (upperType === "COMMERCIAL_INVOICE" ||
        upperType === "PACKING_LIST" ||
        upperType === "PROFORMA_INVOICE") &&
      (tableType === "HEADERS" || tableType === "ITEMS")
    ) {
      return tables[tableType as keyof typeof tables];
    } else {
      throw new Error(`Invalid table type ${tableType} for ${documentType}`);
    }
  }

  // For single table documents (SWIFT, NUMERARIO)
  const tableId = NOCODB_TABLES[upperType as keyof typeof NOCODB_TABLES];
  if (typeof tableId === "string") {
    return tableId;
  }

  throw new Error(`Unknown document type: ${documentType}`);
}

/**
 * Transform document data to NocoDB format
 */
export function transformToNocoDBFormat(
  data: Record<string, any>,
  fieldMapping: Record<string, string>
): Record<string, any> {
  const transformed: Record<string, any> = {};

  for (const [docField, dbField] of Object.entries(fieldMapping)) {
    console.log("LOG FOR", docField, dbField);
    console.log("IF HAS PROPRIEDADE:", data.hasOwnProperty(docField));
    if (data.hasOwnProperty(docField)) {
      transformed[dbField] = data[docField];
    }
  }
  console.log("LOG TRANFORMED", transformed);
  return transformed;
}

/**
 * Transform NocoDB data back to document format
 */
export function transformFromNocoDBFormat(
  data: Record<string, any>,
  fieldMapping: Record<string, string>
): Record<string, any> {
  const transformed: Record<string, any> = {};
  const reverseMapping = Object.entries(fieldMapping).reduce(
    (acc, [docField, dbField]) => {
      acc[dbField] = docField;
      return acc;
    },
    {} as Record<string, string>
  );

  for (const [dbField, value] of Object.entries(data)) {
    if (reverseMapping[dbField]) {
      transformed[reverseMapping[dbField]] = value;
    }
  }

  return transformed;
}
