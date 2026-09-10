import { tool } from 'ai';
import { marketDataParamsSchema } from '@/lib/bitget/types';
import { fetchBitgetTicker, fetchFundingRate, fetchOpenInterest, fetchOrderbook } from '@/lib/bitget/client';

export const marketDataTool = tool({
  description:
    'Fetch real-time live quotes, 24h stats, funding rates, open interest, and orderbook depth for any cryptocurrency or tokenized US equity pair on Bitget (e.g. BTCUSDT, ETHUSDT, TSLAUSDT, NVDAUSDT, SPYUSDT).',
  inputSchema: marketDataParamsSchema,
  execute: async ({ symbol, productType }) => {
    const isFutures = productType === 'usdt-futures';
    const [ticker, funding, oi, orderbook] = await Promise.allSettled([
      fetchBitgetTicker(symbol, isFutures),
      fetchFundingRate(symbol),
      fetchOpenInterest(symbol),
      fetchOrderbook(symbol, 5, isFutures),
    ]);

    if (ticker.status !== 'fulfilled') {
      return {
        success: false,
        error: `Could not retrieve live ticker for ${symbol}.`,
      };
    }

    const t = ticker.value;
    const fundingData = funding.status === 'fulfilled' ? funding.value : null;
    const oiData = oi.status === 'fulfilled' ? oi.value : null;
    const depthData = orderbook.status === 'fulfilled' ? orderbook.value : null;

    return {
      success: true,
      symbol: t.symbol,
      productType,
      price: parseFloat(t.lastPr),
      high24h: parseFloat(t.high24h),
      low24h: parseFloat(t.low24h),
      change24h: `${parseFloat(t.change24h) > 0 ? '+' : ''}${(parseFloat(t.change24h) * 100).toFixed(2)}%`,
      volume24hUsdt: parseFloat(t.usdtVolume).toLocaleString(),
      fundingRate: fundingData ? `${(parseFloat(fundingData.fundingRate) * 100).toFixed(4)}%` : undefined,
      openInterest: oiData ? `${parseFloat(oiData.size).toLocaleString()}` : undefined,
      orderbookTop: depthData
        ? {
            bestAsk: depthData.asks[0] ? { price: depthData.asks[0][0], size: depthData.asks[0][1] } : undefined,
            bestBid: depthData.bids[0] ? { price: depthData.bids[0][0], size: depthData.bids[0][1] } : undefined,
          }
        : undefined,
    };
  },
});
