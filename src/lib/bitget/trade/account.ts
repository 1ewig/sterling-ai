import { BITGET_REST_BASE } from '../rest';
import { getAuthHeaders } from '../auth/signer';
import { classifyBitgetError } from '../auth/errors';
import { getPositionsV3 } from './positions';
import type { BitgetAccountOverview } from '../types';

/**
 * Fetch Trading Account Overview (Equity, Margin, Positions) across Unified & Classic Modes
 */
export async function getAccountOverviewV3(): Promise<BitgetAccountOverview> {
  const settingsPath = '/api/v3/account/settings';
  const assetsPath = '/api/v3/account/assets';

  try {
    const [settingsHeaders, assetsHeaders] = [
      getAuthHeaders('GET', settingsPath),
      getAuthHeaders('GET', assetsPath, 'category=USDT-FUTURES'),
    ];

    const [settingsRes, assetsRes, positions] = await Promise.all([
      fetch(`${BITGET_REST_BASE}${settingsPath}`, { method: 'GET', headers: settingsHeaders }),
      fetch(`${BITGET_REST_BASE}${assetsPath}?category=USDT-FUTURES`, { method: 'GET', headers: assetsHeaders }),
      getPositionsV3('USDT-FUTURES'),
    ]);

    const settingsJson = (await settingsRes.json()) as {
      code: string;
      msg?: string;
      data?: { accountMode?: string };
    };

    // If Unified Account (UTA) is supported:
    if (settingsJson.code === '00000' || settingsJson.code === '0') {
      let totalEquity = 0;
      let availableEquity = 0;
      let unrealizedPnl = 0;

      if (assetsRes.ok) {
        try {
          const assetsJson = (await assetsRes.json()) as {
            code: string;
            data?: Array<{
              coin?: string;
              equity?: string;
              available?: string;
              unrealizedPL?: string;
              usdtEquity?: string;
            }>;
          };
          if ((assetsJson.code === '00000' || assetsJson.code === '0') && assetsJson.data) {
            for (const asset of assetsJson.data) {
              totalEquity += parseFloat(asset.equity || asset.usdtEquity || '0');
              availableEquity += parseFloat(asset.available || '0');
            }
          }
        } catch {
          // Fall through to positions rollup
        }
      }

      for (const pos of positions) {
        unrealizedPnl += parseFloat(pos.unrealizedPL || '0');
      }

      return {
        totalEquityUsdt: parseFloat(totalEquity.toFixed(2)),
        availableEquityUsdt: parseFloat(availableEquity.toFixed(2)),
        unrealizedPnlUsdt: parseFloat(unrealizedPnl.toFixed(2)),
        marginRatioPercent: 0,
        accountMode: (settingsJson.data?.accountMode as 'basic' | 'advanced' | 'isolated') || 'advanced',
        positions,
      };
    }

    // Classic Account Mode (40084 or 40404)
    if (settingsJson.code === '40084' || settingsJson.code === '40404') {
      const [mixRes, spotRes] = await Promise.all([
        fetch(`${BITGET_REST_BASE}/api/v2/mix/account/accounts?productType=USDT-FUTURES`, {
          method: 'GET',
          headers: getAuthHeaders('GET', '/api/v2/mix/account/accounts', 'productType=USDT-FUTURES'),
        }),
        fetch(`${BITGET_REST_BASE}/api/v2/spot/account/assets`, {
          method: 'GET',
          headers: getAuthHeaders('GET', '/api/v2/spot/account/assets'),
        }),
      ]);

      let totalEquity = 0;
      let availableEquity = 0;
      let unrealizedPnl = 0;

      if (mixRes.ok) {
        try {
          const mixJson = (await mixRes.json()) as {
            code: string;
            data?: Array<{
              usdtEquity?: string;
              available?: string;
              unrealizedPL?: string;
            }>;
          };
          if (mixJson.data && mixJson.data.length > 0) {
            for (const acc of mixJson.data) {
              totalEquity += parseFloat(acc.usdtEquity || '0');
              availableEquity += parseFloat(acc.available || '0');
              unrealizedPnl += parseFloat(acc.unrealizedPL || '0');
            }
          }
        } catch {
          // Fall through
        }
      }

      if (spotRes.ok) {
        try {
          const spotJson = (await spotRes.json()) as {
            code: string;
            data?: Array<{
              coin?: string;
              available?: string;
              locked?: string;
            }>;
          };
          if (spotJson.data && spotJson.data.length > 0) {
            for (const asset of spotJson.data) {
              if (asset.coin === 'USDT' || asset.coin === 'USDC') {
                const amount = parseFloat(asset.available || '0') + parseFloat(asset.locked || '0');
                totalEquity += amount;
                availableEquity += parseFloat(asset.available || '0');
              }
            }
          }
        } catch {
          // Fall through
        }
      }

      for (const pos of positions) {
        unrealizedPnl += parseFloat(pos.unrealizedPL || '0');
      }

      return {
        totalEquityUsdt: parseFloat(totalEquity.toFixed(2)),
        availableEquityUsdt: parseFloat(availableEquity.toFixed(2)),
        unrealizedPnlUsdt: parseFloat(unrealizedPnl.toFixed(2)),
        marginRatioPercent: 0,
        accountMode: 'basic',
        positions,
      };
    }

    const err = classifyBitgetError(settingsJson.code, settingsJson.msg);
    throw new Error(`Bitget Account Settings failed [${settingsJson.code}]: ${err.message}. ${err.actionableGuidance}`);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Failed to retrieve Bitget Account Overview: Unknown error');
  }
}
