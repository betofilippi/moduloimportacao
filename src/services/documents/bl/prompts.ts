import { PromptStep } from '../base/types';

export const blSteps: PromptStep[] = [
  {
    step: 1,
    name: "Header",
    prompt: `Você recebeu uma Bill of Lading (BL).  
Extraia com precisão absoluta os seguintes dados:

1. bl_number (número da BL)
2. issue_date (data de emissão da BL)
3. onboard_date (data de embarque no navio)
4. shipper (exportador)
5. consignee (importador)
6. notify_party (parte notificante)
7. cnpj_consignee (CNPJ do importador)
8. place_of_receipt (local de recebimento)
9. port_of_loading (porto de carregamento)
10. port_of_discharge (porto de descarga)
11. place_of_delivery (local de entrega final)
12. freight_term (condição de frete, ex: FREIGHT PREPAID)
13. cargo_description (descrição resumida da carga)
14. ncm_codes (códigos NCM dos produtos)
15. package_type (tipo de embalagem, ex: WOODEN PACKAGE)
16. total_packages (quantidade total de pacotes na BL)
17. total_weight_kg (peso bruto total em kg)
18. total_volume_cbm (volume total em CBM)
19. freight_value_usd (valor total do frete em dólares)
20. freight_value_brl (valor total do frete em reais)
21. freight_agent (agente de frete responsável)
22. vessel_name (nome do navio)
23. voy_number (numero da viagem)

Retorne os dados no formato JSON válido conforme o exemplo:

{
  "bl_number": "...",
  "issue_date": "...",
  "onboard_date": "...",
  "shipper": "...",
  "consignee": "...",
  "notify_party": "...",
  "cnpj_consignee": "...",
  "place_of_receipt": "...",
  "port_of_loading": "...",
  "port_of_discharge": "...",
  "place_of_delivery": "...",
  "freight_term": "...",
  "cargo_description": "...",
  "ncm_codes": "...",
  "package_type": "...",
  "total_packages": "...",
  "total_weight_kg": "...",
  "total_volume_cbm": "...",
  "freight_value_usd": "...",
  "freight_value_brl": "...",
  "freight_agent": "...",
  "vessel_name": "...",
  "voy_number": "..."
}

LEMBRE-SE, ESFORÇO MÁXIMO PARA OBTER TODOS OS DADOS!

Entregue um json válido e puro. A resposta deve ser apenas o json e sem sequer a informação de que é um json.`,
    expectsInput: false
  },
  {
    step: 2,
    name: "Containers",
    prompt: `Você recebeu uma Bill of Lading (BL) que contém informações sobre containers.  
Extraia rigorosamente e sem omitir nenhum campo, os seguintes dados para cada container presente na BL:

1. container_number (número completo do container)
2. container_size (tamanho do container, ex: 40'HQ, 20'GP)
3. seal_number (número do lacre do container)
4. booking_number (número da reserva associada ao container)
5. total_packages (quantidade total de pacotes nesse container específico)
6. gross_weight_kg (peso bruto total em kg para este container específico)
7. volume_cbm (volume total em CBM para este container específico)
8. bl_number (numero da bill of lading)

Retorne os dados no formato JSON válido conforme o exemplo:

{
  "bl_number": "..."  
  "container_number": "...",
  "container_size": "...",
  "seal_number": "...",
  "booking_number": "...",
  "total_packages": "...",
  "gross_weight_kg": "...",
  "volume_cbm": "..."
}

LEMBRE-SE: ESFORÇO MÁXIMO PARA OBTER TODOS OS DADOS CORRETAMENTE!

Entregue um json válido e puro. A resposta deve ser apenas o json e sem sequer a informação de que é um json.`,
    expectsInput: true
  }
];