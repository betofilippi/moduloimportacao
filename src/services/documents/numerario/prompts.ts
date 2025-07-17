// Prompts for Numerário (Nota Fiscal) document processing
import { PromptStep } from '../base/types';

export const numerarioPrompts = {
  step1_di_number: `Extraia os seguintes campos dos documentos de OCR de fechamento financeiro/prestação de contas. Entregue a saída em JSON seguindo exatamente o exemplo abaixo.
Campos a extrair:

invoice_number (número da invoice/fatura)
tipo_documento (ex: "Extrato fechamento financeiro", "Prestação de contas")
data_documento (data do documento)
cliente_cnpj (CNPJ do cliente/adquirente)
cliente_nome (nome do cliente/adquirente)
cambio_brl (taxa de câmbio USD/BRL)
valor_reais (valor total em reais)
banco (nome do banco mencionado)
conta_destino (conta bancária de destino)
forma_pagamento (forma de pagamento mencionada)
parcelas (número de parcelas, se houver)
impostos (valor total de impostos)
taxas (valor total de taxas)
desconto (valor de desconto)
valor_liquido (valor líquido final)
vendedor (nome do vendedor/exportador)
comissao (valor de comissão)
referencia_pedido (referência do processo/pedido)
observacoes (observações relevantes)
categoria (categoria da operação)
nf_emitida (se nota fiscal foi emitida - true/false)
numero_nf (número da nota fiscal)
data_emissao_nf (data de emissão da NF)
chave_nf (chave de acesso da NF)
created_by (criado por)
updated_by (atualizado por)

Exemplo de saída:
json{
  "invoice_number": "VIM240041",
  "tipo_documento": "Extrato fechamento financeiro",
  "data_documento": "05/12/2024",
  "cliente_cnpj": "52.889.100/0001-14",
  "cliente_nome": "NXT INDUSTRIA E COMERCIO LTDA",
  "cambio_brl": "6.0535",
  "valor_reais": "455307.55",
  "banco": "BANCO DO BRASIL",
  "conta_destino": "95001-7",
  "forma_pagamento": null,
  "parcelas": null,
  "impostos": "278122.88",
  "taxas": "416.46",
  "desconto": null,
  "valor_liquido": "455307.55",
  "vendedor": "WUXI MUODOU INTELLIGENT TECHNOLOGY CO. LTD",
  "comissao": null,
  "referencia_pedido": "IMP-228725",
  "observacoes": "DADOS BANCÁRIOS",
  "categoria": "IMPORTAÇÃO",
  "nf_emitida": false,
  "numero_nf": null,
  "data_emissao_nf": null,
  "chave_nf": null,
  "created_by": null,
  "updated_by": null
}
IMPORTANTE: Retorne APENAS o JSON, sem explicações ou texto adicional e sem sequer a indicação de que seja um json. Use "null" para campos não encontrados.`,

  step2_general_data: `Extraia os dados gerais desta Nota Fiscal Eletrônica e retorne em formato JSON estruturado. Mantenha os valores exatos como aparecem no documento.

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
  "di_number": "25/0497271-6"
}

Localize a invoice_number como numero da Fatura, nas informacoes complementares. Se não houver invoice_number no documento, use {{472.di_pertence_a_invoice}}

Retorne APENAS o JSON, sem explicações ou texto adicional e sem sequer a indicação de que seja um json.`,

  step3_items: `Extraia APENAS os dados dos produtos/itens desta Nota Fiscal Eletrônica e retorne em formato JSON estruturado. Mantenha os valores exatos como aparecem no documento.

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

Retorne APENAS o array JSON dos produtos, sem explicações ou texto adicional e sem sequer a indicação de que seja um json.`
};

export const numerarioSteps: PromptStep[] = [
  {
    step: 1,
    name: "Extração do Número da DI",
    description: "Extraindo número da DI das informações complementares",
    prompt: numerarioPrompts.step1_di_number,
    expectsInput: false
  }
];

export function getTotalSteps(): number {
  return numerarioSteps.length;
}

export function getStepInfo(stepNumber: number): PromptStep | undefined {
  return numerarioSteps.find(step => step.step === stepNumber);
}

export function getPromptForStep(stepNumber: number, previousResult?: string): string {
  const step = getStepInfo(stepNumber);
  if (!step) {
    throw new Error(`Invalid step number: ${stepNumber}`);
  }
  
  let prompt = step.prompt;
  
  // Add previous result context if needed
  if (step.expectsInput && previousResult) {
    prompt += `\n\nInformação do passo anterior para contexto:\n${previousResult}`;
  }
  
  return prompt;
}