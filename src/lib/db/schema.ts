import Dexie, { type EntityTable } from 'dexie';
import type {
  ExecutedToolCall,
  AgentExecutionStep,
} from '@/agent/types';

export interface ConversationRecord {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'success' | 'error' | 'pending';
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

export const MAX_MESSAGES_PER_CONVERSATION = 100;
export const DEFAULT_CONVERSATION_ID = 'default';

export const DEFAULT_CONVERSATION_TITLE = 'New Chat';

/**
 * Institutional Dexie IndexedDB Database for Sterling multi-session chat history and market symbol cache.
 */
export class SterlingDatabase extends Dexie {
  conversations!: EntityTable<ConversationRecord, 'id'>;
  messages!: EntityTable<ChatMessageRecord, 'id'>;
  market_symbols!: EntityTable<MarketSymbolRecord, 'symbol'>;
  instruments!: EntityTable<InstrumentRecord, 'symbol'>;

  constructor() {
    super('SterlingDatabase');

    // Schema v1: Flat messages
    this.version(1).stores({
      messages: 'id, timestamp, role',
    });

    // Schema v2: Multi-conversation threads
    this.version(2).stores({
      conversations: 'id, createdAt, updatedAt',
      messages: 'id, conversationId, timestamp, role, status',
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
      conversations: 'id, createdAt, updatedAt',
      messages: 'id, conversationId, timestamp, role, status',
    });

    // Schema v4: Cached market symbols
    this.version(4).stores({
      conversations: 'id, createdAt, updatedAt',
      messages: 'id, conversationId, timestamp, role, status',
      market_symbols: 'symbol, baseAsset, volume24h, updatedAt',
    });

    // Schema v5: Cached trading instruments & precision rules
    this.version(5).stores({
      conversations: 'id, createdAt, updatedAt',
      messages: 'id, conversationId, timestamp, role, status',
      market_symbols: 'symbol, baseAsset, volume24h, updatedAt',
      instruments: 'symbol, category, status, updatedAt',
    });
  }
}

export const db = new SterlingDatabase();
