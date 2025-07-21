export const contratoCambioPrompt = `You are receiving the OCR text of a Brazilian foreign exchange contract ("CONTRATO DE CÂMBIO").

1. Convert the entire content to UPPERCASE and remove ACCENTS.

2. Extract ONLY the fields listed below, using simple \`indexOf\` or regular expressions where needed.

3. Follow these specific rules for each field:

- contrato: the contract number  
- data: the contract date (format: DD/MM/YYYY)  
- corretora: name of the authorized institution (corretora)  
- moeda: 3-letter currency code (e.g., USD, EUR)  
- valor_estrangeiro: must be in the format **USD XXX.XXX,XX** — use dot as thousands separator, comma for decimal, and prefix USD (e.g., \`USD 153.250,00\`)  
- taxa_cambial: must be in the format **R$ X,XXX** — 3 decimal places, comma as decimal separator (e.g., \`R$ 5,432\`)  
- valor_nacional: must be in the format **R$ XXX.XXX,XX** — same style as above, but prefixed with **R$**  
- fatura: capture the **first alphanumeric code (no spaces)** that appears **immediately after** one of the following keywords: \`"FATURA"\`, \`"FAT"\`, \`"FAT. Nº"\`, \`"FATURA Nº"\`, \`"INVOICE"\`, \`"INVOICE NO"\`, \`"INV/"\`, or \`"/INV/"\`. Stop at the first space, tab, or line break.  
- recebedor: name of the foreign recipient/payer  
- pais: country of the foreign recipient/payer  
- endereco: address of the foreign recipient/payer  
- conta_bancaria: IBAN or foreign account number  
- swift: SWIFT code  
- banco_beneficiario: name of the foreign bank (look for "BANK", "BENEFICIARY BANK", or "BANK NAME")

4. If any field is missing, return its value as **null**.

⚠️ VERY IMPORTANT:
- Return **only the JSON object** — no explanations, no markdown, no \`\`\`json block, no intro text.
- The JSON must be clean and pure, exactly as shown below.

{
  "contrato": "<NUMERO DO CONTRATO DE CAMBIO>",
  "data": "<DATA DO CONTRATO>",
  "corretora": "<NOME DA INSTITUICAO AUTORIZADA / CORRETORA>",
  "moeda": "<CODIGO DA MOEDA>",
  "valor_estrangeiro": "USD XXX.XXX,XX",
  "taxa_cambial": "R$ X,XXX",
  "valor_nacional": "R$ XXX.XXX,XX",
  "fatura": "<NUMERO DA FATURA>",
  "recebedor": "<NOME DO PAGADOR OU RECEBEDOR NO EXTERIOR>",
  "pais": "<PAIS DO PAGADOR/RECEBEDOR>",
  "endereco": "<ENDERECO DO PAGADOR/RECEBEDOR>",
  "conta_bancaria": "<CONTA OU IBAN>",
  "swift": "<CODIGO SWIFT>",
  "banco_beneficiario": "<NOME DO BANCO DO BENEFICIARIO>"
}`;