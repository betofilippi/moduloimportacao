import { PromptStep } from '../base/types';

// Multi-step prompts for Nota Fiscal processing
export const notaFiscalSteps: PromptStep[] = [
  {
    step: 1,
    name: "Header",
    description: "Extraindo informações gerais da Nota Fiscal Eletrônica",
    prompt: `Extraia os dados gerais desta Nota Fiscal Eletrônica e retorne em formato JSON estruturado. Mantenha os valores exatos como aparecem no documento.

CAMPOS OBRIGATÓRIOS:

**DADOS GERAIS DA NF-e:**
- invoice_number
- numero_nf
- serie  
- data_emissao
- data_saida
- hora_saida
- chave_acesso
- natureza_operacao
- protocolo_autorizacao

**DOCUMENTO:**
- url_document
- mimetype
- title
- size

**EMITENTE:**
- emitente_razao_social

**DESTINATÁRIO:**
- destinatario_razao_social

**VALORES FINANCEIROS:**
- valor_total_produtos
- valor_total_nota
- base_calculo_icms
- valor_icms
- valor_total_ipi
- valor_frete
- valor_seguro
- desconto
- outras_despesas

**TRANSPORTE:**
- frete_por_conta
- quantidade_volumes
- especie_volumes
- peso_bruto
- peso_liquido

**INFORMAÇÕES ADICIONAIS:**
- informacoes_complementares
- informacoes_fisco
- di_number 

Exemplo de saída esperada:
{
  "invoice_number": "000.003.622",
  "numero_nf": "000.003.622",
  "serie": "001",
  "data_emissao": "13/03/2025",
  "data_saida": "13/03/2025",
  "hora_saida": "11:30:38",
  "chave_acesso": "4225 0320 4036 9900 0148 5500 1000 0036 2211 7216 3712",
  "natureza_operacao": "Remessa de mercadoria por conta e ordem de terceiros",
  "protocolo_autorizacao": "242250094333132 - 13/03/2025 11:34:23",
  "url_document": "",
  "mimetype": "",
  "title": "",
  "size": "",
  "emitente_razao_social": "CARAVAN DO BRASIL TRADING LTDA",
  "destinatario_razao_social": "NXT INDÚSTRIA E COMÉRCIO LTDA",
  "valor_total_produtos": "396.570,43",
  "valor_total_nota": "432.261,77",
  "base_calculo_icms": "396.570,43",
  "valor_icms": "15.862,82",
  "valor_total_ipi": "35.691,34",
  "valor_frete": "0,00",
  "valor_seguro": "0,00",
  "desconto": "0,00",
  "outras_despesas": "0,00",
  "frete_por_conta": "1-Destinatário",
  "quantidade_volumes": "186",
  "especie_volumes": "OUTROS",
  "peso_bruto": "11.184,000",
  "peso_liquido": "10.224,000",
  "informacoes_complementares": "NFe Ref.: série:1 número:3621...",
  "informacoes_fisco": "PROCESSO NXT 25-005, DI 25/0497271-6...",
  "di_number": "(numero da DI, que pode ser encontrado nas informacoes complementares)"
}

Localize a invoice_number como numero da Fatura, nas informacoes complementares. Se não houver invoice_number no documento, use {{472.di_pertence_a_invoice}}

Retorne APENAS o JSON, sem explicações ou texto adicional e sem sequer a indicação de que seja um json.`,
    expectsInput: false
  },
  {
    step: 2,
    name: "Items",
    description: "Extraindo todos os produtos/itens da Nota Fiscal",
    prompt: `Extraia APENAS os dados dos produtos/itens desta Nota Fiscal Eletrônica e retorne em formato JSON estruturado. Mantenha os valores exatos como aparecem no documento.

CAMPOS OBRIGATÓRIOS para cada produto:
- invoice_number
- codigo_produto
- descricao_produto
- ncm_sh
- cfop
- unidade
- quantidade
- valor_unitario
- valor_total_produto
- base_icms
- valor_icms_produto
- aliquota_icms
- valor_ipi_produto
- aliquota_ipi
- reference

Exemplo de saída esperada:
[
  {
    "invoice_number": "000.003.622",
    "codigo_produto": "5280833",
    "descricao_produto": "Y1 - PARTES E PEÇAS PARA SCOOTER ELÉTRICA...",
    "ncm_sh": "87141000",
    "cfop": "5949",
    "unidade": "KT",
    "quantidade": "156,0000",
    "valor_unitario": "2.100,2210",
    "valor_total_produto": "327.634,47",
    "base_icms": "327.634,47",
    "valor_icms_produto": "13.105,38",
    "aliquota_icms": "4,00",
    "valor_ipi_produto": "29.487,10",
    "aliquota_ipi": "9,00",
    "reference": "Y1"
  },
  {
    "invoice_number": "000.003.622",
    "codigo_produto": "5280834",
    "descricao_produto": "YZL - PARTES E PEÇAS PARA SCOOTER ELÉTRICA...",
    "ncm_sh": "87141000",
    "cfop": "5949",
    "unidade": "KT",
    "quantidade": "30,0000",
    "valor_unitario": "2.297,8653",
    "valor_total_produto": "68.935,96",
    "base_icms": "68.935,96",
    "valor_icms_produto": "2.757,44",
    "aliquota_icms": "4,00",
    "valor_ipi_produto": "6.204,24",
    "aliquota_ipi": "9,00",
    "reference": "YZL"
  }
]

O campo reference é o código referenciador do produto que geralmente está na descrição, curto e alfanumérico.

Localize a invoice_number como numero da Fatura, nas informacoes complementares.

Retorne APENAS o array JSON dos produtos, sem explicações ou texto adicional e sem sequer a indicação de que seja um json.`,
    expectsInput: true
  }
];

// Single prompt for simple extraction (fallback)
export const notaFiscalPrompt = `
Extraia os dados completos desta Nota Fiscal Eletrônica incluindo header e itens.

Retorne em formato JSON com a seguinte estrutura:
{
  "header": {
    // Dados do cabeçalho da NF-e
  },
  "items": [
    // Array de produtos/itens
  ]
}
`;