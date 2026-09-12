import { tool } from 'ai';
import { marketDataParamsSchema } from '@/agent/types';
import { fetchBitgetTicker, fetchFundingRate, fetchOpenInterest, fetchOrderbook, normalizeSymbol } from '@/lib/bitget/client';

export const marketDataTool = tool({
  description:
    'Fetch real-time live quotes, 24h stats, funding rates, open interest, and orderbook depth for any cryptocurrency, commodity, or tokenized US equity pair on Bitget (e.g. BTCUSDT, ETHUSDT, SOLUSDT, TSLAUSDT, NVDAUSDT, SPYUSDT, XAUUSDT).',
  inputSchema: marketDataParamsSchema,
  execute: async ({ symbol, productType }) => {
    const isFutures = productType === 'usdt-futures';
    const normalized = normalizeSymbol(symbol);

    try {
      const [ticker, funding, oi, orderbook] = await Promise.allSettled([
        fetchBitgetTicker(symbol, isFutures),
        fetchFundingRate(symbol),
        fetchOpenInterest(symbol),
        fetchOrderbook(symbol, 5, isFutures),
      ]);

      if (ticker.status !== 'fulfilled') {
        const errorMsg = ticker.reason instanceof Error ? ticker.reason.message : `Could not retrieve live ticker for ${symbol}`;
        return {
          success: false,
          error: errorMsg,
          requestedSymbol: symbol,
          normalizedSymbol: normalized,
          actionableGuidance:
            `Symbol "${symbol}" could not be retrieved. Ensure you specify a valid trading pair. Supported examples: BTCUSDT, ETHUSDT, SOLUSDT, TSLAUSDT, NVDAUSDT, SPYUSDT, XAUUSDT.`,
          suggestedAction: 'Verify the ticker spelling or try querying a major crypto asset or tokenized stock.',
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
        volume24hUsdt: parseFloat(t.usdtVolume || t.quoteVolume || '0').toLocaleString(),
        fundingRate: fundingData ? `${(parseFloat(fundingData.fundingRate) * 100).toFixed(4)}%` : undefined,
        openInterest: oiData ? `${parseFloat(oiData.size).toLocaleString()}` : undefined,
        orderbookTop: depthData
          ? {
              bestAsk: depthData.asks[0] ? { price: depthData.asks[0][0], size: depthData.asks[0][1] } : undefined,
              bestBid: depthData.bids[0] ? { price: depthData.bids[0][0], size: depthData.bids[0][1] } : undefined,
            }
          : undefined,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : `Failed to fetch market data for ${symbol}.`,
        requestedSymbol: symbol,
        normalizedSymbol: normalized,
        actionableGuidance: 'The market data request failed. Try checking the symbol name or try with productType="spot".',
      };
    }
  },
});
