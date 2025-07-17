'use client';

import dynamic from 'next/dynamic';

// Componente principal com dynamic import para evitar SSR
const NocoDBTestContent = dynamic(
  () => import('./NocoDBTestContent').then(mod => mod.NocoDBTestContent),
  { 
    ssr: false,
    loading: () => (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    )
  }
);

export default function NocoDBTestPage() {
  return <NocoDBTestContent />;
}