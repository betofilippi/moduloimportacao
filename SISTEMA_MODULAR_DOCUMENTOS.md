# Sistema Modular de Processamento de Documentos

## Visão Geral

O sistema foi completamente reestruturado para ser modular e extensível, permitindo fácil adição de novos tipos de documentos sem afetar o código existente. Cada tipo de documento é independente e possui seus próprios processadores, validadores, prompts e componentes.

## Arquitetura

### 1. **Factory Pattern**
- **Arquivo**: `src/services/documents/DocumentProcessorFactory.ts`
- **Função**: Centraliza o registro e descoberta automática de processadores
- **Benefícios**: Auto-descoberta, registro dinâmico, extensibilidade

### 2. **Estrutura Base**
- **Pasta**: `src/services/documents/base/`
- **Conteúdo**: Interfaces, tipos e classes base compartilhadas
- **Arquivos**:
  - `types.ts` - Interfaces e enums base
  - `DocumentProcessor.ts` - Classe abstrata base
  - `DocumentValidator.ts` - Validações comuns

### 3. **Módulos por Tipo de Documento**
Cada tipo de documento tem sua própria pasta com:
- `types.ts` - Tipos específicos do documento
- `prompts.ts` - Prompts específicos (single-step ou multi-step)
- `Processor.ts` - Lógica de processamento específica
- `Validator.ts` - Validações específicas do tipo

## Tipos de Documento Implementados

### 📋 **Packing List** (`src/services/documents/packing-list/`)
- **Processamento**: Multi-step (4 etapas)
- **Formatos**: PDF, JPG, JPEG, PNG
- **Recursos**: Detecção de shared boxes, agrupamento, validação de consistência

### 🧾 **Commercial Invoice** (`src/services/documents/commercial-invoice/`)
- **Processamento**: Single-step
- **Formatos**: PDF, JPG, JPEG, PNG
- **Recursos**: Validação de valores, consistência de totais, normalização de dados

## APIs Modulares

### Rotas Dinâmicas
```
/api/documents/[type]/process     - Processar documento
/api/documents/[type]/validate    - Validar dados extraídos
/api/documents/[type]/prompts     - Obter prompts do tipo
/api/documents/types              - Listar tipos suportados
/api/documents/health             - Status do sistema
```

### Exemplos de Uso

```typescript
// Processar um packing list
const response = await fetch('/api/documents/packing_list/process', {
  method: 'POST',
  body: formData // contendo o arquivo
});

// Obter tipos suportados
const types = await fetch('/api/documents/types').then(r => r.json());

// Validar dados extraídos
const validation = await fetch('/api/documents/commercial_invoice/validate', {
  method: 'POST',
  body: JSON.stringify({ data: extractedData })
});
```

## Componentes Modulares

### 1. **DocumentUploadForm**
- **Arquivo**: `src/components/documents/DocumentUploadForm.tsx`
- **Função**: Upload genérico que funciona com qualquer tipo
- **Recursos**: Auto-detecção de tipo, validação de formato, drag & drop

### 2. **DocumentTypeSelector**
- **Arquivo**: `src/components/documents/DocumentTypeSelector.tsx`
- **Função**: Seletor inteligente de tipos de documento
- **Recursos**: Badges informativos, formatos suportados

### 3. **DocumentProcessorDemo**
- **Arquivo**: `src/components/documents/DocumentProcessorDemo.tsx`
- **Função**: Demonstração completa do sistema
- **Recursos**: Interface para testar todos os tipos

## Como Adicionar um Novo Tipo de Documento

### Passo 1: Criar a Estrutura de Arquivos
```
src/services/documents/novo-tipo/
├── types.ts              # Interfaces específicas
├── prompts.ts            # Prompts do tipo
├── NovoTipoProcessor.ts  # Lógica de processamento
└── NovoTipoValidator.ts  # Validações específicas
```

### Passo 2: Implementar as Interfaces

#### types.ts
```typescript
export interface NovoTipoItem {
  campo1?: string;
  campo2?: number;
  // ... campos específicos
}

export interface NovoTipoProcessingResult {
  header?: NovoTipoHeader;
  items?: NovoTipoItem[];
}

export interface NovoTipoValidationRules {
  requireHeader: boolean;
  validateSpecificField: boolean;
  // ... regras específicas
}
```

#### prompts.ts
```typescript
export const getNovoTipoPrompt = (): string => {
  return `
    Você é um extrator de dados para documentos do tipo Novo Tipo.
    Extraia as seguintes informações:
    - campo1: descrição do campo
    - campo2: descrição do campo
    // ... instruções específicas
  `;
};

export const novoTipoSteps: PromptStep[] = [
  {
    step: 1,
    name: "Extração Principal",
    description: "Extraindo dados principais",
    prompt: getNovoTipoPrompt(),
    expectsInput: false
  }
];
```

#### NovoTipoProcessor.ts
```typescript
export class NovoTipoProcessor extends BaseDocumentProcessor {
  readonly documentType = DocumentType.NOVO_TIPO;
  readonly supportedFormats = ['pdf'];
  readonly hasMultiStep = false; // ou true se precisar multi-step

  async process(file: File, options = {}): Promise<ProcessingResult> {
    // Implementar lógica específica
  }

  validate(data: any): ValidationResult {
    const validator = new NovoTipoValidator(this.validationRules);
    return validator.validate(data);
  }

  getPrompts(): string[] {
    return [getNovoTipoPrompt()];
  }

  getSteps(): PromptStep[] {
    return novoTipoSteps;
  }

  getPromptForStep(step: number): string {
    return getPromptForStep(step);
  }
}
```

#### NovoTipoValidator.ts
```typescript
export class NovoTipoValidator {
  constructor(private rules: NovoTipoValidationRules) {}

  validate(data: NovoTipoProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Implementar validações específicas

    return DocumentValidator.createValidationResult(errors, warnings);
  }
}
```

### Passo 3: Registrar o Processador

Adicionar no `src/services/documents/index.ts`:

```typescript
import { NovoTipoProcessor } from './novo-tipo/NovoTipoProcessor';

export function initializeDocumentProcessors(): void {
  // ... processadores existentes
  
  // Registrar novo processador
  const novoTipoProcessor = new NovoTipoProcessor();
  documentProcessorFactory.register(DocumentType.NOVO_TIPO, novoTipoProcessor);
}
```

### Passo 4: Adicionar ao Enum

Adicionar no `src/services/documents/base/types.ts`:

```typescript
export enum DocumentType {
  // ... tipos existentes
  NOVO_TIPO = 'novo_tipo',
}
```

### Passo 5: Criar Componentes Específicos (Opcional)

```
src/components/documents/novo-tipo/
├── NovoTipoViewer.tsx    # Visualizador específico
├── NovoTipoEditor.tsx    # Editor específico
└── NovoTipoSummary.tsx   # Resumo específico
```

## Benefícios da Arquitetura Modular

### ✅ **Extensibilidade**
- Adicionar novos tipos sem modificar código existente
- Cada tipo é completamente independente
- Factory Pattern permite descoberta automática

### ✅ **Manutenibilidade**
- Código organizado por responsabilidade
- Mudanças isoladas por tipo de documento
- Facilita debugging e testes

### ✅ **Reutilização**
- Componentes base reutilizáveis
- Validações comuns centralizadas
- Padrões consistentes entre tipos

### ✅ **Flexibilidade**
- Prompts específicos por tipo
- Processamento single-step ou multi-step
- Validações customizadas por necessidade

### ✅ **Escalabilidade**
- APIs automáticas para novos tipos
- Sistema de descoberta dinâmica
- Suporte a diferentes formatos por tipo

## Estrutura de Diretórios Final

```
src/
├── services/documents/
│   ├── base/                           # Código base compartilhado
│   │   ├── types.ts
│   │   ├── DocumentProcessor.ts
│   │   └── DocumentValidator.ts
│   ├── packing-list/                   # Packing List específico
│   │   ├── types.ts
│   │   ├── prompts.ts
│   │   ├── PackingListProcessor.ts
│   │   └── PackingListValidator.ts
│   ├── commercial-invoice/             # Commercial Invoice específico
│   │   ├── types.ts
│   │   ├── prompts.ts
│   │   ├── CommercialInvoiceProcessor.ts
│   │   └── CommercialInvoiceValidator.ts
│   ├── DocumentProcessorFactory.ts     # Factory Pattern
│   └── index.ts                        # Entry point e registro
├── components/documents/
│   ├── DocumentUploadForm.tsx          # Upload genérico
│   ├── DocumentTypeSelector.tsx        # Seletor de tipos
│   ├── DocumentProcessorDemo.tsx       # Demo do sistema
│   └── index.ts
└── app/api/documents/
    ├── [type]/
    │   ├── process/route.ts            # Processamento dinâmico
    │   ├── validate/route.ts           # Validação dinâmica
    │   └── prompts/route.ts            # Prompts dinâmicos
    ├── types/route.ts                  # Lista de tipos
    └── health/route.ts                 # Status do sistema
```

## Próximos Passos

1. **Integração com OCR**: Conectar processadores com serviços existentes (Claude, Google Vision)
2. **Novos Tipos**: Implementar Bill of Lading, DI, etc.
3. **Componentes Avançados**: Viewers específicos para cada tipo
4. **Storage**: Integração com sistema de storage do Supabase
5. **Monitoramento**: Métricas de processamento e performance

## Conclusão

O novo sistema modular oferece uma base sólida e extensível para processamento de documentos. Com o Factory Pattern e a estrutura modular, adicionar novos tipos de documento se torna uma tarefa simples e isolada, mantendo a qualidade e consistência do código.