import { NextResponse } from 'next/server';
import { aiGateway } from '@/lib/ai-server';
import { SCHEMES_DATABASE } from '@/lib/schemes-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() {
  // Configuration only: never spends quota or claims credentials are valid.
  return NextResponse.json({ ...aiGateway().status(), knowledge: {
    folder: 'data/schemes', records: SCHEMES_DATABASE.length,
    aiTools: ['recommendations', 'summary', 'comparison', 'documents', 'repayment'],
    directTools: [], directLanguages: [], directChatOverviews: false,
  } }, { headers: { 'Cache-Control': 'no-store' } });
}
