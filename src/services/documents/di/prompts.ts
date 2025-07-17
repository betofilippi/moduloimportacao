// Prompts for DI (Declaração de Importação) document processing
import { PromptStep } from '../base/types';

export const diPrompts = {
  step1_general_data: `Você recebeu uma Declaração de Importação (DI). Extraia com absoluta precisão estes dados gerais da DI:
numero_DI, numero_invoice, data_registro_DI, nome_importador, cnpj_importador, nome_adquirente, cnpj_adquirente, representante_legal_nome, representante_legal_CPF, modalidade_despacho, quantidade_total_adicoes, recinto_aduaneiro, numero_BL, numero_CE_Mercante, nome_navio, lista_containers, data_chegada, peso_bruto_total_kg, peso_liquido_total_kg, quantidade_total_embalagens, taxa_dolar, frete_usd, seguro_usd, VMLE_usd, VMLD_usd, tributo_II_recolhido_total, tributo_IPI_suspenso_total, tributo_IPI_recolhido_total, tributo_PIS_recolhido_total, tributo_COFINS_recolhido_total, valor_total_impostos_recolhidos.
Saída:
{
  "numero_DI": "...",
  "numero_invoice": "...",
  "data_registro_DI": "...",
  "nome_importador": "...",
  "cnpj_importador": "...",
  "nome_adquirente": "...",
  "cnpj_adquirente": "...",
  "representante_legal_nome": "...",
  "representante_legal_CPF": "...",
  "modalidade_despacho": "...",
  "quantidade_total_adicoes": "...",
  "recinto_aduaneiro": "...",
  "numero_BL": "...",
  "numero_CE_Mercante": "...",
  "nome_navio": "...",
  "lista_containers": "...",
  "data_chegada": "...",
  "peso_bruto_total_kg": "...",
  "peso_liquido_total_kg": "...",
  "quantidade_total_embalagens": "...",
  "taxa_dolar": "...",
  "frete_usd": "...",
  "seguro_usd": "...",
  "VMLE_usd": "...",
  "VMLD_usd": "...",
  "tributo_II_recolhido_total": "...",
  "tributo_IPI_suspenso_total": "...",
  "tributo_IPI_recolhido_total": "...",
  "tributo_PIS_recolhido_total": "...",
  "tributo_COFINS_recolhido_total": "...",
  "valor_total_impostos_recolhidos": "..."
}
LEMBRE-SE: ESFORÇO MÁXIMO PARA OBTER TODOS OS DADOS CORRETAMENTE!

MUITO IMPORTANTE: Entregue um json válido e puro. A resposta deve ser apenas o json e sem sequer a informação de que é um json.`,

  step2_items: `Você recebeu um documento de Declaração de Importação (DI) contendo múltiplas adições. Sua missão é extrair TODOS os itens individualmente seguindo este critério exato:
CRITÉRIO OBRIGATÓRIO DE IDENTIFICAÇÃO: Cada linha que segue EXATAMENTE o padrão:
Qtde: [número] [UNIDADE] VUCV: [valor] DOLAR DOS EUA
[CÓDIGO] - [DESCRIÇÃO]
REGRAS CRÍTICAS:

Conte CADA linha "Qtde:" como UM item separado - mesmo que o código se repita
Nunca agrupe ou combine itens com mesmo código
Inclua TODOS os códigos encontrados na DI
Cada linha "Qtde:" = 1 objeto JSON

CAMPOS A EXTRAIR PARA CADA ITEM:

invoice_number
numero_di
numero_adicao (001, 002, 003, etc.)
ncm_completa (8 dígitos da adição)
codigo_item (extrair da linha após "Qtde:")
descricao_completa_detalhada_produto (texto após o código)
reference (idêntico ao codigo_item)
exportador_nome
pais_origem
pais_aquisicao
incoterm
quantidade_produto (número da linha Qtde:)
unidade_comercial_produto (PACOTE, PECA, PAR, KIT)
peso_liquido_adicao_kg (peso da adição inteira)
valor_unitario_produto_usd (VUCV)
valor_total_item_usd (quantidade × VUCV)

EXEMPLO DE SAÍDA:
[
  {
    "invoice_number": "VIM240041",
    "numero_di": "24/2645116-4",
    "numero_adicao": "001",
    "ncm_completa": "3926.90.90",
    "codigo_item": "KAY001",
    "descricao_completa_detalhada_produto": "PACOTE DE ABRAÇADEIRAS DE PLÁSTICO, ACONDICIONADO EM CAIXAS",
    "reference": "KAY001",
    "exportador_nome": "WUXI MUODOU INTELLIGENT TECHNOLOGY CO. LTD",
    "pais_origem": "CHINA, REPUBLICA POPULAR",
    "pais_aquisicao": "CHINA, REPUBLICA POPULAR",
    "incoterm": "FOB - FREE ON BOARD",
    "quantidade_produto": "330.00000",
    "unidade_comercial_produto": "PACOTE",
    "peso_liquido_adicao_kg": "67.95415",
    "valor_unitario_produto_usd": "0.1000000",
    "valor_total_item_usd": "33.00"
  }
]
MUITO IMPORTANTE: Entregue um JSON válido e puro. A resposta deve ser apenas o JSON, sem qualquer texto adicional, e PRINCIPALMENTE sem sequer a indicação de que seja um json.`,

  step3_taxes: `Você recebeu um documento de Declaração de Importação (DI) contendo várias adições e com vários itens em cada adição. Cada adição lista os tributos de forma geral, mas sua tarefa é organizar os tributos por item individualmente, calculando a proporção de cada tributo baseada no VUCV de cada item.
CRITÉRIO OBRIGATÓRIO DE IDENTIFICAÇÃO: Cada linha que segue EXATAMENTE o padrão:
Qtde: [número] [UNIDADE] VUCV: [valor] DOLAR DOS EUA
[CÓDIGO] - [DESCRIÇÃO]
REGRAS CRÍTICAS:

Conte CADA linha "Qtde:" como UM item separado - mesmo que o código se repita
Nunca agrupe ou combine itens com mesmo código
Cada linha "Qtde:" = 1 objeto JSON
Ambos os prompts devem gerar o mesmo número de objetos JSON

METODOLOGIA DE CÁLCULO POR ITEM:

Identificar todos os itens: Cada linha "Qtde:" + código = 1 item
Calcular o valor total de cada item: Quantidade × VUCV
Calcular a participação percentual do item na adição: (Valor do item ÷ Valor total da adição) × 100
Aplicar essa proporção aos tributos da adição: Tributo da adição × (Participação percentual do item ÷ 100)

CAMPOS A EXTRAIR POR ITEM:

invoice_number
numero_adicao
codigo_item
quantidade_item
vucv_usd
valor_total_item_usd (quantidade × VUCV)
participacao_percentual_item
regime_tributacao_ii
aliquota_ii_percentual
valor_ii_recolhido (proporcional ao item)
regime_tributacao_ipi
aliquota_ipi_percentual
valor_ipi_recolhido (proporcional ao item)
base_calculo_pis (proporcional ao item)
aliquota_pis_percentual
valor_pis_recolhido (proporcional ao item)
base_calculo_cofins (proporcional ao item)
aliquota_cofins_percentual
valor_cofins_recolhido (proporcional ao item)
valor_total_tributos (calcule: II + IPI + PIS + COFINS do item)

EXEMPLO DE SAÍDA:
[
  {
    "invoice_number": "VIM240041",
    "numero_adicao": "001",
    "codigo_item": "KAY001",
    "quantidade_item": "330.00000",
    "vucv_usd": "0.1000000",
    "valor_total_item_usd": "33.00",
    "participacao_percentual_item": "8.70",
    "regime_tributacao_ii": "RECOLHIMENTO INTEGRAL",
    "aliquota_ii_percentual": "18.00",
    "valor_ii_recolhido": "39.12",
    "regime_tributacao_ipi": "SUSPENSAO",
    "aliquota_ipi_percentual": "9.75",
    "valor_ipi_recolhido": "0.00",
    "base_calculo_pis": "217.41",
    "aliquota_pis_percentual": "2.10",
    "valor_pis_recolhido": "4.57",
    "base_calculo_cofins": "217.41",
    "aliquota_cofins_percentual": "9.65",
    "valor_cofins_recolhido": "20.98",
    "valor_total_tributos": "64.67"
  }
]
MUITO IMPORTANTE: Entregue um JSON válido e puro. A resposta deve ser apenas o JSON, sem qualquer texto adicional e, PRINCIPALMENTE, sem sequer a indicação de que seja um json.`
};

export const diSteps: PromptStep[] = [
  {
    step: 1,
    name: "Dados Gerais da DI",
    description: "Extraindo informações gerais da Declaração de Importação",
    prompt: diPrompts.step1_general_data,
    expectsInput: false
  },
  {
    step: 2,
    name: "Itens da DI",
    description: "Extraindo todos os itens individualmente com seus detalhes",
    prompt: diPrompts.step2_items,
    expectsInput: true
  },
  {
    step: 3,
    name: "Informações Tributárias",
    description: "Extraindo informações tributárias por item",
    prompt: diPrompts.step3_taxes,
    expectsInput: true
  }
];

export function getTotalSteps(): number {
  return diSteps.length;
}

export function getStepInfo(stepNumber: number): PromptStep | undefined {
  return diSteps.find(step => step.step === stepNumber);
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