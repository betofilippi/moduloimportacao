# Estrutura da Tabela de Processos de Importação

## Visão Geral

Este documento detalha a estrutura proposta para gerenciar processos de importação no sistema, explicando cada campo, sua importância e casos de uso práticos.

## 1. Tabela Principal: PROCESSOS_IMPORTACAO

### Estrutura Detalhada

```sql
CREATE TABLE PROCESSOS_IMPORTACAO (
    -- Identificação Única
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    numero_processo         VARCHAR(50) UNIQUE NOT NULL,    -- Ex: IMP-2024-001
    
    -- Chaves de Relacionamento
    invoice_number          VARCHAR(100) NOT NULL,           -- Chave principal de vinculação
    numero_di              VARCHAR(50),                      -- Preenchido após criação da DI
    
    -- Informações Descritivas
    descricao              TEXT NOT NULL,
    tipo_operacao          ENUM('importacao', 'exportacao') DEFAULT 'importacao',
    
    -- Dados da Empresa
    empresa                VARCHAR(200) NOT NULL,
    cnpj_empresa           VARCHAR(14),
    
    -- Responsabilidade
    responsavel            VARCHAR(100) NOT NULL,
    email_responsavel      VARCHAR(150),
    telefone_responsavel   VARCHAR(20),
    
    -- Controle de Tempo
    data_inicio            DATE NOT NULL,
    data_previsao_termino  DATE,
    data_conclusao         DATE,
    
    -- Status e Prioridade
    status                 ENUM('active', 'completed', 'cancelled', 'on_hold') DEFAULT 'active',
    urgencia              ENUM('normal', 'urgente', 'critica') DEFAULT 'normal',
    
    -- Valores Financeiros
    valor_total_estimado   DECIMAL(15,2),
    moeda                 VARCHAR(3) DEFAULT 'USD',
    taxa_cambio_referencia DECIMAL(10,4),
    
    -- Informações Adicionais
    observacoes           TEXT,
    tags                  JSON,                              -- ["primeira_importacao", "cliente_vip"]
    
    -- Auditoria
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by            VARCHAR(100),
    updated_by            VARCHAR(100),
    
    -- Índices
    INDEX idx_invoice (invoice_number),
    INDEX idx_di (numero_di),
    INDEX idx_status (status),
    INDEX idx_empresa (cnpj_empresa)
);
```

### Explicação dos Campos

#### 🔑 **Campos de Identificação**

**`numero_processo`** (VARCHAR 50, Único)
- **Por quê**: Identificador amigável para usuários
- **Quando útil**: Comunicação interna, relatórios, referência rápida
- **Exemplo**: "IMP-2024-001", "EXP-2024-A15"
- **Benefício**: Facilita busca e organização cronológica

**`invoice_number`** (VARCHAR 100, NOT NULL)
- **Por quê**: Chave universal presente em quase todos os documentos
- **Quando útil**: Vinculação automática de documentos, rastreabilidade
- **Exemplo**: "INV-2024-12345", "PI-CN-2024-0089"
- **Benefício**: Permite automação na associação de documentos

**`numero_di`** (VARCHAR 50)
- **Por quê**: Referência oficial da Receita Federal
- **Quando útil**: Vincular Nota Fiscal, consultas oficiais, compliance
- **Exemplo**: "24/1234567-8"
- **Benefício**: Rastreabilidade fiscal e legal

#### 👥 **Campos de Responsabilidade**

**`empresa`** e **`cnpj_empresa`**
- **Por quê**: Identificar o importador/exportador
- **Quando útil**: Relatórios por empresa, análise de volume, compliance
- **Benefício**: Segmentação de dados, análise de performance por cliente

**`responsavel`**, **`email_responsavel`**, **`telefone_responsavel`**
- **Por quê**: Accountability e comunicação
- **Quando útil**: Notificações automáticas, escalação de problemas, auditoria
- **Benefício**: Comunicação eficiente, responsabilidade clara

#### ⏰ **Campos de Controle Temporal**

**`data_inicio`**, **`data_previsao_termino`**, **`data_conclusao`**
- **Por quê**: Gestão de prazos e SLA
- **Quando útil**: 
  - Alertas de atraso
  - Cálculo de tempo médio de processo
  - Previsão de carga de trabalho
- **Benefício**: Melhoria contínua, gestão de expectativas

**`status`** (active, completed, cancelled, on_hold)
- **Por quê**: Controle do ciclo de vida
- **Quando útil**:
  - **active**: Processo em andamento normal
  - **completed**: Finalizado com sucesso
  - **cancelled**: Interrompido (importante para análise)
  - **on_hold**: Aguardando ação externa
- **Benefício**: Visibilidade instantânea, filtros em dashboards

**`urgencia`** (normal, urgente, critica)
- **Por quê**: Priorização de trabalho
- **Quando útil**:
  - **normal**: Prazo padrão (30-45 dias)
  - **urgente**: Precisa atenção prioritária (15-20 dias)
  - **critica**: Risco de multa ou perda (< 7 dias)
- **Benefício**: Gestão eficiente de recursos

#### 💰 **Campos Financeiros**

**`valor_total_estimado`**, **`moeda`**, **`taxa_cambio_referencia`**
- **Por quê**: Análise financeira e previsão
- **Quando útil**:
  - Relatórios gerenciais
  - Cálculo de impostos estimados
  - Análise de rentabilidade
- **Benefício**: Decisões financeiras informadas

#### 🔧 **Campos Auxiliares**

**`observacoes`** (TEXT)
- **Por quê**: Flexibilidade para casos específicos
- **Quando útil**: Instruções especiais, histórico de problemas, notas importantes
- **Benefício**: Contexto adicional sem criar novos campos

**`tags`** (JSON)
- **Por quê**: Categorização flexível
- **Quando útil**: Filtros customizados, análises específicas
- **Exemplo**: ["primeira_importacao", "cliente_vip", "produto_controlado"]
- **Benefício**: Segmentação dinâmica sem alterar estrutura

## 2. Tabela de Relacionamento: PROCESSOS_DOCUMENTOS

### Estrutura

```sql
CREATE TABLE PROCESSOS_DOCUMENTOS (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    processo_id           INT NOT NULL,
    
    -- Identificação do Documento
    tipo_documento        ENUM('di', 'commercial_invoice', 'packing_list', 
                              'proforma_invoice', 'swift', 'numerario', 
                              'nota_fiscal') NOT NULL,
    documento_id          VARCHAR(100),                      -- ID do header na tabela específica
    
    -- Status do Documento
    status               ENUM('pending', 'processing', 'completed', 'error', 
                             'not_applicable') DEFAULT 'pending',
    
    -- Rastreabilidade
    hash_arquivo         VARCHAR(64),                        -- SHA-256 do arquivo
    nome_arquivo_original VARCHAR(255),
    tamanho_arquivo      INT,
    
    -- Datas de Controle
    data_upload          TIMESTAMP,
    data_processamento   TIMESTAMP,
    data_validacao       TIMESTAMP,
    
    -- Informações Adicionais
    observacoes          TEXT,
    erro_detalhes        JSON,                              -- Detalhes de erros se houver
    metadados           JSON,                               -- Dados extras do documento
    
    -- Auditoria
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    uploaded_by         VARCHAR(100),
    processed_by        VARCHAR(100),
    
    -- Constraints
    FOREIGN KEY (processo_id) REFERENCES PROCESSOS_IMPORTACAO(id),
    UNIQUE KEY unique_doc (processo_id, tipo_documento, hash_arquivo),
    
    -- Índices
    INDEX idx_processo (processo_id),
    INDEX idx_tipo_status (tipo_documento, status),
    INDEX idx_hash (hash_arquivo)
);
```

### Por que esta estrutura?

1. **Flexibilidade**: Permite múltiplos documentos do mesmo tipo
2. **Rastreabilidade**: Hash garante integridade
3. **Reprocessamento**: Mantém histórico de tentativas
4. **Análise**: Identifica gargalos no processo

## 3. Tabela Auxiliar: PROCESSOS_INVOICES_RELACIONADAS

Para casos onde um processo envolve múltiplas invoices:

```sql
CREATE TABLE PROCESSOS_INVOICES_RELACIONADAS (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    processo_id     INT NOT NULL,
    invoice_number  VARCHAR(100) NOT NULL,
    tipo_relacao    ENUM('principal', 'complementar', 'substituida') DEFAULT 'complementar',
    observacao      TEXT,
    
    FOREIGN KEY (processo_id) REFERENCES PROCESSOS_IMPORTACAO(id),
    UNIQUE KEY (processo_id, invoice_number)
);
```

## 4. Casos de Uso Práticos

### Caso 1: Importação Padrão
```
1. Criar processo com invoice da Proforma
2. Upload Commercial Invoice → vincula automaticamente
3. Upload Packing List → vincula automaticamente
4. Pagamento (SWIFT) → vincula por invoice
5. DI criada → atualiza numero_di no processo
6. Nota Fiscal → vincula por numero_di
```

### Caso 2: Múltiplas Invoices
```
1. Processo com invoice principal: "INV-2024-001"
2. Adicionar invoices relacionadas: "INV-2024-001A", "INV-2024-001B"
3. Sistema busca documentos de todas as invoices
4. Consolidação automática para a DI
```

### Caso 3: Reprocessamento
```
1. Erro no OCR do Packing List
2. Sistema mantém registro do erro
3. Novo upload do mesmo arquivo (hash diferente)
4. Mantém histórico completo
```

## 5. Benefícios para o Negócio

### 📊 **Visibilidade Completa**
- Dashboard com status real-time
- Identificação de gargalos
- Previsão de conclusão

### 🔄 **Automação**
- Vinculação automática de documentos
- Notificações por status
- Alertas de prazo

### 📈 **Análise e Melhoria**
- Tempo médio por tipo de processo
- Taxa de erro por documento
- Performance por responsável

### 🔒 **Compliance e Auditoria**
- Rastreabilidade completa
- Histórico de alterações
- Integridade de documentos

### 💼 **Gestão Eficiente**
- Priorização por urgência
- Distribuição de carga
- Redução de retrabalho

## 6. Queries Úteis

### Processos em Atraso
```sql
SELECT * FROM PROCESSOS_IMPORTACAO 
WHERE status = 'active' 
AND data_previsao_termino < CURDATE()
ORDER BY urgencia DESC, data_previsao_termino ASC;
```

### Documentos Pendentes por Processo
```sql
SELECT p.numero_processo, pd.tipo_documento, pd.status
FROM PROCESSOS_IMPORTACAO p
JOIN PROCESSOS_DOCUMENTOS pd ON p.id = pd.processo_id
WHERE pd.status IN ('pending', 'error')
ORDER BY p.urgencia DESC, p.data_inicio ASC;
```

### Análise de Tempo Médio
```sql
SELECT 
    tipo_operacao,
    AVG(DATEDIFF(data_conclusao, data_inicio)) as dias_medio,
    COUNT(*) as total_processos
FROM PROCESSOS_IMPORTACAO
WHERE status = 'completed'
GROUP BY tipo_operacao;
```

## 7. Implementação Futura

1. **Integração com NocoDB**: Criar tabelas via API
2. **Webhooks**: Notificações automáticas
3. **API REST**: Endpoints para consulta e atualização
4. **Dashboard Analytics**: Visualizações em tempo real
5. **Machine Learning**: Previsão de atrasos e problemas

Esta estrutura fornece uma base sólida e escalável para gerenciar processos de importação/exportação com eficiência e transparência.