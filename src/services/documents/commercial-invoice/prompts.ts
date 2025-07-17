import { PromptStep } from '../base/types';

/**
 * Commercial Invoice prompts
 * Multi-step processing (2 steps as per PROMPTSMAKE)
 */

/**
 * Step 1: Extract general invoice data (header information)
 */
export const getCommercialInvoiceStep1Prompt = (): string => {
  return `Extraia os dados gerais desta Commercial Invoice e retorne em formato JSON estruturado. Mantenha os valores exatos como aparecem no documento.

CAMPOS OBRIGATÓRIOS:

**DADOS GERAIS:**
- invoice_number
- invoice_date
- load_port
- destination_port

**DOCUMENTO:**
- document_url

**SHIPPER/FORNECEDOR:**
- shipper_company
- shipper_address
- shipper_tel
- shipper_email

**CONSIGNEE/DESTINATÁRIO:**
- consignee_company
- consignee_address
- consignee_cnpj

**NOTIFY PARTY:**
- notify_party_company
- notify_party_cnpj
- notify_party_address

**VALORES FINANCEIROS:**
- total_amount_usd
- total_amount_words

Exemplo de saída esperada:
{
  "invoice_number": "VIM240008",
  "invoice_date": "25th, Aug, 2024",
  "load_port": "SHANGHAI",
  "destination_port": "NAVEGANTES",
  "document_url": "",
  "shipper_company": "Wuxi Muodou Intelligent Technology Co., Ltd",
  "shipper_address": "NO.22 Jingxin Rode, Zhangjin Industrial Park, XiShan District,Wuxi,Jiangsu,China",
  "shipper_tel": "+86 18914170557",
  "shipper_email": "manager@wuxivimode.com",
  "consignee_company": "BRASIL COMEX IMPORTAÇÃO EEXPORTAÇÃO LTDA",
  "consignee_address": "RUA URUGUAI 223 SALA 1907 ANDAR 19, 88.302-201 CENTRO - ITAJAI/SC",
  "consignee_cnpj": "39.812.932/0001-74",
  "notify_party_company": "NXT INDUSTRIA E COMERCIO LTDA",
  "notify_party_cnpj": "52.889.100/0001-14",
  "notify_party_address": "R.JORGE CZERNIEWICZ-590 AREA 1289.255-000-CZERNIEWICZ-JARAGUÁ DO SUL-SC",
  "total_amount_usd": "133,522.60",
  "total_amount_words": "US DOLLARS ONE HUNDRED AND THIRTY THREE THOUSAND FIVE HUNDRED AND TWENTY TWO AND SIXTY ONLY"
}

Nunca acrescente $ aos dados monetários.
Retorne APENAS o JSON, sem explicações ou texto adicional e sem sequer a indicação de que seja um json.`;
};

/**
 * Step 2: Extract item details from commercial invoice
 */
export const getCommercialInvoiceStep2Prompt = (): string => {
  return `Extraia APENAS os dados dos itens desta Commercial Invoice e retorne em formato JSON estruturado. Mantenha os valores exatos como aparecem no documento.

REGRA ESPECIAL PARA REFERENCE:
Quando encontrar itens com reference vazia ("" ou em branco), procure nos itens próximos (antes ou depois) qual tem a reference preenchida e use essa mesma reference para todos os itens vazios do grupo.

EXEMPLO:
Se você vê:
- Item A: reference = ""
- Item B: reference = ""  
- Item C: reference = "Kay001"
- Item D: reference = ""

Resultado final:
- Item A: reference = "Kay001"
- Item B: reference = "Kay001"
- Item C: reference = "Kay001" 
- Item D: reference = "Kay001"

TODOS do mesmo grupo usam "Kay001".

CAMPOS OBRIGATÓRIOS para cada item:
- invoice_number
- item_number
- reference
- name_chinese
- name_english
- quantity
- unit
- unit_price_usd
- amount_usd

Exemplo de saída esperada:
[
  {
    "invoice_number": "VIM240008",
    "item_number": "1",
    "reference": "Kay001",
    "name_chinese": "前叉总成",
    "name_english": "Front Fork Assembly",
    "quantity": "220",
    "unit": "pcs",
    "unit_price_usd": "12.08",
    "amount_usd": "2,657.60"
  },
  {
    "invoice_number": "VIM240008",
    "item_number": "2",
    "reference": "Kay002",
    "name_chinese": "前碟刹泵",
    "name_english": "Front Disc Brake Pump",
    "quantity": "220",
    "unit": "pcs",
    "unit_price_usd": "8.68",
    "amount_usd": "1,909.60"
  }
]

Nunca acrescente $ aos dados monetários.
Entregue um json válido e puro. A resposta deve ser apenas o json e sem sequer a informação de que é um json.`;
};

/**
 * Get the single-step prompt (for backward compatibility)
 */
export const getCommercialInvoicePrompt = (): string => {
  // Combine both prompts for single-step processing if needed
  return getCommercialInvoiceStep1Prompt() + '\n\n' + getCommercialInvoiceStep2Prompt();
};

/**
 * Commercial Invoice processing steps (multi-step approach)
 */
export const commercialInvoiceSteps: PromptStep[] = [
  {
    step: 1,
    name: "Extração de Dados Gerais",
    description: "Extraindo informações do cabeçalho da commercial invoice",
    prompt: getCommercialInvoiceStep1Prompt(),
    expectsInput: false
  },
  {
    step: 2,
    name: "Extração de Itens",
    description: "Extraindo lista detalhada de itens da commercial invoice",
    prompt: getCommercialInvoiceStep2Prompt(),
    expectsInput: false
  }
];

export const getTotalSteps = (): number => commercialInvoiceSteps.length;

export const getStepInfo = (step: number): PromptStep | null => {
  return commercialInvoiceSteps.find(s => s.step === step) || null;
};

export const getPromptForStep = (step: number, previousResult?: string): string => {
  const stepInfo = getStepInfo(step);
  if (!stepInfo) {
    throw new Error(`Invalid step: ${step}`);
  }

  return stepInfo.prompt;
};

/**
 * Alternative prompts for different invoice formats
 */
export const getSimplifiedInvoicePrompt = (): string => {
  return `
Extraia as seguintes informações da commercial invoice:

OBRIGATÓRIO:
- Número da invoice
- Valor total
- Moeda
- Nome do fornecedor
- Nome do comprador
- Lista de produtos com quantidades e preços

Retorne em formato JSON simples sem explicações.
`;
};

export const getDetailedInvoicePrompt = (): string => {
  return getCommercialInvoicePrompt(); // Same as main prompt for now
};