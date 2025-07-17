import { PromptStep } from '../base/types';

/**
 * Proforma Invoice prompts for processing
 */

// Step 1: Extract general header data
const step1GeneralDataPrompt = `Extract the general fields from the OCR reading of the document that is a proforma invoice.
Carefully analyze the content before assigning values.
You must extract the following fields:
contracted_company: this is the company issuing the document (i.e., the seller, supplier, or service provider). It is the one providing the goods or services. ⚠️ DO NOT confuse it with the buyer.
contracted_email: the email address of the contracted company (the issuer/supplier) — NEVER the buyer's email.
invoice_number: extract the invoice number from the document. Look for labels like "INVOICE NO.:", "Invoice Number:", "Invoice #:", or similar variations.
date: extract the document date and CONVERT IT to the Brazilian format DD/MM/YYYY. For example, if the original is "NOV 7th, 2024" or "2024-11-07", the correct result must be "07/11/2024" — strictly in this format.
⚠️ IMPORTANTE: ENTREGUE A DATA NO FORMATO BRASILEIRO, COM BARRAS E DUAS CASAS PARA DIA E MÊS (DD/MM/AAAA)
load_port: the loading port — ALWAYS use the city name if available!
destination: the destination — always use the city name if available
total_price: total invoice amount in USD
payment_terms: full and exact payment terms as written in the document
package: type of packaging described in the document
These fields are general — they are not item-level fields and must appear only once.
⚠️ VERY IMPORTANT:
Return a pure JSON object, not an array.
Do not include contracting_company or buyer-related data.
Do not include explanations, comments, markdown, or formatting — just the clean JSON.
Do not include \`\`\`json or any code fences.
Output must look like this:
{
"contracted_company": "Wuxi Muodou Intelligent Technology Co., Ltd",
"contracted_email": "manager@wuxivimode.com",
"invoice_number": "VIM250012",
"date": "07/11/2024",
"load_port": "China",
"destination": "Brazil",
"total_price": 288314.40,
"payment_terms": "30% IN ADVANCE, 20% BEFORE SHIPPING，50% BEFORE ARRIVEING BRAZIL",
"package": "CKD package in Carton with tire, with battery, with charger side support, double support, flat fork is assembled, change the handlebar, phone holder, add feetrest wiring harness suit for future GPS"
}
Make sure you select the contracted company as the supplier/issuer — NOT the client. Mistakes in this field will break downstream modules.
Entregue um json válido e puro. A resposta deve ser apenas o json e sem sequer a informação de que é um json.`;

// Step 2: Extract item details
const step2ItemsPrompt = `Extraia os dados resultantes da leitura OCR de um documento que é uma proforma invoice.

Visualize profundamente os dados antes de alocá-los.

Você deve preencher os seguintes campos para cada item detectado na listagem contida no documento:

1. item_number — número sequencial do item (começando em 1).
2. item — nome do item completo, incluindo código e variantes (ex: "Rear brake pad 后碟刹皮/鼓刹皮").
3. description_in_english — descrição completa do item em inglês, se disponível.
4. description_in_chinese — descrição completa exclusivamente em caracteres chineses, se houver (sem palavras em inglês ou traduções automáticas).
5. specifications — medidas, capacidades, voltagem, compatibilidades ou outros dados técnicos do item (caso estejam separados da descrição).
6. quantity — número de unidades do item.
7. unit_price — valor unitário do item.
8. package — tipo de embalagem ou observações sobre como o item será transportado ou entregue.

Regras obrigatórias:

- Todos os itens devem ser extraídos e listados, **sem exceção**.
- Mantenha a **ordem original dos itens** no documento.
- Retorne o resultado como um **JSON puro**, com todos os itens organizados em um array.
- Cada item deve conter **todos os campos exigidos**.
- Utilize apenas **caracteres chineses válidos** no campo "description_in_chinese" (sem misturar com inglês).
- Elimine linhas duplicadas, incompletas ou meramente ilustrativas (como cabeçalhos ou totalizadores).

Exemplo de estrutura de resposta:

[
  {
    "item_number": 1,
    "item": "Front brake pad 前碟刹皮",
    "description_in_english": "Front brake pad",
    "description_in_chinese": "前碟刹皮",
    "specifications": "Compatible with 3.0-10 inch disc",
    "quantity": 13,
    "unit_price": 9.00,
    "package": "in carton"
  }
]

IMPORTANTE! Entregue um json válido e puro. A resposta deve ser apenas o json e sem sequer a informação de que é um json.`;

/**
 * Proforma Invoice processing steps
 */
export const proformaInvoiceSteps: PromptStep[] = [
  {
    step: 1,
    name: "Extração de Dados Gerais",
    description: "Extraindo informações do cabeçalho da proforma invoice",
    prompt: step1GeneralDataPrompt,
    expectsInput: false
  },
  {
    step: 2,
    name: "Extração de Itens",
    description: "Extraindo lista detalhada de itens da proforma invoice",
    prompt: step2ItemsPrompt,
    expectsInput: false
  }
];

/**
 * Get total number of steps
 */
export const getTotalSteps = (): number => proformaInvoiceSteps.length;

/**
 * Get step information by step number
 */
export const getStepInfo = (step: number): PromptStep | null => {
  return proformaInvoiceSteps.find(s => s.step === step) || null;
};

/**
 * Get prompt for a specific step
 */
export const getPromptForStep = (step: number): string => {
  const stepInfo = getStepInfo(step);
  if (!stepInfo) {
    throw new Error(`Invalid step: ${step}`);
  }
  return stepInfo.prompt;
};

/**
 * Get all prompts as an array
 */
export const getAllPrompts = (): string[] => {
  return proformaInvoiceSteps.map(step => step.prompt);
};