# Correções e Melhorias Necessárias

## 🔴 Correções Urgentes

### 1. Remover OCRUploadForm Duplicado
**Arquivo**: `/src/components/ocr/OCRUploadForm.tsx`
**Ação**: Deletar arquivo - funcionalidade duplicada em `DocumentUploadForm`

### 2. Atualizar Página de Processos
**Arquivo**: `/src/app/(authenticated)/processos/page.tsx`
**Ações**:
```tsx
// Remover dados mockados
// Importar e usar:
import { ProcessoImportacaoList } from '@/components/processo_import/ProcessoImportacaoList';
import { ProcessoDetailsModal } from '@/components/processo_import/ProcessoDetailsModal';
import { NovoProcessoModal } from '@/components/processo_import/NovoProcessoModal';

// Implementar fetch real do NocoDB
```

### 3. Corrigir Import de DocumentType
**Problema**: `DocumentType` sendo importado de múltiplos lugares
**Solução**: Centralizar em `/src/services/documents/base/types.ts`

## 🟡 Melhorias Recomendadas

### 1. Implementar ProcessDocumentService no Fluxo de Salvamento
**Arquivo**: `/src/app/(authenticated)/ocr/page.tsx`
**Linha**: ~285
```typescript
// Após salvar documento com sucesso:
import { getProcessDocumentService } from '@/lib/services/ProcessDocumentService';

// Adicionar relacionamento
if (processId && currentFileHash) {
  const processDocService = getProcessDocumentService();
  await processDocService.linkDocumentToProcess(processId, currentFileHash);
}
```

### 2. Adicionar Loading States Consistentes
**Arquivos**: Todos os componentes de upload e processamento
**Implementar**: Skeleton loaders, spinners consistentes

### 3. Tratamento de Erros Global
**Criar**: `/src/components/ErrorBoundary.tsx`
**Aplicar**: Em layouts principais

## 🟢 Otimizações

### 1. Reduzir Código no NovoProcessoModal
**Separar em hooks**:
- `useFileUpload()` - lógica de upload
- `useOCRProcessing()` - lógica de processamento
- `useProcessCreation()` - lógica de criação

### 2. Criar Tipos Compartilhados
**Arquivo**: `/src/types/common.ts`
```typescript
export interface ProcessingState {
  isProcessing: boolean;
  step: 'idle' | 'uploading' | 'processing' | 'saving' | 'complete';
  progress?: number;
  error?: string;
}
```

### 3. Implementar Cache de Consultas
**Usar**: React Query ou SWR
**Para**: Consultas ao NocoDB

## 📋 Checklist de Implementação

- [ ] Remover OCRUploadForm.tsx
- [ ] Atualizar página de processos com componentes reais
- [ ] Implementar ProcessDocumentService no salvamento
- [ ] Adicionar relacionamento processo-documento ao salvar
- [ ] Criar ErrorBoundary global
- [ ] Padronizar imports de DocumentType
- [ ] Adicionar loading states em todos os componentes
- [ ] Implementar hooks customizados para lógica complexa
- [ ] Adicionar testes unitários para serviços criados
- [ ] Documentar APIs internas no código

## 🚀 Próximas Features

1. **Sistema de Relatórios**
   - Criar `/src/app/api/reports/compare/route.ts`
   - Implementar prompts de comparação
   - Gerar CSVs de análise

2. **Dashboard de Processo**
   - Visualização de timeline
   - Métricas de processamento
   - Alertas de pendências

3. **Automação de Fluxo**
   - Processamento em lote
   - Notificações por email
   - Webhooks para integrações