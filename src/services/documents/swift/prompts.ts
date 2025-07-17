import { PromptStep } from '../base/types';

/**
 * Swift prompts for processing
 */

// Single step Swift extraction prompt
const swiftExtractionPrompt = `Você é um extrator de dados especializado em mensagens SWIFT.

TAREFA  
1. Receba o texto OCR bruto entre <<< e >>>.  
   • O texto já virá MAIÚSCULO e SEM ACENTOS; se não, converta-o.  
2. Para cada campo abaixo, procure TODAS as variações usuais (tag ":NN:" e/ou cabeçalho descritivo).  
   • Se não encontrar, preencha com string vazia ("") ou 0 para números.  
3. Normalize os valores conforme as REGRAS abaixo e devolva **somente o JSON final puro**.

CAMPOS A EXTRAIR  
| Campo JSON | Onde procurar (exemplos) |
|------------|--------------------------|
| **message_type** | "FIN 103", "FIN.103", "APPLICATION FIN 103", etc. Se não achar, "UNKNOWN". |
| **senders_reference** | \`:20:\`  **ou**  "SENDERS REFERENCE"  **ou**  ":20: SENDERS REFERENCE". |
| **transaction_reference** | \`:21:\`  **ou**  "TRANSACTION'S REFERENCE", "TRANSACTION REFERENCE". |
| **uetr** | Linha contendo "UETR" ou \`:121:\` (padrão UUID). |
| **bank_operation_code** | \`:23B:\` ou "BANK OPERATION CODE". |
| **value_date / currency / amount** | \`:32A:\` (formato \`DDMMYYUSD1234,56\`). Se não existir, tente \`:33B:\`. |
| **ordering_customer.name / address** | Bloco após \`:50K:\` (**OU** "ORDERING CUSTOMER") até antes de \`:52\`, \`:53\`, \`:57\`. Primeira linha = nome; restante = endereço. |
| **ordering_institution.name / bic / address** | Bloco \`:52D:\` **OU** \`:53B:\`. Primeira linha = nome; tente extrair BIC (8-11 letras) se aparecer. |
| **account_with_institution_bic** | \`:57A:\` (8–11 letras). |
| **receiver_institution.name / bic** | "RECEIVER INSTITUTION" **OU** próximo ao account_with_institution. Nome do banco beneficiário e seu BIC. |
| **beneficiary.account / name / address** | Bloco \`:59:\` **OU** \`:59F:\`. Primeiro número = conta (somente números, sem / ou .); primeira linha texto = nome; restante = endereço. |
| **remittance_information** | \`:70:\` – pegue o texto inteiro. |
| **fatura** | Primeiro código alfanumérico logo após qualquer uma destas palavras:  
  "FATURA", "FAT.", "/INV/", "INV/", "INVOICE", "INVOICE NO". |
| **details_of_charges** | \`:71A:\` (ex.: OUR, SHA, BEN). |

REGRAS DE FORMATO:
- **value_date**: converta \`DDMMYY\` para **formato brasileiro DD/MM/AAAA** (ex.: 231123 → 23/11/2023).  
- **currency**: extraído da mesma linha do \`:32A:\` ou \`:33B:\`  
- **amount**: substitua vírgula por ponto, remova separadores de milhar. Se vazio → 0  
- **beneficiary.account**: mantenha somente os **números**, remova barras, pontos e outros símbolos  
- **Todos os nomes e endereços** (de \`ordering_customer\`, \`ordering_institution\`, \`beneficiary\`, \`receiver_institution\`) devem conter apenas **letras, números, vírgulas e espaços**. Remova qualquer caractere estranho (como \`*\`, \`#\`, \`/\`, \`\\\`, etc.)

MODELO JSON (formato e ordem obrigatória):
{
  "message_type": "",
  "senders_reference": "",
  "transaction_reference": "",
  "uetr": "",
  "bank_operation_code": "",
  "value_date": "",
  "currency": "",
  "amount": 0,
  "ordering_customer": {
    "name": "",
    "address": ""
  },
  "ordering_institution": {
    "name": "",
    "bic": "",
    "address": ""
  },
  "account_with_institution_bic": "",
  "receiver_institution": {
    "name": "",
    "bic": ""
  },
  "beneficiary": {
    "account": "",
    "name": "",
    "address": ""
  },
  "remittance_information": "",
  "fatura": "",
  "details_of_charges": ""
}

⚠️ IMPORTANTE:
- Responda **somente com o JSON acima**, sem prefixos, sem comentários, sem blocos \`\`\`\`\`, e sem explicações.  
- **Todos os campos devem estar presentes** na ordem especificada.  
- Campos ausentes = \`""\`, e valores numéricos ausentes = \`0\`.

Entregue um json válido e puro. A resposta deve ser apenas o json e sem sequer a informação de que é um json.`;

/**
 * Swift processing steps (single step only)
 */
export const swiftSteps: PromptStep[] = [
  {
    step: 1,
    name: "Extração de Dados SWIFT",
    description: "Extraindo todos os campos da mensagem SWIFT",
    prompt: swiftExtractionPrompt,
    expectsInput: false
  }
];

/**
 * Get the single Swift prompt
 */
export const getSwiftPrompt = (): string => {
  return swiftExtractionPrompt;
};

/**
 * Get total number of steps
 */
export const getTotalSteps = (): number => swiftSteps.length;

/**
 * Get step information by step number
 */
export const getStepInfo = (step: number): PromptStep | null => {
  return swiftSteps.find(s => s.step === step) || null;
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
  return swiftSteps.map(step => step.prompt);
};