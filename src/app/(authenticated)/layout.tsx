'use client';

import { ProtectedLayout } from '@/components/layout/protected-layout';
import { usePathname } from 'next/navigation';

// Map routes to page titles
const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/ocr': 'OCR - Extração de Documentos',
  '/processo-importacao': 'Processos de Importação',
  '/processos': 'Importações',
  '/configuracoes': 'Configurações',
  '/settings': 'Preferências',
};

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Get page title based on current route
  const pageTitle = pageTitles[pathname] || 'Sistema ERP';

  return (
    <ProtectedLayout title={pageTitle}>
      {children}
    </ProtectedLayout>
  );
}