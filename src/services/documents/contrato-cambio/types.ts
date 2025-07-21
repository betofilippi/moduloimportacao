export interface ContratoCambioData {
  contrato: string;
  data: string;
  corretora: string;
  moeda: string;
  valor_estrangeiro: string;
  taxa_cambial: string;
  valor_nacional: string;
  fatura: string;
  recebedor: string;
  pais: string;
  endereco: string;
  conta_bancaria: string;
  swift: string;
  banco_beneficiario: string;
}

export interface ContratoCambioProcessingResult {
  data: ContratoCambioData;
}