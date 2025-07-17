# Configuração do OCR com Google Cloud Vision e Supabase Storage

Este guia explica como configurar o sistema de OCR usando o Google Cloud Vision API e Supabase Storage.

## Métodos de Autenticação

O sistema suporta dois métodos de autenticação:

### Método 1: API Key (Recomendado para começar) ✅

**Vantagens:**
- Configuração mais simples
- Ideal para desenvolvimento e testes
- Não precisa de arquivos de credenciais

**Como configurar:**

1. **Crie um projeto no Google Cloud Console**
   - Acesse: https://console.cloud.google.com
   - Crie um novo projeto ou selecione um existente

2. **Ative a Cloud Vision API**
   - No console, vá para "APIs e Serviços" > "Biblioteca"
   - Procure por "Cloud Vision API"
   - Clique em "Ativar"

3. **Crie uma API Key**
   - Vá para "APIs e Serviços" > "Credenciais"
   - Clique em "Criar credenciais" > "Chave de API"
   - (Opcional) Restrinja a chave para maior segurança

4. **Configure no projeto**
   - Abra o arquivo `.env.local`
   - Adicione sua API Key:
   ```env
   GOOGLE_CLOUD_VISION_API_KEY=sua-api-key-aqui
   ```

### Método 2: Service Account (Para produção)

**Vantagens:**
- Mais seguro
- Recomendado pelo Google para produção
- Controle granular de permissões

**Como configurar:**

1. **Crie uma Service Account**
   - No Console, vá para "IAM e administração" > "Contas de serviço"
   - Clique em "Criar conta de serviço"
   - Dê um nome e descrição
   - Conceda o papel "Cloud Vision API User"

2. **Baixe as credenciais**
   - Clique na conta de serviço criada
   - Vá para "Chaves" > "Adicionar chave" > "Criar nova chave"
   - Escolha JSON e baixe o arquivo

3. **Configure no projeto**
   - Salve o arquivo JSON em: `credentials/google-cloud-vision.json`
   - No `.env.local`, comente a linha da API Key e descomente:
   ```env
   # GOOGLE_CLOUD_VISION_API_KEY=sua-api-key-aqui
   
   GOOGLE_CLOUD_PROJECT_ID=seu-projeto-id
   GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-cloud-vision.json
   ```

## Custos e Limites

### Preços (2024)
- Primeiras 1.000 unidades/mês: **Grátis**
- Após 1.000 unidades: ~$1.50 por 1.000 unidades

### O que conta como uma unidade?
- 1 página de PDF = 1 unidade

### Exemplo de custos:
- 100 documentos/mês = Grátis
- 5.000 documentos/mês ≈ $6.00
- 10.000 documentos/mês ≈ $13.50

## Testando a Configuração

1. Inicie o servidor:
   ```bash
   npm run dev
   ```

2. Acesse: http://localhost:3000/ocr

3. Faça upload de um documento teste

4. Se tudo estiver configurado corretamente, você verá o texto extraído!

## Solução de Problemas

### Erro: "API key not valid"
- Verifique se a API Key está correta
- Certifique-se de que a Cloud Vision API está ativada
- Verifique as restrições da API Key

### Erro: "Permission denied"
- Para Service Account: verifique se tem o papel "Cloud Vision API User"
- Verifique se o caminho do arquivo JSON está correto

### Erro: "Quota exceeded"
- Verifique seu uso no Console do Google Cloud
- Considere aumentar as cotas ou aguardar o próximo mês

## Segurança

### Para API Key:
- **Nunca** commite a API Key no git
- Use restrições de IP em produção
- Considere usar Service Account para produção

### Para Service Account:
- Mantenha o arquivo JSON seguro
- Nunca commite o arquivo de credenciais
- Use variáveis de ambiente em produção

## Configuração do Supabase Storage

### 1. Criar o Bucket

O bucket será criado automaticamente na primeira vez que você fizer upload. Mas se quiser criar manualmente:

1. Acesse o painel do Supabase
2. Vá para "Storage"
3. Clique em "New bucket"
4. Nome: `ocr-documents`
5. Public: **Não** (mantenha privado)
6. File size limit: 20MB
7. Allowed mime types: `application/pdf`

### 2. Aplicar Políticas RLS

Execute o arquivo SQL no editor do Supabase:

```bash
# O arquivo está em:
supabase/storage-policies.sql
```

Este arquivo:
- Configura políticas de segurança RLS
- Cria tabela `ocr_documents` para rastrear processamentos
- Garante que usuários só acessem seus próprios arquivos

### 3. Estrutura de Arquivos

Os arquivos são organizados assim no Storage:
```
ocr-documents/
├── {user_id}/
│   ├── 1234567890-abc123.pdf
│   ├── 1234567891-def456.pdf
│   └── ...
```

## Fluxo de Processamento

1. **Upload**: Arquivo é enviado para Supabase Storage
2. **OCR**: Arquivo é baixado, processado com Cloud Vision
3. **Armazenamento**: Resultados salvos na tabela `ocr_documents`
4. **Acesso**: URLs assinadas para visualização segura

## Links Úteis

- [Console Google Cloud](https://console.cloud.google.com)
- [Documentação Cloud Vision](https://cloud.google.com/vision/docs)
- [Preços Cloud Vision](https://cloud.google.com/vision/pricing)
- [Guia de Autenticação](https://cloud.google.com/vision/docs/authentication)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)