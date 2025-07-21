/**
 * Prompts for Unknown Document Type Identification
 */

export const documentIdentificationPrompt = `Você é um classificador de DOCUMENTOS DE IMPORTAÇÃO.

VERIFIQUE CUIDADOSAMENTE OS DOCUMENTOS E BUSQUE TODOS OS DADOS SOLICITADOS SEMPRE.

1. Compare o texto com a tabela abaixo e escolha o tipo e o próximo módulo correspondente:

| Palavra-chave principal        | tipo                    | proximo_modulo             |
|--------------------------------|-------------------------|----------------------------|
| PROFORMA INVOICE               | PROFORMA_INVOICE        | extrair_proforma           |
| CONTRATO DE CAMBIO             | CONTRATO_CAMBIO         | extrair_contrato_cambio    |
| COMPROVANTE DE PAGAMENTO       | COMPROVANTE_CAMBIO      | extrair_comprovante_cambio |
| SWIFT                          | SWIFT                   | extrair_swift              |
| PACKING LIST                   | PACKING_LIST            | extrair_packing_list       |
| COMMERCIAL INVOICE             | COMMERCIAL_INVOICE      | extrair_commercial_inv     |
| BILL OF LADING                 | BILL_OF_LADING          | extrair_bl                 |
| NOTA FISCAL TRADING            | NOTA_FISCAL_TRADING     | extrair_nf_trading         |
| DECLARACAO DE IMPORTACAO       | DI                      | extrair_di                 |
| NUMERÁRIO                      | NUMERARIO               | extrair_numerario          |

**ATENÇÃO ESPECIAL PARA NUMERÁRIO:**
Os seguintes documentos são TODOS classificados como NUMERARIO:
- "Solicitação numerário" (documento inicial pedindo recursos)
- "Fechamento Financeiro" (documento final da despachante/trading)
- "Prestação de contas" (documento final da trading/despachante)
, "Relação das despesas"
- Documentos com "Total a receber do cliente", "Valor a depositar", "Saldo a pagar"

Se nada casar, defina:
tipo = DESCONHECIDO
proximo_modulo = fila_manual

2. Extraia o número do documento (document_number).
   • Para Proforma/Commercial Invoice → depois de "NO.", "DOC NO", "INVOICE NO".
   • Para Contrato de Câmbio → depois de "CONTRATO NO".
   • Para BL → "B/L", "BL", "BILL OF LADING NO".
   • Para Numerário → depois de "PROCESSO:", "IMP-", "VIM", "Referência", "NXT".
   • Se não existir, devolva null.

3. VERIFIQUE SE EXISTE NÚMERO DE INVOICE NO DOCUMENTO:
   • Procure por padrões como: "INVOICE", "INV", "FATURA", "REF", "REFERÊNCIA", "VIM"
   • Formatos comuns: ABC-2024-001, INV2024001, PI-24-001, CI-24-001, VIM240041, VIM230088-D
   • Em COMPROVANTES: procure em "descrição", "motivo", "observações", "identificador"
   • Em BILL OF LADING: procure em "marks", "description", "reference"
   • Em SWIFT: campo 70 (remittance information)
   • Em NUMERÁRIO: procure "Invoice / Proforma:", "Referência:", "REF. ADQUIRENTE", "VIM240xxx"
   • Os numeros validos de invoice estao em: {{465.data.Invoice}}, entao se encontrar aqui marque = true
   • (Contrato_Cambio não tem invoice, marque sempre como false!)

4. Gere um resumo de no máximo **200 caracteres** contendo:
   • tipo de documento
   • empresa principal mencionada
   • valor
   • data

5. **Retorne APENAS JSON**, sem comentários, sem texto extra, exatamente nesta estrutura:

{
  "tipo": "<TIPO>",
  "proximo_modulo": "<MODULO>",
  "document_number": "<STRING|null>",
  "has_invoice_number": <true|false>,
  "resumo": "<RESUMO>",
  "data": "<DATA>"
}

MUITA ATENCAO NISTOATENÇÃO: CONTRATO_CAMBIO NÃO TEM NUMERO DA INVOICE, ENTÃO É FALSE! 

IMPORTANTE: Entregue somente o JSON totalmente puro, sem comentários e nem indicação de que seja JSON. Apenas o JSON.

Entregue um json válido e puro. A resposta deve ser apenas o json e sem sequer a informação de que é um json.`;

export const invoiceExtractionPrompt = `
Extract any invoice or reference numbers from this document that could be used to link it to an import process.

Look for patterns like:
- Invoice numbers (INV, Invoice, Fatura)
- Proforma numbers (PI, Proforma)
- Reference numbers (REF, Reference)
- Order numbers (PO, Order)
- Process numbers (IMP-, PROC-)

Return a JSON response:
{
  "primary_reference": "main invoice/reference number",
  "all_references": ["list", "of", "all", "found", "references"],
  "reference_types": {
    "invoice": ["INV123"],
    "proforma": ["PI456"],
    "order": ["PO789"],
    "other": ["REF001"]
  }
}
`;

export const processMatchingPrompt = `
Given the extracted document data and a list of existing import processes, identify potential matches.

Document data: {document_data}
Existing processes: {process_list}

Match based on:
1. Invoice numbers
2. Company names
3. Dates (approximate)
4. Values/amounts
5. Product descriptions

Return a JSON response:
{
  "matches": [
    {
      "process_id": "IMP-XXX-MM-YYYY",
      "confidence": 0.95,
      "matching_fields": ["invoice_number", "company_name"],
      "explanation": "Why this is a match"
    }
  ],
  "no_match_reason": "If no matches found, explain why"
}
`;

export const dataExtractionPrompt = `
Extract all relevant data from this document for import/export processing.

Focus on:
1. Parties involved (buyer, seller, shipper, consignee)
2. Financial information (amounts, currencies, payment terms)
3. Dates (issue, shipment, delivery)
4. References (invoice numbers, order numbers)
5. Product/service descriptions
6. Shipping details (ports, vessels, containers)
7. Legal/tax information

Return a comprehensive JSON with all extracted data organized by category.
`;

// Map document types from the classification prompt to our DocumentType enum
export const documentTypeMapping: Record<string, string> = {
  'PROFORMA_INVOICE': 'proforma_invoice',
  'COMMERCIAL_INVOICE': 'commercial_invoice',
  'PACKING_LIST': 'packing_list',
  'SWIFT': 'swift',
  'DI': 'di',
  'NUMERARIO': 'numerario',
  'NOTA_FISCAL_TRADING': 'nota_fiscal',
  'BILL_OF_LADING': 'other', // Not yet implemented
  'CONTRATO_CAMBIO': 'other', // Not yet implemented  
  'COMPROVANTE_CAMBIO': 'other', // Not yet implemented
  'DESCONHECIDO': 'unknown'
};