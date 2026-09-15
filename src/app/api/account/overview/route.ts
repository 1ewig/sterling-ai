import { NextResponse } from 'next/server';
import { getAccountOverviewV3 } from '@/lib/bitget/trade';
import { getSandboxAccountOverview } from '@/lib/sandbox/sandbox-broker';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const tradingMode = req.headers.get('x-trading-mode') || 'sandbox';

  if (tradingMode === 'sandbox') {
    const overview = getSandboxAccountOverview();
    return NextResponse.json({
      success: true,
      data: overview,
      isSandbox: true,
    });
  }

  try {
    const overview = await getAccountOverviewV3('all');
    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch account overview';
    const isMissingConfig =
      message.includes('BITGET_API_KEY') ||
      message.includes('credentials not configured') ||
      message.includes('MISSING_CREDENTIALS');

    // Fall back to sandbox overview if credentials not configured
    if (isMissingConfig) {
      const overview = getSandboxAccountOverview();
      return NextResponse.json({
        success: true,
        data: overview,
        isSandbox: true,
        isMissingConfig: true,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
        isMissingConfig,
      },
      { status: 200 }
    );
  }
}
