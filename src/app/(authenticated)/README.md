# Páginas Autenticadas

Todas as páginas dentro deste diretório `(authenticated)` herdam automaticamente:

1. **Autenticação**: Verifica se o usuário está logado
2. **Sidebar**: Menu lateral de navegação
3. **Header**: Cabeçalho com título da página
4. **Layout Padrão**: Estrutura consistente

## Como criar uma nova página autenticada

### 1. Crie um novo diretório com o nome da rota

```bash
mkdir src/app/(authenticated)/minha-nova-pagina
```

### 2. Crie o arquivo page.tsx

```tsx
'use client';

export default function MinhaNovaPage() {
  return (
    <div>
      {/* Seu conteúdo aqui */}
      <h1>Minha Nova Página</h1>
    </div>
  );
}
```

### 3. Adicione o título da página no layout

Edite `/src/app/(authenticated)/layout.tsx` e adicione sua rota no objeto `pageTitles`:

```tsx
const pageTitles: Record<string, string> = {
  // ... outras rotas
  '/minha-nova-pagina': 'Título da Minha Nova Página',
};
```

### 4. Adicione a rota no sidebar (opcional)

Se quiser que apareça no menu lateral, edite `/src/components/layout/sidebar.tsx`:

```tsx
const navItems: NavGroup[] = [
  {
    groupLabel: "Meu Grupo",
    items: [
      {
        title: "Minha Nova Página",
        href: "/minha-nova-pagina",
        icon: MeuIcone,
        requiredRole: ['admin', 'user']
      },
    ],
  },
];
```

## Benefícios

- ✅ **Sem duplicação**: Não precisa importar Layout/ProtectedLayout em cada página
- ✅ **Autenticação automática**: Todas as páginas são protegidas
- ✅ **Consistência**: Mesmo layout em todas as páginas
- ✅ **Manutenção fácil**: Mudanças no layout afetam todas as páginas

## Páginas Existentes

- `/dashboard` - Dashboard principal
- `/ocr` - Extração de documentos OCR
- `/processo-importacao` - Processos de importação
- `/processos` - Lista de importações
- `/configuracoes` - Configurações administrativas