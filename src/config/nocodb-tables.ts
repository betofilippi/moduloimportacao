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
  SWIFT: "m9w1hyki9w77zd7", 
  NUMERARIO: "m072re89i8a8nco",
  CONTRATO_CAMBIO: "mqf3r3nhr9ixiwx",
  
  // BL Tables
  BL: {
    HEADERS: "m9xnb8tnm1nmvxy",
    CONTAINERS: "m6xsvffd08d9igl"
  },

  // Nota Fiscal Tables
  NOTA_FISCAL: {
    HEADERS: "mby8zu4qlbxe441", // Main NF-e information
    ITEMS: "m62dvz7fghrgbes", // Product items
  },

  // Upload tracking
  DOCUMENT_UPLOADS: "m6vjb2ircsf2kry", // Track all uploaded files

  // Audit/Metadata Tables
  AUDIT: {
    DOCUMENT_SAVES: "tbl_document_saves", // Track all save operations
    PROCESSING_LOGS: "tbl_processing_logs", // OCR processing history
  },



  PROCESSOS_IMPORTACAO: "mny50szv4gbt195",
  PROCESSO_DOCUMENTO_REL: "mkdkorw13nh2gd9" // Relacionamento processo-documento
} as const;

/**
 * Table field mappings
 * Maps document fields to NocoDB column names
 */
export const TABLE_FIELD_MAPPINGS = {

  PROCESSOS_IMPORTACAO:{
  numero_processo: "numero_processo",
  invoiceNumber: "invoiceNumber", 
  numero_di: "numero_di",
  empresa: "empresa",
  cnpj_empresa: "cnpj_empresa",
  responsavel: "responsavel",
  email_responsavel: "email_responsavel",
  data_inicio: "data_inicio",
  data_conclusao: "data_conclusao",
  status: "status",
  valor_total_estimado: "valor_total_estimado",
  etapa: "etapa",
  moeda: "moeda",
},

  PROCESSO_DOCUMENTO_REL: {
    processo_importacao: "processo_importacao",
    hash_arquivo_upload: "hash_arquivo_upload"
  },






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
  destinatario: "consignee",
  empresa_contratada: "contracted_company",
  email_contratado: "contracted_email",
  data: "date",
  destino: "destination",
  invoiceNumber: "invoice",
  quantidade_total_itens: "items_qty_total",
  porto_embarque: "load_port",
  parte_notificada: "notify_party",
  total_volumes: "package_total",
  peso_bruto_total: "total_gw"

  },

    PACKING_LIST_CONTAINER: {
  reserva: "booking",
  container: "container",
  item_inicial: "from_item",
  pacote_inicial: "from_package",
  invoiceNumber: "invoice",
  peso_bruto: "peso_bruto",
  quantidade_volumes: "quantidade_de_pacotes",
  tipo_container: "tipo_container",
  item_final: "to_item",
  pacote_final: "to_package",
  volume: "volume"
  },

  PACKING_LIST_ITEM: {
    altura_pacote: "altura_pacote",
    comprimento_pacote: "comprimento_pacote",
    container: "container",
    descricao_chines: "descricao_chines",
    descricao_ingles: "descricao_ingles",
    numero_item: "numero_item",
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

  // Swift Fields - Mapeamento inglês para português (desaninhado)
  SWIFT: {
    // Campos simples
    message_type: "tipo_mensagem",
    senders_reference: "referencia_remetente",
    transaction_reference: "referencia_transacao",
    uetr: "uetr",
    bank_operation_code: "codigo_operacao_bancaria",
    value_date: "data_valor",
    currency: "moeda",
    amount: "valor",
    fatura: "invoiceNumber",
    details_of_charges: "detalhes_tarifas",
    remittance_information: "informacoes_remessa",
    account_with_institution_bic: "bic_instituicao_conta",
    
    // Campos desaninhados - ordering_customer
    ordering_customer_name: "cliente_ordenante_nome",
    ordering_customer_address: "cliente_ordenante_endereco",
    
    // Campos desaninhados - ordering_institution
    ordering_institution_name: "instituicao_ordenante_nome",
    ordering_institution_bic: "instituicao_ordenante_bic",
    ordering_institution_address: "instituicao_ordenante_endereco",
    
    // Campos desaninhados - receiver_institution
    receiver_institution_name: "instituicao_receptora_nome",
    receiver_institution_bic: "instituicao_receptora_bic",
    
    // Campos desaninhados - beneficiary
    beneficiary_account: "beneficiario_conta",
    beneficiary_name: "beneficiario_nome",
    beneficiary_address: "beneficiario_endereco",
  },

  // Numerario Fields - Mapeamento inglês para português (OCR -> Banco)
  NUMERARIO: {
    invoice_number: "invoiceNumber",
    tipo_documento: "tipo_documento",
    data_documento: "data_documento",
    cliente_cnpj: "cnpj_cliente",
    cliente_nome: "nome_cliente",
    cambio_brl: "taxa_cambio",
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
    data_emissao_nf: "data_emissao_nf",
    chave_nf: "chave_nf",
    created_by: "criado_por",
    updated_by: "atualizado_por"
  },

  // Nota Fiscal Header Fields - Mapeamento inglês para português (OCR -> Banco)
  NOTA_FISCAL_HEADER: {
    invoice_number: "invoiceNumber",
    numero_nf: "numeroNF",
    serie: "serie",
    data_emissao: "dataEmissao",
    data_saida: "dataSaida",
    hora_saida: "horaSaida",
    chave_acesso: "chaveAcesso",
    natureza_operacao: "naturezaOperacao",
    protocolo_autorizacao: "protocoloAutorizacao",
    url_document: "urlDocument",
    mimetype: "mimetype",
    title: "title",
    size: "size",
    emitente_razao_social: "emitenteRazaoSocial",
    destinatario_razao_social: "destinatarioRazaoSocial",
    valor_total_produtos: "valorTotalProdutos",
    valor_total_nota: "valorTotalNota",
    base_calculo_icms: "baseCalculoIcms",
    valor_icms: "valorIcms",
    valor_total_ipi: "valorTotalIpi",
    valor_frete: "valorFrete",
    valor_seguro: "valorSeguro",
    desconto: "desconto",
    outras_despesas: "outrasDespesas",
    frete_por_conta: "fretePorConta",
    quantidade_volumes: "quantidadeVolumes",
    especie_volumes: "especieVolumes",
    peso_bruto: "pesoBruto",
    peso_liquido: "pesoLiquido",
    informacoes_complementares: "informacoesComplementares",
    informacoes_fisco: "informacoesFisco",
    di_number: "diNumber"
  },

  // Nota Fiscal Item Fields - Mapeamento inglês para português (OCR -> Banco)
  NOTA_FISCAL_ITEM: {
    invoice_number: "invoiceNumber",
    codigo_produto: "codigoProduto",
    descricao_produto: "descricaoProduto",
    ncm_sh: "ncmSh",
    cfop: "cfop",
    unidade: "unidade",
    quantidade: "quantidade",
    valor_unitario: "valorUnitario",
    valor_total_produto: "valorTotalProduto",
    base_icms: "baseIcms",
    valor_icms_produto: "valorIcmsProduto",
    aliquota_icms: "aliquotaIcms",
    valor_ipi_produto: "valorIpiProduto",
    aliquota_ipi: "aliquotaIpi",
    reference: "reference"
  },
  
  // BL Header Fields - Mapeamento inglês para português (OCR -> Banco)
  BL_HEADER: {
    invoiceNumber: "invoiceNumber",
    bl_number: "bl_number",
    issue_date: "issue_date",
    onboard_date: "onboard_date",
    shipper: "shipper",
    consignee: "consignee",
    notify_party: "notify_party",
    cnpj_consignee: "cnpj_consignee",
    place_of_receipt: "place_of_receipt",
    port_of_loading: "port_of_loading",
    port_of_discharge: "port_of_discharge",
    place_of_delivery: "place_of_delivery",
    freight_term: "freight_term",
    cargo_description: "cargo_description",
    ncm_codes: "ncm_codes",
    package_type: "package_type",
    total_packages: "total_packages",
    total_weight_kg: "total_weight_kg",
    total_volume_cbm: "total_volume_cbm",
    freight_value_usd: "freight_value_usd",
    freight_value_brl: "freight_value_brl",
    freight_agent: "freight_agent",
    vessel_name: "vessel_name",
    voy_number: "voy_number"
  },
  
  // BL Container Fields - Mapeamento inglês para português (OCR -> Banco)
  BL_CONTAINER: {
    invoiceNumber: "invoiceNumber",
    container_number: "container_number",
    container_size: "container_size",
    seal_number: "seal_number",
    booking_number: "booking_number",
    total_packages: "total_packages",
    gross_weight_kg: "gross_weight_kg",
    volume_cbm: "volume_cbm",
    bl_number: "bl_number"
  },
  
  // Contrato de Câmbio Fields - Mapeamento inglês para português (OCR -> Banco)
  CONTRATO_CAMBIO: {
    contrato: "contrato",
    data: "data",
    corretora: "corretora",
    moeda: "moeda",
    valor_estrangeiro: "valor_estrangeiro",
    taxa_cambial: "taxa_cambial",
    valor_nacional: "valor_nacional",
    fatura: "invoiceNumber",
    recebedor: "recebedor",
    pais: "pais",
    endereco: "endereco",
    conta_bancaria: "conta_bancaria",
    swift: "swift",
    banco_beneficiario: "banco_beneficiario"
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
    | "PROFORMA_INVOICE"
    | "NOTA_FISCAL"
    | "BL" => {
    return (
      type === "DI" ||
      type === "COMMERCIAL_INVOICE" ||
      type === "PACKING_LIST" ||
      type === "PROFORMA_INVOICE" ||
      type === "NOTA_FISCAL" ||
      type === "BL"
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
        upperType === "PROFORMA_INVOICE" ||
        upperType === "NOTA_FISCAL") &&
      (tableType === "HEADERS" || tableType === "ITEMS")
    ) {
      return tables[tableType as keyof typeof tables];
    } else if (
      upperType === "BL" &&
      (tableType === "HEADERS" || tableType === "CONTAINERS")
    ) {
      return tables[tableType as keyof typeof tables];
    } else {
      throw new Error(`Invalid table type ${tableType} for ${documentType}`);
    }
  }

  // For single table documents (SWIFT, NUMERARIO, CONTRATO_CAMBIO)
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

  // The mapping is englishField -> portugueseField
  // We need to transform from english (source) to portuguese (target)
  for (const [englishField, portugueseField] of Object.entries(fieldMapping)) {
    console.log("Mapping", englishField, "->", portugueseField);
    
    if (data.hasOwnProperty(englishField)) {
      transformed[portugueseField] = data[englishField];
      console.log("Mapped value:", data[englishField]);
    }
  }
  
  console.log("Transformed data:", transformed);
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
    (acc, [dbField, docField]) => {
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

/**
 * Unflatten Swift data to restore nested structure
 */
export function unflattenSwiftData(flatData: Record<string, any>): Record<string, any> {
  const unflattened: Record<string, any> = {};
  
  // Simple fields
  unflattened.message_type = flatData.message_type;
  unflattened.senders_reference = flatData.senders_reference;
  unflattened.transaction_reference = flatData.transaction_reference;
  unflattened.uetr = flatData.uetr;
  unflattened.bank_operation_code = flatData.bank_operation_code;
  unflattened.value_date = flatData.value_date;
  unflattened.currency = flatData.currency;
  unflattened.amount = flatData.amount;
  unflattened.fatura = flatData.fatura;
  unflattened.details_of_charges = flatData.details_of_charges;
  unflattened.remittance_information = flatData.remittance_information;
  unflattened.account_with_institution_bic = flatData.account_with_institution_bic;
  
  // Reconstruct ordering_customer
  if (flatData.ordering_customer_name || flatData.ordering_customer_address) {
    unflattened.ordering_customer = {
      name: flatData.ordering_customer_name || '',
      address: flatData.ordering_customer_address || ''
    };
  }
  
  // Reconstruct ordering_institution
  if (flatData.ordering_institution_name || flatData.ordering_institution_bic || flatData.ordering_institution_address) {
    unflattened.ordering_institution = {
      name: flatData.ordering_institution_name || '',
      bic: flatData.ordering_institution_bic || '',
      address: flatData.ordering_institution_address || ''
    };
  }
  
  // Reconstruct receiver_institution
  if (flatData.receiver_institution_name || flatData.receiver_institution_bic) {
    unflattened.receiver_institution = {
      name: flatData.receiver_institution_name || '',
      bic: flatData.receiver_institution_bic || ''
    };
  }
  
  // Reconstruct beneficiary
  if (flatData.beneficiary_account || flatData.beneficiary_name || flatData.beneficiary_address) {
    unflattened.beneficiary = {
      account: flatData.beneficiary_account || '',
      name: flatData.beneficiary_name || '',
      address: flatData.beneficiary_address || ''
    };
  }
  
  return unflattened;
}

/**
 * Kanban Configuration
 * Define the stages for kanban visualization
 */
export const KANBAN_CONFIG = {
  // Process stages/columns
  STAGES: [
    {
      id: 'solicitado',
      title: 'Solicitado',
      color: 'bg-blue-500',
      description: 'Processos recém criados aguardando início'
    },
    {
      id: 'em_transporte',
      title: 'Em Transporte',
      color: 'bg-yellow-500',
      description: 'Mercadoria em trânsito internacional'
    },
    {
      id: 'processamento_nacional',
      title: 'Processamento Nacional',
      color: 'bg-orange-500',
      description: 'Em processo de desembaraço aduaneiro'
    },
    {
      id: 'em_transporte_local',
      title: 'Em Transporte Local',
      color: 'bg-purple-500',
      description: 'Transporte nacional até destino final'
    },
    {
      id: 'recebido',
      title: 'Recebido',
      color: 'bg-green-500',
      description: 'Mercadoria recebida no destino'
    },
    {
      id: 'auditado',
      title: 'Auditado',
      color: 'bg-gray-500',
      description: 'Processo finalizado e auditado'
    }
  ],
  
  // Default stage for new processes
  DEFAULT_STAGE: 'solicitado',
  
  // Legacy stage mappings (for backward compatibility)
  STAGE_MAPPINGS: {
    'Solicitado': 'solicitado',
    'Em Transporte': 'em_transporte',
    'Processamento Nacional': 'processamento_nacional',
    'Em Transporte Local': 'em_transporte_local',
    'Recebido': 'recebido',
    'Auditado': 'auditado'
  },
  
  // Allowed transitions (optional - for future use)
  TRANSITIONS: {
    'solicitado': ['em_transporte'],
    'em_transporte': ['processamento_nacional'],
    'processamento_nacional': ['em_transporte_local'],
    'em_transporte_local': ['recebido'],
    'recebido': ['auditado'],
    'auditado': [] // Final stage
  }
} as const;
