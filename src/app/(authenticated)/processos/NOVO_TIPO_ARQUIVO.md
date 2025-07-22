# Guia Completo: Adicionando Novo Tipo de Arquivo ao Sistema de Importação

Este guia detalha TODOS os passos necessários para adicionar um novo tipo de arquivo ao sistema, com base nos aprendizados da implementação de BL e Contrato de Câmbio.

## 📋 Visão Geral do Processo

Para adicionar um novo tipo de documento, você precisará:
1. Criar a estrutura de arquivos do módulo
2. Definir tipos TypeScript
3. Criar prompts para extração via Claude
4. Implementar processador e validador
5. Registrar o documento no sistema
6. Configurar mapeamentos de banco de dados
7. Criar componente de visualização
8. Implementar métodos de salvamento
9. Integrar com fluxo de documentos desconhecidos
10. Testar todo o fluxo

## 🚀 Passo a Passo Detalhado

### Passo 1: Criar Estrutura de Arquivos

Crie a seguinte estrutura em `src/services/documents/[nome-documento]/`:

```
src/services/documents/[nome-documento]/
├── types.ts              # Interfaces TypeScript
├── prompts.ts            # Prompts para Claude
├── [NomeDocumento]Processor.ts    # Lógica de processamento
└── [NomeDocumento]Validator.ts    # Regras de validação
```

### Passo 2: Definir Tipos (types.ts)

```typescript
// Exemplo para um novo documento "Certificado de Origem"
export interface CertificadoOrigemHeader {
  numero_certificado: string;
  data_emissao: string;
  exportador: string;
  importador: string;
  pais_origem: string;
  pais_destino: string;
  invoice_number: string; // IMPORTANTE: Campo para vincular ao processo
  valor_total: string;
}

export interface CertificadoOrigemItem {
  descricao: string;
  ncm: string;
  quantidade: string;
  unidade: string;
  valor_unitario: string;
  valor_total: string;
}

export interface CertificadoOrigemProcessingResult {
  header: CertificadoOrigemHeader;
  items?: CertificadoOrigemItem[];
}
```

### Passo 3: Criar Prompts (prompts.ts)

Para documentos simples (1 etapa):
```typescript
export const certificadoOrigemPrompt = `
Extraia as seguintes informações do Certificado de Origem:

DADOS DO CERTIFICADO:
- Número do certificado
- Data de emissão
- Nome do exportador
- Nome do importador
- País de origem
- País de destino
- Número da invoice/fatura
- Valor total

ITENS (se houver):
- Descrição do produto
- Código NCM
- Quantidade
- Unidade
- Valor unitário
- Valor total

Retorne no formato JSON:
{
  "numero_certificado": "valor",
  "data_emissao": "valor",
  "exportador": "valor",
  "importador": "valor",
  "pais_origem": "valor",
  "pais_destino": "valor",
  "invoice_number": "valor",
  "valor_total": "valor",
  "items": [
    {
      "descricao": "valor",
      "ncm": "valor",
      "quantidade": "valor",
      "unidade": "valor",
      "valor_unitario": "valor",
      "valor_total": "valor"
    }
  ]
}
`;
```

Para documentos complexos (multi-etapas):
```typescript
import { PromptStep } from '@/services/ocr/multiPromptTypes';

export const certificadoOrigemSteps: PromptStep[] = [
  {
    step: 1,
    name: "Header",
    prompt: `Extraia os dados do cabeçalho do Certificado de Origem...`,
    expectsInput: false
  },
  {
    step: 2,
    name: "Items",
    prompt: `Com base nos dados do cabeçalho, extraia os itens...`,
    expectsInput: true
  }
];
```

### Passo 4: Implementar Processador

```typescript
import { BaseDocumentProcessor } from '../base/DocumentProcessor';
import { DocumentType, ProcessingResult } from '../base/types';
import { certificadoOrigemPrompt } from './prompts';
import { CertificadoOrigemProcessingResult } from './types';

export class CertificadoOrigemProcessor extends BaseDocumentProcessor<CertificadoOrigemProcessingResult> {
  protected documentType = DocumentType.CERTIFICADO_ORIGEM;
  
  protected async extractData(text: string): Promise<ProcessingResult<CertificadoOrigemProcessingResult>> {
    try {
      // Para documento simples
      const result = await this.callClaude(text, certificadoOrigemPrompt);
      return {
        success: true,
        data: this.parseJSON(result),
        documentType: this.documentType
      };
      
      // Para documento multi-etapas, use:
      // return this.processMultiStep(text, certificadoOrigemSteps);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
```

### Passo 5: Implementar Validador

```typescript
import { DocumentValidator } from '../base/DocumentValidator';
import { ValidationResult, ValidationError } from '../base/types';
import { CertificadoOrigemProcessingResult } from './types';

export class CertificadoOrigemValidator extends DocumentValidator {
  validate(data: CertificadoOrigemProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Validações obrigatórias
    if (!data.header?.numero_certificado) {
      errors.push({
        field: 'numero_certificado',
        message: 'Número do certificado é obrigatório',
        severity: 'error'
      });
    }
    
    if (!data.header?.invoice_number) {
      errors.push({
        field: 'invoice_number',
        message: 'Número da invoice é obrigatório para vincular ao processo',
        severity: 'error'
      });
    }
    
    // Validações de formato
    if (data.header?.data_emissao && !this.isValidDate(data.header.data_emissao)) {
      errors.push({
        field: 'data_emissao',
        message: 'Data de emissão inválida',
        severity: 'error'
      });
    }
    
    // Validações opcionais (warnings)
    if (!data.items || data.items.length === 0) {
      warnings.push({
        field: 'items',
        message: 'Nenhum item encontrado no certificado',
        severity: 'warning'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private isValidDate(date: string): boolean {
    // Implementar validação de data
    return /^\d{2}\/\d{2}\/\d{4}$/.test(date);
  }
}
```

### Passo 6: Registrar no Sistema

#### 6.1 Adicionar ao enum DocumentType
Em `src/services/documents/base/types.ts`:
```typescript
export enum DocumentType {
  // ... tipos existentes
  CERTIFICADO_ORIGEM = 'certificado_origem'
}
```

#### 6.2 Registrar processador
Em `src/services/documents/index.ts`:
```typescript
import { CertificadoOrigemProcessor } from './certificado-origem/CertificadoOrigemProcessor';

// Na função registerProcessors
factory.registerProcessor(new CertificadoOrigemProcessor());
```

#### 6.3 Adicionar mapeamento de tipo desconhecido
Em `src/services/documents/unknown/prompts.ts`:
```typescript
const documentTypeMapping: Record<string, DocumentType> = {
  // ... mapeamentos existentes
  'certificado de origem': DocumentType.CERTIFICADO_ORIGEM,
  'certificate of origin': DocumentType.CERTIFICADO_ORIGEM,
};
```

### Passo 7: Configurar Banco de Dados

#### 7.1 Adicionar tabela no NocoDB
Em `src/config/nocodb-tables.ts`:
```typescript
export const NOCODB_TABLES = {
  // ... tabelas existentes
  CERTIFICADO_ORIGEM: "m[table_id_aqui]", // Substituir pelo ID real da tabela
};
```

#### 7.2 Adicionar mapeamento de campos
Em `src/config/nocodb-tables.ts`:
```typescript
export const TABLE_FIELD_MAPPINGS = {
  // ... mapeamentos existentes
  CERTIFICADO_ORIGEM: {
    // Mapeamento: campo_ingles (OCR) -> campo_portugues (Banco)
    numero_certificado: "numero_certificado",
    data_emissao: "data_emissao",
    exportador: "exportador",
    importador: "importador",
    pais_origem: "pais_origem",
    pais_destino: "pais_destino",
    invoice_number: "invoiceNumber", // IMPORTANTE: Campo padrão para vincular processo
    valor_total: "valor_total"
  }
};
```

### Passo 8: Implementar Salvamento

Em `src/services/documents/DocumentSaveService.ts`:

```typescript
/**
 * Save Certificado de Origem document
 */
async saveCertificadoOrigem(
  data: CertificadoOrigemProcessingResult, 
  options: SaveOptions = {}
): Promise<SaveResult> {
  try {
    const { userId = 'system' } = options;
    const timestamp = new Date().toISOString();

    console.log('saveCertificadoOrigem - Raw data:', JSON.stringify(data, null, 2));

    // Extrair dados - IMPORTANTE: Suportar múltiplas estruturas
    let extractedData;
    
    if (data.header?.data) {
      // Estrutura multi-step com header.data
      console.log('saveCertificadoOrigem - Using header.data format');
      extractedData = data.header.data;
    } else if (data.steps && data.steps.length > 0 && data.steps[0].result) {
      // Formato com steps
      console.log('saveCertificadoOrigem - Using steps format');
      extractedData = typeof data.steps[0].result === 'string' 
        ? JSON.parse(data.steps[0].result) 
        : data.steps[0].result;
    } else if (data.data) {
      // Dados wrapped em 'data'
      console.log('saveCertificadoOrigem - Using wrapped data format');
      extractedData = data.data;
    } else {
      // Formato direto
      console.log('saveCertificadoOrigem - Using direct format');
      extractedData = data;
    }

    // Preparar dados para salvar
    const certificadoData = {
      numero_certificado: extractedData.numero_certificado,
      data_emissao: extractedData.data_emissao,
      exportador: extractedData.exportador,
      importador: extractedData.importador,
      pais_origem: extractedData.pais_origem,
      pais_destino: extractedData.pais_destino,
      invoiceNumber: extractedData.invoice_number, // Campo para vincular processo
      valor_total: extractedData.valor_total,
      items: JSON.stringify(extractedData.items || []),
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userId,
    };

    // Transformar para formato NocoDB
    const transformedData = transformToNocoDBFormat(
      certificadoData,
      TABLE_FIELD_MAPPINGS.CERTIFICADO_ORIGEM
    );
    
    // IMPORTANTE: Adicionar hash do arquivo
    if (options.fileHash) {
      transformedData.hash_arquivo_origem = options.fileHash;
    }

    console.log('saveCertificadoOrigem - Saving to NocoDB:', transformedData);

    // Salvar no banco
    const savedCertificado = await this.nocodb.create(
      NOCODB_TABLES.CERTIFICADO_ORIGEM,
      transformedData
    );

    return {
      success: true,
      documentId: savedCertificado.Id,
      details: { saved: savedCertificado }
    };
  } catch (error) {
    return this.handleSaveError(error);
  }
}

// Adicionar ao método genérico save()
case 'certificado_origem':
  return this.saveCertificadoOrigem(data as CertificadoOrigemProcessingResult, options);
```

### Passo 9: Criar Componente de Visualização

Em `src/components/ocr/results/viewers/CertificadoOrigemViewer.tsx`:

```typescript
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BaseViewerProps, useViewerState } from '../components/BaseViewer';
import { FieldSection } from '../components/FieldSection';
import { FileText, Calendar, Globe, DollarSign, Building, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CertificadoOrigemViewer(props: BaseViewerProps) {
  const {
    variant = 'detailed',
    readonly = false,
    className
  } = props;
  
  const {
    isEditing,
    editedData,
    handleEdit,
    handleSave,
    handleCancel,
    setEditedData
  } = useViewerState(props.data || {}, props);
  
  // Extrair dados - IMPORTANTE: Suportar múltiplas estruturas
  const extractData = (data: any): any => {
    if (data?.header?.data) {
      return data.header.data;
    }
    if (data?.structuredResult?.header?.data) {
      return data.structuredResult.header.data;
    }
    if (data?.data) {
      return data.data;
    }
    return data || {};
  };
  
  const certificadoData = extractData(editedData);
  
  // Definir campos do cabeçalho
  const headerFields = [
    {
      key: 'numero_certificado',
      label: 'Número do Certificado',
      type: 'text',
      icon: <Hash className="h-5 w-5" />
    },
    {
      key: 'data_emissao',
      label: 'Data de Emissão',
      type: 'date',
      icon: <Calendar className="h-5 w-5" />
    },
    {
      key: 'exportador',
      label: 'Exportador',
      type: 'text',
      icon: <Building className="h-5 w-5" />
    },
    {
      key: 'importador',
      label: 'Importador',
      type: 'text',
      icon: <Building className="h-5 w-5" />
    },
    {
      key: 'pais_origem',
      label: 'País de Origem',
      type: 'text',
      icon: <Globe className="h-5 w-5" />
    },
    {
      key: 'pais_destino',
      label: 'País de Destino',
      type: 'text',
      icon: <Globe className="h-5 w-5" />
    },
    {
      key: 'invoice_number',
      label: 'Número da Invoice',
      type: 'text',
      icon: <FileText className="h-5 w-5" />
    },
    {
      key: 'valor_total',
      label: 'Valor Total',
      type: 'text',
      icon: <DollarSign className="h-5 w-5" />
    }
  ];
  
  // Modo resumido
  if (variant === 'summary') {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Certificado:</span>
              <span className="font-medium">{certificadoData.numero_certificado || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Invoice:</span>
              <span className="font-medium">{certificadoData.invoice_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor:</span>
              <span className="font-medium">{certificadoData.valor_total || 'N/A'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Modo detalhado
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Certificado de Origem</CardTitle>
          {!readonly && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave}>Salvar</Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={handleEdit}>
                  Editar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <FieldSection
          title="Informações do Certificado"
          fields={headerFields}
          data={certificadoData}
          isEditing={isEditing}
          onChange={(field, value) => {
            // Atualizar estrutura correta
            if (editedData.header?.data) {
              setEditedData(prev => ({
                ...prev,
                header: {
                  ...prev.header,
                  data: {
                    ...prev.header.data,
                    [field]: value
                  }
                }
              }));
            } else {
              setEditedData(prev => ({
                ...prev,
                [field]: value
              }));
            }
          }}
        />
        
        {/* Adicionar seção de itens se necessário */}
        {certificadoData.items && certificadoData.items.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Itens</h3>
            {/* Implementar tabela de itens */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Passo 10: Integrar com APIs

#### 10.1 Adicionar validação em process/route.ts
```typescript
case DocumentType.CERTIFICADO_ORIGEM:
  // Validar estrutura específica
  const hasData = data.header?.data || data.numero_certificado || 
                  (data.steps && data.steps.length > 0);
  if (!hasData) errors.push('Missing certificate data');
  break;
```

#### 10.2 Adicionar extração de campos-chave
```typescript
case DocumentType.CERTIFICADO_ORIGEM:
  // Extrair dados de múltiplas estruturas possíveis
  let certData;
  if (data.header?.data) {
    certData = data.header.data;
  } else if (data.steps && data.steps.length > 0 && data.steps[0].result) {
    certData = typeof data.steps[0].result === 'string' 
      ? JSON.parse(data.steps[0].result) 
      : data.steps[0].result;
  } else {
    certData = data;
  }
  
  return {
    numeroCertificado: certData.numero_certificado,
    invoiceNumber: certData.invoice_number,
    dataEmissao: certData.data_emissao,
    valorTotal: certData.valor_total
  };
```

#### 10.3 Adicionar caso em save/route.ts
```typescript
case DocumentType.CERTIFICADO_ORIGEM:
  saveResult = await saveService.saveCertificadoOrigem(dataToSave, {
    userId: auth.user.id,
    fileHash: metadata?.fileHash
  });
  break;
```

#### 10.4 Atualizar getTableName
```typescript
[DocumentType.CERTIFICADO_ORIGEM]: 'CertificadoOrigem',
```

### Passo 11: Integrar Visualização

#### 11.1 Exportar viewer
Em `src/components/ocr/results/viewers/index.ts`:
```typescript
export { CertificadoOrigemViewer } from './CertificadoOrigemViewer';
```

#### 11.2 Adicionar caso no OCRResultsViewer
Em `src/components/ocr/OCRResultsViewer.tsx`:
```typescript
case 'certificado_origem':
  return <CertificadoOrigemViewer {...commonProps} />;
```

#### 11.3 Adicionar label do documento
Em `src/components/processo_import/UnknownDocumentModal.tsx`:
```typescript
const documentTypeLabels: Record<string, string> = {
  // ... labels existentes
  'certificado_origem': 'Certificado de Origem',
};
```

### Passo 12: Considerações Especiais

#### 12.1 Documentos sem Invoice
Se o documento não tem invoice (como BL e Contrato de Câmbio):
1. Ajustar o fluxo em `UnknownDocumentModal` para buscar todos os processos
2. Desabilitar criação de novo processo
3. Forçar seleção manual

#### 12.2 Documentos Multi-tabela
Se o documento tem múltiplas tabelas (como BL com headers e containers):
```typescript
export const NOCODB_TABLES = {
  CERTIFICADO_ORIGEM: {
    HEADERS: "m[table_id_headers]",
    ITEMS: "m[table_id_items]"
  }
};
```

#### 12.3 Validações Complexas
Para validações que dependem de outros dados:
```typescript
// No validador
if (data.header?.pais_origem === 'BRASIL' && !data.header?.ncm) {
  errors.push({
    field: 'ncm',
    message: 'NCM é obrigatório para produtos brasileiros',
    severity: 'error'
  });
}
```

## 🧪 Checklist de Testes

- [ ] Upload do arquivo funciona
- [ ] Identificação automática reconhece o tipo
- [ ] OCR extrai todos os campos corretamente
- [ ] Validação captura erros e warnings
- [ ] Salvamento grava todos os campos no banco
- [ ] Hash do arquivo é salvo corretamente
- [ ] Viewer exibe todos os campos
- [ ] Edição e atualização funcionam
- [ ] Vinculação com processo funciona
- [ ] Fluxo completo não apresenta erros

## 🐛 Problemas Comuns e Soluções

### Problema: Dados salvando apenas hash_arquivo_origem
**Solução**: Verificar extração de dados no save method. Adicionar suporte para múltiplas estruturas (header.data, steps, etc).

### Problema: Campos aparecem como undefined
**Solução**: Verificar mapeamento de campos e estrutura de dados. Adicionar logs para debug.

### Problema: Validação falha mesmo com dados corretos
**Solução**: Verificar se validação está procurando dados na estrutura correta (header.data vs data direto).

### Problema: Viewer mostra "N/A" em todos os campos
**Solução**: Implementar função extractData no viewer para suportar múltiplas estruturas.

## 📚 Recursos Úteis

- Base classes: `src/services/documents/base/`
- Exemplos simples: Swift (`src/services/documents/swift/`)
- Exemplos complexos: BL (`src/services/documents/bl/`)
- Mapeamentos: `src/config/nocodb-tables.ts`
- Componentes UI: `src/components/ocr/results/components/`

---

**IMPORTANTE**: Sempre teste o fluxo completo antes de considerar o documento implementado!