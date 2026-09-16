import { getAccountOverviewV3 } from '@/lib/bitget/trade/account';
import { createSseStream } from '@/lib/bitget/trade/sse';
import { extractBitgetCredentials } from '@/lib/sandbox/trading-mode';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const clientCreds = extractBitgetCredentials(req);
  const apiKey = clientCreds?.apiKey || process.env.BITGET_API_KEY;
  const apiSecret = clientCreds?.apiSecret || process.env.BITGET_API_SECRET;
  const passphrase = clientCreds?.passphrase || process.env.BITGET_PASSPHRASE;

  const isMissingConfig = !apiKey || !apiSecret || !passphrase;

  if (isMissingConfig) {
    const { getSandboxAccountOverview } = await import('@/lib/sandbox/sandbox-broker');
    return createSseStream(
      'tab_acc_sb',
      async () => ({ overview: getSandboxAccountOverview() }),
      req.signal
    );
  }

  return createSseStream(
    'tab_acc',
    async () => ({ overview: await getAccountOverviewV3('all', clientCreds) }),
    req.signal
  );
}