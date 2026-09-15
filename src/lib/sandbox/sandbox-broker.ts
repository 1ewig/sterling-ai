import type {
  BitgetAccountOverview,
  BitgetV3Position,
  BitgetV3OrderInfo,
  BitgetV3OrderParams,
} from '@/lib/bitget/types';

export interface SandboxState {
  initialEquity: number;
  availableBalance: number;
  positions: BitgetV3Position[];
  openOrders: BitgetV3OrderInfo[];
  realizedPnl: number;
  updatedAt: number;
}

const DEFAULT_SANDBOX_EQUITY = 100000; // $100,000 USDT paper balance

let memorySandboxState: SandboxState = {
  initialEquity: DEFAULT_SANDBOX_EQUITY,
  availableBalance: DEFAULT_SANDBOX_EQUITY,
  positions: [],
  openOrders: [],
  realizedPnl: 0,
  updatedAt: Date.now(),
};

export function getSandboxState(): SandboxState {
  return memorySandboxState;
}

export function resetSandboxState(): SandboxState {
  memorySandboxState = {
    initialEquity: DEFAULT_SANDBOX_EQUITY,
    availableBalance: DEFAULT_SANDBOX_EQUITY,
    positions: [],
    openOrders: [],
    realizedPnl: 0,
    updatedAt: Date.now(),
  };
  return memorySandboxState;
}

/**
 * Calculates current aggregate portfolio overview for Sandbox Mode.
 */
export function getSandboxAccountOverview(): BitgetAccountOverview {
  const state = memorySandboxState;

  let totalMargin = 0;
  let totalUnrealizedPnl = 0;
  let totalPositionNotional = 0;

  for (const pos of state.positions) {
    const margin = parseFloat(pos.margin || '0');
    const uPnl = parseFloat(pos.unrealisedPnl || '0');
    const size = parseFloat(pos.total || '0');
    const mark = parseFloat(pos.markPrice || pos.avgPrice || '0');
    const notional = size * mark;

    totalMargin += isNaN(margin) ? 0 : margin;
    totalUnrealizedPnl += isNaN(uPnl) ? 0 : uPnl;
    totalPositionNotional += isNaN(notional) ? 0 : notional;
  }

  const totalEquity = state.availableBalance + totalMargin + totalUnrealizedPnl;
  const maintenanceMargin = totalMargin * 0.5;
  const mmr = totalEquity > 0 ? (maintenanceMargin / totalEquity) * 100 : 0;

  return {
    totalEquityUsdt: totalEquity,
    usdtEquityUsdt: totalEquity,
    availableEquityUsdt: state.availableBalance,
    unrealizedPnlUsdt: totalUnrealizedPnl,
    marginRatioPercent: mmr,
    positionMgnRatioPercent: totalEquity > 0 ? (totalMargin / totalEquity) * 100 : 0,
    accountMode: 'unified',
    accountLevel: 'advanced',
    holdMode: 'hedge_mode',
    positionValueUsdt: totalPositionNotional,
    positions: state.positions,
    assets: [
      {
        coin: 'USDT',
        equity: totalEquity,
        usdValue: totalEquity,
        balance: totalEquity,
        available: state.availableBalance,
        locked: totalMargin,
      },
    ],
  };
}

/**
 * Retrieves working orders and positions for the sandbox workbench.
 */
export function getSandboxOrdersAndPositions(): {
  positions: BitgetV3Position[];
  orders: BitgetV3OrderInfo[];
  timestamp: number;
} {
  return {
    positions: memorySandboxState.positions,
    orders: memorySandboxState.openOrders,
    timestamp: Date.now(),
  };
}

/**
 * Executes a paper trade order in Sandbox mode.
 */
export function executeSandboxOrder(params: BitgetV3OrderParams): {
  success: boolean;
  orderId: string;
  clientOid?: string;
  symbol: string;
  category: string;
  status: 'filled' | 'submitted';
  avgPrice: string;
  message: string;
} {
  const orderId = `sb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const sizeNum = parseFloat(params.size);
  const priceNum = params.price ? parseFloat(params.price) : 95000;
  const leverage = params.tradeSide === 'open' ? 10 : 1;
  const notional = sizeNum * priceNum;
  const requiredMargin = notional / leverage;

  const isBuy = params.side === 'buy';
  const posSide = isBuy ? 'long' : 'short';

  const fillPrice = priceNum.toString();
  const state = memorySandboxState;

  if (params.tradeSide === 'open' || !params.tradeSide) {
    if (state.availableBalance < requiredMargin) {
      state.availableBalance = Math.max(0, state.availableBalance);
    } else {
      state.availableBalance -= requiredMargin;
    }

    const existingIndex = state.positions.findIndex(
      (p) => p.symbol === params.symbol && p.posSide === posSide
    );

    if (existingIndex >= 0) {
      const existing = state.positions[existingIndex];
      const curSize = parseFloat(existing.total || '0');
      const curEntry = parseFloat(existing.avgPrice || fillPrice);
      const newTotal = curSize + sizeNum;
      const weightedEntry = (curSize * curEntry + sizeNum * priceNum) / newTotal;
      const newMargin = parseFloat(existing.margin || '0') + requiredMargin;

      state.positions[existingIndex] = {
        ...existing,
        total: newTotal.toString(),
        available: newTotal.toString(),
        avgPrice: weightedEntry.toFixed(4),
        margin: newMargin.toFixed(2),
        uTime: Date.now().toString(),
      };
    } else {
      const newPosition: BitgetV3Position = {
        symbol: params.symbol,
        posSide,
        holdSide: posSide,
        total: sizeNum.toString(),
        available: sizeNum.toString(),
        frozen: '0',
        avgPrice: priceNum.toString(),
        markPrice: priceNum.toString(),
        liquidationPrice: isBuy
          ? (priceNum * (1 - (1 / leverage) * 0.9)).toFixed(2)
          : (priceNum * (1 + (1 / leverage) * 0.9)).toFixed(2),
        leverage: leverage.toString(),
        margin: requiredMargin.toFixed(2),
        marginMode: 'crossed',
        mmr: '0.005',
        unrealisedPnl: '0.00',
        cTime: Date.now().toString(),
        uTime: Date.now().toString(),
      };
      state.positions.push(newPosition);
    }
  }

  state.updatedAt = Date.now();

  return {
    success: true,
    orderId,
    clientOid: params.clientOid,
    symbol: params.symbol,
    category: params.category || 'usdt-futures',
    status: 'filled',
    avgPrice: fillPrice,
    message: `[Sandbox] Order filled at $${fillPrice} (${params.side.toUpperCase()} ${params.size} ${params.symbol})`,
  };
}

/**
 * Closes an open position in Sandbox mode.
 */
export function closeSandboxPosition(
  symbol: string,
  side: 'buy' | 'sell',
  _size?: string
): {
  success: boolean;
  orderId: string;
  message: string;
} {
  const state = memorySandboxState;
  const targetPosSide = side === 'buy' ? 'short' : 'long';
  const posIndex = state.positions.findIndex(
    (p) => p.symbol === symbol && p.posSide === targetPosSide
  );

  if (posIndex === -1) {
    const anyIndex = state.positions.findIndex((p) => p.symbol === symbol);
    if (anyIndex !== -1) {
      const pos = state.positions[anyIndex];
      const margin = parseFloat(pos.margin || '0');
      const uPnl = parseFloat(pos.unrealisedPnl || '0');
      state.availableBalance += margin + uPnl;
      state.positions.splice(anyIndex, 1);
    }
  } else {
    const pos = state.positions[posIndex];
    const margin = parseFloat(pos.margin || '0');
    const uPnl = parseFloat(pos.unrealisedPnl || '0');
    state.availableBalance += margin + uPnl;
    state.positions.splice(posIndex, 1);
  }

  state.updatedAt = Date.now();
  const orderId = `sb_close_${Date.now()}`;

  return {
    success: true,
    orderId,
    message: `[Sandbox] Position closed successfully for ${symbol}.`,
  };
}

/**
 * Cancels a working order in Sandbox mode.
 */
export function cancelSandboxOrder(orderId?: string, symbol?: string): {
  success: boolean;
  message: string;
} {
  const state = memorySandboxState;
  if (orderId) {
    state.openOrders = state.openOrders.filter((o) => o.orderId !== orderId);
  } else if (symbol) {
    state.openOrders = state.openOrders.filter((o) => o.symbol !== symbol);
  }
  state.updatedAt = Date.now();
  return {
    success: true,
    message: `[Sandbox] Working order cancelled successfully.`,
  };
}
