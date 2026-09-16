import { NextResponse } from 'next/server';
import { getAccountOverviewV3 } from '@/lib/bitget/trade';
import { getSandboxAccountOverview } from '@/lib/sandbox/sandbox-broker';
import {
  resolveTradingMode,
  extractBitgetCredentials,
  isMissingConfigError,
  sandboxResponse,
} from '@/lib/sandbox/trading-mode';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  if (resolveTradingMode(req) === 'sandbox') {
    return NextResponse.json(sandboxResponse(getSandboxAccountOverview()));
  }

  const credentials = extractBitgetCredentials(req);

  try {
    const overview = await getAccountOverviewV3('all', credentials);
    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch account overview';

    // Fall back to sandbox overview if credentials not configured
    if (isMissingConfigError(message)) {
      return NextResponse.json(
        sandboxResponse(getSandboxAccountOverview(), { isMissingConfig: false, isPaperFallback: true })
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
        isMissingConfig: false,
      },
      { status: 200 }
    );
  }
}
