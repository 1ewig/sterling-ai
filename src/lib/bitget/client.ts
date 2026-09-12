/**
 * Backwards-compatibility facade for Bitget client.
 * Re-exports symbol utilities, Bitget REST endpoints, domain analyst engines,
 * and the DataHub MCP client.
 */
export * from './symbols';
export * from './rest';
export * from './analysts';
export { callMcpTool } from '@/lib/datahub';
