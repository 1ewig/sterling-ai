import { NextResponse } from 'next/server';
import { getAccountOverviewV3 } from '@/lib/bitget/trade';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
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
