import { PromptStep } from '../base/types';

export interface PackingListPrompts {
  prompt1_general_data: string;
  prompt2_containers_mapping: string;
  prompt3_disposition_explanation: string;
  prompt4_final_distribution: string;
}

export const packingListPrompts: PackingListPrompts = {
  prompt1_general_data: `You are a packing list general data extractor.

Receive the jason of a packing list. Read everything, specially ALL ITEMS.

Extract the following fields:

- invoice: value after "INVOICE NO." or "INVOICE:"
- consignee: full block after "CONSIGNEE:" until Notify or a blank line
- notify_party: full block after "NOTIFY PARTY:" until next section
- date: document date — convert it to Brazilian format DD/MM/YYYY
- load_port: value after "LOAD PORT:" (city)
- destination: value after "DESTINATION:" (city)
- contracted_company: name at the top of the document (usually the exporter)
- contracted_email: email in the header
- package_total: sum of all packages across containers (e.g., 670 + 670 + 672)
- items_qty_total: total number of items listed (should be EXACTLY same as quantity of items in line items)
- total_gw: total gross weight in KG (from last TOTAL G.W. or sum of container weights)

CONSIDERE TODOS OS ITENS! ATÉ OS QUE NAO TEM NUMERO DE REFERENCIA OU ALGUM OUTRO ITEM FALTANTE. Crie números para os items que nao tenham.

⚠️ IMPORTANT:
- Return only one object in JSON.
- Do not include code fences or any explanation.

IMPORTANTE: Entregue um json válido e puro. A resposta deve ser apenas o json e sem sequer a informação de que é um json.`,

  prompt2_containers_mapping: `Você deve receber todo o texto OCR da Packing List e produzir apenas um conjunto de objetos JSON independentes, um por contêiner, sem nenhum texto adicional ou marcadores de código.
PASSO 1: IDENTIFICAÇÃO DE CONTÊINERES

Localizar linha de contêineres: Procure linhas no formato:
<CONTÊINER>/<BOOKING>/<TIPO>/<N>PACKAGES/<W>KGS/<V>CBM

Extrair dados: Para cada contêiner identificado:

container = código do contêiner (ex: PIDU4089745)
booking = código de booking (ex: CQ0217794)
tipo_container = tipo (ex: 40'HQ)
quantidade_de_pacotes = N (número inteiro)
peso_bruto = W (número decimal)
volume = V (número decimal)

Calcular ranges de pacotes para contêineres:

Container 1: from_package = 1, to_package = quantidade_de_pacotes
Container 2: from_package = quantidade_do_container_1 + 1, to_package = soma_total_pacotes
E assim por diante...

PASSO 2: IDENTIFICAÇÃO E PROCESSAMENTO DE ITENS

Identificar itens válidos: Leia APENAS linhas que começam com:

Número do item (1, 2, 3...)
Seguido de espaço
Seguido de texto descritivo

Extrair informações críticas:

item = número do item
name = nome em inglês do produto
qty_packages = quantidade de pacotes (coluna "QTY OF PACKAGE")

REGRAS IMPORTANTES:

Ignore linhas de totais, resumos ou spare parts
Se "QTY OF PACKAGE" estiver vazio, assuma 1 pacote
Se um item não tiver pacotes próprios (ex: componentes incluídos), assuma 0

Validação: A soma total de qty_packages de todos os itens DEVE ser igual à soma de quantidade_de_pacotes de todos os contêineres.

PASSO 3: CÁLCULO DE RANGES DE PACOTES PARA ITENS

Calcular sequencialmente:
package_counter = 0
Para cada item em ordem:
  item_from_package = package_counter + 1
  package_counter += qty_packages
  item_to_package = package_counter

Exemplo:

Item 1 (2 packages): from_package=1, to_package=2
Item 2 (1 package): from_package=3, to_package=3
Item 3 (5 packages): from_package=4, to_package=8

PASSO 4: MAPEAMENTO ITEM ⇄ CONTÊINER

Para cada contêiner, encontre todos os itens onde há interseção entre:

Range do contêiner: [container_from_package, container_to_package]
Range do item: [item_from_package, item_to_package]

Determinar from_item e to_item:

from_item = menor número de item que intersecta o contêiner
to_item = maior número de item que intersecta o contêiner

Use absolutamente todos os itens que foram obtidos aqui, com a mesma sequencia, sem excluir ou criar item algum.

PASSO 5: VALIDAÇÃO FINAL

Verificar consistência:

Soma de quantidade_de_pacotes = Total de pacotes dos itens
Não há gaps ou sobreposições nos ranges
Todos os itens estão mapeados em algum contêiner

Extrair invoice: Procure por "INVOICE NO." no cabeçalho do documento

FORMATO DE SAÍDA
Para cada contêiner, gere um objeto JSON com EXATAMENTE estes campos nesta ordem:
    {
  "invoice": "string",
  "container": "string", 
  "booking": "string",
  "tipo_container": "string",
  "quantidade_de_pacotes": integer,
  "peso_bruto": float,
  "volume": float,
  "from_package": integer,
  "to_package": integer,
  "from_item": integer ou string,
  "to_item": integer ou string
}
EXEMPLO DE SAÍDA
    [
  {
    "invoice": "VIM240056",
    "container": "PIDU4089745",
    "booking": "CQ0217794", 
    "tipo_container": "40'HQ",
    "quantidade_de_pacotes": 755,
    "peso_bruto": 11685.0,
    "volume": 68.0,
    "from_package": 1,
    "to_package": 755,
    "from_item": 1,
    "to_item": 79
  },
  {
    "invoice": "VIM240056",
    "container": "GAOU7566705",
    "booking": "CR0021068",
    "tipo_container": "40'HQ", 
    "quantidade_de_pacotes": 750,
    "peso_bruto": 11627.0,
    "volume": 68.0,
    "from_package": 756,
    "to_package": 1505,
    "from_item": 79,
    "to_item": 86
  }
]
REGRAS CRÍTICAS

CONSIDERE TODOS OS ITENS! ATÉ OS QUE NAO TEM NUMERO DE REFERENCIA OU ALGUM OUTRO ITEM FALTANTE. 

CRIE NUMEROS PARA OS ITENS QUE NAO TEM NUMERO DE REFERENCIA.

Os numeros de itens nao podem ser repetidos e devem ser sequenciais.
NUNCA use aleatoriedade - os cálculos devem ser determinísticos
SEMPRE valide que os totais batem antes de gerar a saída
NÃO inclua texto explicativo, apenas o JSON puro
USE brackets [] se houver múltiplos contêineres
CALCULE matematicamente a disposição baseada na ordem sequencial dos itens

Entregue apenas o Json sem comentários!`,

  prompt3_disposition_explanation: `Crie uma explicacao da disposicao de itens em seus containers obtida em modulo anterior, explicando os numeros dos containers, pacote inicial e final pra cada container, e item inicial e final pra cada container. Entregue objetivamente e sem comentarios pq sera lido em outro modulo como variavel.`,

  prompt4_final_distribution: `Objetivo
Apenas distribua os itens de acordo com a instrucao obtida anteriormente.

REGRA SIMPLES PARA REFERENCE:
Quando encontrar itens com reference vazia ("" ou null), procure nos itens próximos (antes ou depois) qual tem a reference preenchida e use essa mesma reference para todos os itens vazios do grupo.

EXEMPLO REAL:
Se você vê:
- Item A: reference = ""
- Item B: reference = ""  
- Item C: reference = "KB001"
- Item D: reference = ""

Resultado final:
- Item A: reference = "KB001"
- Item B: reference = "KB001"
- Item C: reference = "KB001" 
- Item D: reference = "KB001"

TODOS do mesmo grupo usam "KB001".

Formato de Saída
[
  {
    "item_number": número do item (inteiro),
    "reference": "referência do item (referencia do item)",
    "descricao_ingles": "descrição em inglês",
    "descricao_chines": "caracteres chineses apenas",
    "quantidade_de_pacotes": número de pacotes (inteiro),
    "quantidade_por_pacote": quantidade por pacote (inteiro),
    "quantidade_total": quantidade total (inteiro),
    "marcacao_do_pacote": "marcação do pacote",
    "peso_bruto_por_pacote": peso bruto por pacote (decimal),
    "peso_bruto_total": peso bruto total (decimal),
    "peso_liquido_por_pacote": peso líquido por pacote (decimal),
    "peso_liquido_total": peso líquido total (decimal),
    "comprimento_pacote": comprimento em mm (inteiro),
    "largura_pacote": largura em mm (inteiro),
    "altura_pacote": altura em mm (inteiro),
    "container": número do container
  }
]

Entregue um json válido e puro. A resposta deve ser apenas o json e sem sequer a informação de que é um json.`
};

export const packingListSteps: PromptStep[] = [
  {
    step: 1,
    name: "Extração de Dados Gerais",
    description: "Extraindo informações básicas do cabeçalho (invoice, consignee, datas, etc.)",
    prompt: packingListPrompts.prompt1_general_data,
    expectsInput: false
  },
  {
    step: 2,
    name: "Identificação de Contêineres",
    description: "Identificando contêineres e mapeando itens para cada contêiner",
    prompt: packingListPrompts.prompt2_containers_mapping,
    expectsInput: false
  },
  {
    step: 3,
    name: "Explicação da Disposição",
    description: "Criando explicação da distribuição de itens nos contêineres",
    prompt: packingListPrompts.prompt3_disposition_explanation,
    expectsInput: true // Espera resultado do prompt 2
  },
  {
    step: 4,
    name: "Distribuição Final",
    description: "Distribuindo itens finais com todos os detalhes por contêiner",
    prompt: packingListPrompts.prompt4_final_distribution,
    expectsInput: true // Espera resultado do prompt 3
  }
];

export const getTotalSteps = (): number => packingListSteps.length;

export const getStepInfo = (step: number): PromptStep | null => {
  return packingListSteps.find(s => s.step === step) || null;
};

export const getPromptForStep = (step: number, previousResult?: string): string => {
  const stepInfo = getStepInfo(step);
  if (!stepInfo) {
    throw new Error(`Invalid step: ${step}`);
  }

  let prompt = stepInfo.prompt;
  
  // Se o prompt espera input do anterior e temos o resultado, adicione-o
  if (stepInfo.expectsInput && previousResult) {
    prompt += `\n\nInformação do módulo anterior: ${previousResult}`;
  }

  return prompt;
};

/**
 * Get single-step prompt for packing list processing
 * This is the legacy single-prompt approach
 */
export const getSingleStepPrompt = (): string => {
  const basePrompt = `
Você é um especialista em análise de documentos de importação e comércio exterior brasileiro.
Analise o PDF fornecido e extraia TODAS as informações relevantes de forma estruturada.

IMPORTANTE:
1. Extraia TODO o texto do documento primeiro
2. Identifique e extraia campos específicos baseados no tipo de documento
3. Mantenha a formatação original de números, datas e valores monetários
4. Se um campo não for encontrado, retorne null para esse campo
5. Retorne a resposta APENAS em formato JSON válido, sem adição de texto ou formatação para markdown.

Formato de resposta esperado:
{
  "fullText": "texto completo do documento aqui...",
  "extractedData": {
    // campos específicos do documento
  }
}
`;

  const packingListSpecific = `

Tipo de Documento: PACKING LIST

Você é um extrator de dados de packing lists. Receba o documento e execute um processo em 6 passos para produzir um objeto JSON final com três campos: "header", "containers" e "items_por_container".
PASSO 1: IDENTIFICAÇÃO DE CONTÊINERES
Localizar linha de contêineres: Procure linhas no formato:
<CONTÊINER>/<BOOKING>/<TIPO>/<N>PACKAGES/<W>KGS/<V>CBM
Extrair dados: Para cada contêiner identificado:

container = código do contêiner
booking = código de booking
tipo_container = tipo (ex: 40HQ)
quantidade_de_pacotes = N (número inteiro)
peso_bruto = W (número decimal)
volume = V (número decimal)

Calcular ranges de pacotes para contêineres:

Container 1: from_package = 1, to_package = quantidade_de_pacotes
Container 2: from_package = quantidade_do_container_1 + 1, to_package = soma_total_pacotes
E assim por diante...

PASSO 2: IDENTIFICAÇÃO E PROCESSAMENTO DE ITENS
Identificar itens válidos: Leia APENAS linhas que começam com:

Número do item (1, 2, 3...)
Seguido de espaço
Seguido de texto descritivo

Extrair informações críticas:

numero_item = número do item
descricao = nome em inglês do produto (prefira descrições específicas vs genéricas)
qnts_de_caixas = quantidade de pacotes (coluna "QTY OF PACKAGE")
qnts_por_caixa = quantidade por pacote
pesos conforme disponível

REGRAS IMPORTANTES:

Ignore linhas de totais, resumos ou spare parts
Se "QTY OF PACKAGE" estiver vazio, assuma 0 pacote
É comum múltiplos itens terem valores de peso idênticos - extraia exatamente como mostrado
Para descrições genéricas como "SCOOTER PARTS", procure especificações técnicas mais detalhadas
Use valores da linha TOTAL no final para totais gerais

Validação: A soma total de qty_packages de todos os itens DEVE ser igual à soma de quantidade_de_pacotes de todos os contêineres.

PASSO 3: CÁLCULO DE RANGES DE PACOTES PARA ITENS

Calcular sequencialmente:
package_counter = 0
Para cada item em ordem:
  item_from_package = package_counter + 1
  package_counter += qnts_de_caixas
  item_to_package = package_counter

Exemplo:

Item 1 (2 packages): from_package=1, to_package=2
Item 2 (1 package): from_package=3, to_package=3
Item 3 (5 packages): from_package=4, to_package=8


PASSO 4: MAPEAMENTO ITEM ⇄ CONTÊINER

Para cada contêiner, encontre todos os itens onde há interseção entre:

Range do contêiner: [container_from_package, container_to_package]
Range do item: [item_from_package, item_to_package]

Determinar from_item e to_item:

from_item = menor número de item que intersecta o contêiner
to_item = maior número de item que intersecta o contêiner

Use absolutamente todos os itens que foram obtidos aqui, com a mesma sequencia, sem excluir ou criar item algum.




PASSO 5: VALIDAÇÃO FINAL

Verificar consistência:

Soma de quantidade_de_pacotes = Total de pacotes dos itens
Não há gaps ou sobreposições nos ranges
Todos os itens estão mapeados em algum contêiner



PASSO 6: DISTRIBUIÇÃO DE ITENS ENTRE CONTÊINERES

REGRA CRÍTICA: Se um item tem pacotes que se espalham por múltiplos contêineres, deve ser dividido proporcionalmente:
Para cada item que intersecta múltiplos contêineres:

Calcule quantos pacotes do item cabem em cada contêiner
Distribua proporcionalmente: qnts_de_caixas, peso_bruto, peso_liquido
Crie uma entrada separada do item para cada contêiner
Mantenha qnts_por_caixa igual em todas as entradas
Ajuste peso_unit_bruto e peso_unit_liquido conforme a distribuição

Exemplo: Item com 516 pacotes em 4 contêineres de 129 pacotes cada:

Container 1: 129 pacotes do item
Container 2: 129 pacotes do item
Container 3: 129 pacotes do item
Container 4: 129 pacotes do item

PASSO 7: GERAÇÃO DO JSON FINAL


CAMPOS OBRIGATÓRIOS:
HEADER:

invoice, total_containers, quantidade_de_pacotes, peso_bruto, volume, total_itens

CONTAINERS:

container, booking, tipo_container, quantidade_de_pacotes, peso_bruto, volume, from_package, to_package, from_item, to_item

ITEMS_POR_CONTAINER:

numero_item, descricao, qnts_por_caixa, qnts_de_caixas (ajustada por container), peso_bruto (ajustado por container), peso_liquido (ajustado por container), peso_unit_bruto, peso_unit_liquido, id_container (Código do container)

FORMATO DE SAÍDA:
json{
  "header": {
    "invoice": "string",
    "total_containers": number,
    "quantidade_de_pacotes": number,
    "peso_bruto": number,
    "volume": number,
    "total_itens": number
  },
  "containers": [
    {
      "container": "string",
      "booking": "string", 
      "tipo_container": "string",
      "quantidade_de_pacotes": number,
      "peso_bruto": number,
      "volume": number,
      "from_package": number,
      "to_package": number,
      "from_item": number,
      "to_item": number
    }
  ],
  "items_por_container": [
    {
      "numero_item": number,
      "descricao": "string",
      "qnts_por_caixa": number,
      "qnts_de_caixas": number,
      "peso_bruto": number,
      "peso_liquido": number,
      "peso_unit_bruto": number,
      "peso_unit_liquido": number,
      "id_container": number
    }
  ]
}
REGRAS CRÍTICAS:

SEMPRE distribua itens proporcionalmente entre contêineres quando necessário
CONSIDERE TODOS OS ITENS, crie números sequenciais se necessário
NUNCA use aleatoriedade - cálculos determinísticos
SEMPRE valide que os totais batem após distribuição
Calcule matematicamente a disposição baseada na ordem sequencial dos itens
Se um item se espalha por N contêineres, crie N entradas separadas
Responda APENAS com o JSON válido, sem explicações



`;

  return basePrompt + packingListSpecific;
};