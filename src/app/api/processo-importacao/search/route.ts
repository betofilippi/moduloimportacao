import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

/**
 * Search for import processes based on various criteria
 * Used to find related processes for document attachment
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      invoiceNumber, 
      documentNumber, 
      companyName, 
      limit = 10 
    } = body;

    console.log('🔍 [SEARCH PROCESS] Search criteria:', {
      invoiceNumber,
      documentNumber,
      companyName,
      limit
    });

    const nocodb = getNocoDBService();
    const whereConditions: string[] = [];

    // Build search conditions
    if (invoiceNumber) {
      // Search in invoice field and descricao_adicionais
      whereConditions.push(`(invoice,like,%${invoiceNumber}%)`);
      whereConditions.push(`(descricao_adicionais,like,%${invoiceNumber}%)`);
    }

    if (documentNumber) {
      // Search in numero_processo and other reference fields
      whereConditions.push(`(numero_processo,like,%${documentNumber}%)`);
      whereConditions.push(`(descricao_adicionais,like,%${documentNumber}%)`);
    }

    if (companyName) {
      // Search in empresa field
      whereConditions.push(`(empresa,like,%${companyName}%)`);
    }

    // If no search criteria provided, return error
    if (whereConditions.length === 0) {
      return NextResponse.json({
        success: true,
        processes: [],
        message: 'Nenhum critério de busca fornecido'
      });
    }

    // Search with OR conditions
    const searchWhere = `(${whereConditions.join('~or')})`;
    
    const result = await nocodb.find(NOCODB_TABLES.PROCESSO_IMPORTACAO, {
      where: searchWhere,
      limit: limit,
      sort: '-criado_em' // Most recent first
    });

    console.log(`✅ [SEARCH PROCESS] Found ${result.list.length} processes`);

    // Calculate relevance score for each process
    const processesWithScore = result.list.map(process => {
      let score = 0;
      let matchedFields: string[] = [];

      // Exact invoice match gets highest score
      if (invoiceNumber) {
        if (process.invoice === invoiceNumber) {
          score += 100;
          matchedFields.push('invoice (exact)');
        } else if (process.invoice?.includes(invoiceNumber) || invoiceNumber.includes(process.invoice)) {
          score += 50;
          matchedFields.push('invoice (partial)');
        }
        
        if (process.descricao_adicionais?.includes(invoiceNumber)) {
          score += 30;
          matchedFields.push('descrição');
        }
      }

      // Document number match
      if (documentNumber && process.numero_processo?.includes(documentNumber)) {
        score += 40;
        matchedFields.push('número processo');
      }

      // Company name match
      if (companyName && process.empresa?.toLowerCase().includes(companyName.toLowerCase())) {
        score += 20;
        matchedFields.push('empresa');
      }

      return {
        ...process,
        _score: score,
        _matchedFields: matchedFields
      };
    });

    // Sort by score
    processesWithScore.sort((a, b) => b._score - a._score);

    // Format response
    const response = {
      success: true,
      processes: processesWithScore.map(p => ({
        id: p.Id,
        numero_processo: p.numero_processo,
        empresa: p.empresa,
        invoice: p.invoice,
        status: p.status_atual,
        data_abertura: p.data_abertura,
        descricao_adicionais: p.descricao_adicionais,
        relevanceScore: p._score,
        matchedFields: p._matchedFields
      })),
      searchCriteria: {
        invoiceNumber,
        documentNumber,
        companyName
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [SEARCH PROCESS] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}