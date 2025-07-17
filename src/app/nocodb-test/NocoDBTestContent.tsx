'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Database, Loader2 } from 'lucide-react';
import { useNocoDB } from '@/hooks/useNocoDB';
import { getNocoDBStatus } from '@/lib/services/nocodb';
import { buildQueryParams } from '@/lib/nocodb-utils';
import { toast } from 'sonner';

export function NocoDBTestContent() {
  const [tableId, setTableId] = useState('');
  const [testData, setTestData] = useState<any>(null);
  const [createData, setCreateData] = useState('{"name": "Test Record", "status": "active"}');
  const [nocodbStatus, setNocodbStatus] = useState(getNocoDBStatus());
  
  const { loading, error, create, find, findOne, update, remove } = useNocoDB(tableId);

  // Update status on mount to ensure client-side rendering
  useEffect(() => {
    setNocodbStatus(getNocoDBStatus());
  }, []);

  const handleTestConnection = async () => {
    if (!tableId) {
      toast.error('Por favor, insira um Table ID');
      return;
    }

    try {
      const result = await find({ limit: 5 });
      setTestData(result);
      toast.success('Conexão bem-sucedida!');
    } catch (err) {
      console.error('Connection test failed:', err);
    }
  };

  const handleCreate = async () => {
    try {
      const data = JSON.parse(createData);
      const result = await create(data);
      toast.success('Registro criado!');
      console.log('Created:', result);
      handleTestConnection(); // Refresh data
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error('JSON inválido');
      }
    }
  };

  const handleFindWithFilters = async () => {
    try {
      const params = buildQueryParams({
        page: 1,
        pageSize: 10,
        filters: [{ field: 'status', op: 'eq', value: 'active' }],
        sorts: [{ field: 'created_at', direction: 'desc' }],
      });
      
      const result = await find(params);
      setTestData(result);
      toast.success('Busca com filtros realizada!');
    } catch (err) {
      console.error('Filtered search failed:', err);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Database className="h-8 w-8" />
          NocoDB Test Page
        </h1>
        <p className="text-muted-foreground">
          Teste a integração com o NocoDB
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Status da Configuração</CardTitle>
          <CardDescription>Verifique se o NocoDB está configurado corretamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {nocodbStatus.hasUrl ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span>URL da API: {nocodbStatus.hasUrl ? 'Configurada' : 'Não configurada'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {nocodbStatus.hasToken && !nocodbStatus.isDefaultToken ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>
                Token da API: {' '}
                {nocodbStatus.isDefaultToken 
                  ? 'Usando token padrão (atualize em .env.local)' 
                  : nocodbStatus.hasToken 
                    ? 'Configurado' 
                    : 'Não configurado'}
              </span>
            </div>
            
            <div className="mt-4">
              <Badge variant={nocodbStatus.configured ? 'secondary' : 'destructive'}>
                {nocodbStatus.configured ? 'Pronto para uso' : 'Configuração pendente'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Interface de Teste</CardTitle>
          <CardDescription>Execute operações CRUD no NocoDB</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="tableId">Table ID</Label>
              <Input
                id="tableId"
                placeholder="Ex: tbl_xyz123"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Encontre o Table ID no NocoDB: Tabela → Details → API Snippets
              </p>
            </div>
          </div>

          <Tabs defaultValue="read" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="read">Buscar</TabsTrigger>
              <TabsTrigger value="create">Criar</TabsTrigger>
              <TabsTrigger value="update">Atualizar</TabsTrigger>
              <TabsTrigger value="delete">Excluir</TabsTrigger>
            </TabsList>

            <TabsContent value="read" className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={handleTestConnection} 
                  disabled={!tableId || loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Buscar Registros
                </Button>
                <Button 
                  onClick={handleFindWithFilters} 
                  disabled={!tableId || loading}
                  variant="outline"
                >
                  Buscar com Filtros
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <div>
                <Label htmlFor="createData">Dados JSON</Label>
                <textarea
                  id="createData"
                  className="w-full h-32 p-2 border rounded-md font-mono text-sm"
                  value={createData}
                  onChange={(e) => setCreateData(e.target.value)}
                  placeholder='{"field": "value"}'
                />
              </div>
              <Button 
                onClick={handleCreate} 
                disabled={!tableId || loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Registro
              </Button>
            </TabsContent>

            <TabsContent value="update" className="space-y-4">
              <p className="text-muted-foreground">
                Funcionalidade de atualização - implemente conforme necessário
              </p>
            </TabsContent>

            <TabsContent value="delete" className="space-y-4">
              <p className="text-muted-foreground">
                Funcionalidade de exclusão - implemente conforme necessário
              </p>
            </TabsContent>
          </Tabs>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Results Display */}
          {testData && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Resultados:</h3>
              <pre className=" p-4 rounded-md overflow-auto max-h-96 text-xs">
                {JSON.stringify(testData, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Como usar</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ol className="list-decimal list-inside space-y-2">
            <li>Configure suas credenciais do NocoDB em <code>.env.local</code></li>
            <li>Obtenha o Table ID da sua tabela no NocoDB</li>
            <li>Cole o Table ID no campo acima</li>
            <li>Use as abas para testar diferentes operações CRUD</li>
            <li>Verifique o console do navegador para logs detalhados</li>
          </ol>
          
          <h4 className="mt-4 font-semibold">Exemplo de uso no código:</h4>
          <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-auto">
{`import { useNocoDB } from '@/hooks/useNocoDB';

function MyComponent() {
  const { loading, error, find, create } = useNocoDB('tbl_xyz123');
  
  // Buscar dados
  const fetchData = async () => {
    const data = await find({ limit: 10 });
    console.log(data);
  };
  
  // Criar registro
  const createRecord = async () => {
    await create({ name: 'Novo', status: 'active' });
  };
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}