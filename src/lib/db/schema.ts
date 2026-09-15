import Dexie, { type EntityTable } from 'dexie';
import type {
  ExecutedToolCall,
  AgentExecutionStep,
  MessageRole,
} from '@/agent/types';

export type ChatMessageStatus = 'success' | 'error' | 'pending';

export interface ConversationRecord {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status?: ChatMessageStatus;
  followUpQuestions?: string[];
  toolCalls?: ExecutedToolCall[];
  steps?: AgentExecutionStep[];
  stepCount?: number;
  workedDurationMs?: number;
  timestamp: number;
}

export interface MarketSymbolRecord {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  volume24h: number;
  hasSpot?: boolean;
  hasFutures: boolean;
  updatedAt: number;
}

export interface InstrumentRecord {
  symbol: string;
  category: string;
  baseCoin: string;
  quoteCoin: string;
  minTradeNum: string;
  pricePlace: string;
  volumePlace: string;
  priceMultiplier?: string;
  quantityMultiplier?: string;
  minTradeUSDT?: string;
  maxMarketOrderQty?: string;
  maxLeverage?: string;
  status: string;
  buyLimitPriceRatio?: string;
  sellLimitPriceRatio?: string;
  updatedAt: number;
}

export type StagedActionType = 'order' | 'cancel' | 'close';
export type StagedActionStatus =
  | 'staged'
  | 'executing'
  | 'executed'
  | 'cancelled'
  | 'expired';

export interface StagedActionRecord {
  id: string;
  conversationId?: string;
  messageId?: string;
  actionType: StagedActionType;
  symbol: string;
  category: string;
  // Tokens
  ticketToken?: string;
  actionToken?: string;
  // Order specific
  side?: 'buy' | 'sell';
  orderType?: 'limit' | 'market';
  size?: number;
  price?: number;
  tradeSide?: string;
  leverage?: number;
  notionalUsdt?: number;
  initialMarginUsdt?: number;
  estimatedLiquidation?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  riskRewardRatio?: string;
  // Cancel / Close specific
  orderId?: string;
  clientOid?: string;
  cancelAll?: boolean;
  action?: 'cancel_order' | 'cancel_symbol' | 'close_position';
  closeSide?: 'buy' | 'sell';
  closeSize?: string;
  totalPositionSize?: number;
  sizePercent?: number;
  posSide?: 'long' | 'short' | 'net';
  holdMode?: string;
  marginMode?: 'crossed' | 'isolated';
  unrealizedPnl?: string;
  markPrice?: string;
  // Metadata & Narrative
  summary?: string;
  rationale?: string;
  actionableGuidance?: string;
  // Timestamps & Lifecycle
  createdAt: number;
  expiresAt: number;
  status: StagedActionStatus;
  // Execution Output
  orderIdResult?: string;
  executedAt?: number;
  executionError?: string;
}

export const MAX_MESSAGES_PER_CONVERSATION = 100;
export const DEFAULT_CONVERSATION_ID = 'default';

export const DEFAULT_CONVERSATION_TITLE = 'New Chat';

/**
 * Institutional Dexie IndexedDB Database for Sterling multi-session chat history, market symbols, and staged actions.
 */
const CONVERSATION_INDEX = 'id, createdAt, updatedAt';
const MESSAGE_INDEX = 'id, conversationId, timestamp, role, status';
const MARKET_SYMBOL_INDEX = 'symbol, baseAsset, volume24h, updatedAt';
const INSTRUMENT_INDEX = 'symbol, category, status, updatedAt';
const STAGED_ACTION_INDEX = 'id, conversationId, messageId, actionType, symbol, status, expiresAt, createdAt, [conversationId+status]';

export class SterlingDatabase extends Dexie {
  conversations!: EntityTable<ConversationRecord, 'id'>;
  messages!: EntityTable<ChatMessageRecord, 'id'>;
  market_symbols!: EntityTable<MarketSymbolRecord, 'symbol'>;
  instruments!: EntityTable<InstrumentRecord, 'symbol'>;
  staged_actions!: EntityTable<StagedActionRecord, 'id'>;

  constructor() {
    super('SterlingDatabase');

    // Schema v1: Flat messages
    this.version(1).stores({
      messages: 'id, timestamp, role',
    });

    // Schema v2: Multi-conversation threads
    this.version(2).stores({
      conversations: CONVERSATION_INDEX,
      messages: MESSAGE_INDEX,
    }).upgrade(async (tx) => {
      const messagesTable = tx.table('messages');
      await messagesTable.toCollection().modify((msg) => {
        if (!msg.conversationId) {
          msg.conversationId = DEFAULT_CONVERSATION_ID;
        }
        if (!msg.status) {
          msg.status = 'success';
        }
      });
    });

    // Schema v3: Multi-conversation threads stable schema
    this.version(3).stores({
      conversations: CONVERSATION_INDEX,
      messages: MESSAGE_INDEX,
    });

    // Schema v4: Cached market symbols
    this.version(4).stores({
      conversations: CONVERSATION_INDEX,
      messages: MESSAGE_INDEX,
      market_symbols: MARKET_SYMBOL_INDEX,
    });

    // Schema v5: Cached trading instruments & precision rules
    this.version(5).stores({
      conversations: CONVERSATION_INDEX,
      messages: MESSAGE_INDEX,
      market_symbols: MARKET_SYMBOL_INDEX,
      instruments: INSTRUMENT_INDEX,
    });

    // Schema v6: Staged trade tickets and action lifecycle persistence
    this.version(6).stores({
      conversations: CONVERSATION_INDEX,
      messages: MESSAGE_INDEX,
      market_symbols: MARKET_SYMBOL_INDEX,
      instruments: INSTRUMENT_INDEX,
      staged_actions: STAGED_ACTION_INDEX,
    });
  }
}

export const db = new SterlingDatabase();
