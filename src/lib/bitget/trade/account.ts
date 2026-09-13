import { BITGET_REST_BASE } from '../rest';
import { getAuthHeaders } from '../auth/signer';
import { classifyBitgetError } from '../auth/errors';
import { getPositionsV3 } from './positions';
import { toV3Category, type BitgetAccountOverview } from '../types';

/**
 * Fetch Trading Account Overview (Equity, Margin, Positions) across Unified & Classic Modes
 */
export async function getAccountOverviewV3(
  categoryInput = 'USDT-FUTURES'
): Promise<BitgetAccountOverview> {
  const category = categoryInput === 'all' ? 'USDT-FUTURES' : toV3Category(categoryInput);
  const settingsPath = '/api/v3/account/settings';
  const assetsPath = '/api/v3/account/assets';
  const assetsQuery = `category=${category}`;

  try {
    const [settingsHeaders, assetsHeaders] = [
      getAuthHeaders('GET', settingsPath),
      getAuthHeaders('GET', assetsPath, assetsQuery),
    ];

    const [settingsRes, assetsRes, positions] = await Promise.all([
      fetch(`${BITGET_REST_BASE}${settingsPath}`, { method: 'GET', headers: settingsHeaders }),
      fetch(`${BITGET_REST_BASE}${assetsPath}?${assetsQuery}`, { method: 'GET', headers: assetsHeaders }),
      getPositionsV3(category),
    ]);

    const settingsJson = (await settingsRes.json()) as {
      code: string;
      msg?: string;
      data?: { accountMode?: string; accountLevel?: string };
    };

    // If Unified Account (UTA) is supported:
    if (settingsJson.code === '00000' || settingsJson.code === '0') {
      let totalEquity = 0;
      let availableEquity = 0;
      let unrealizedPnl = 0;
      let mgnRatio = 0;
      let effEquity = 0;
      let posValue = 0;

      if (assetsRes.ok) {
        try {
          const assetsJson = (await assetsRes.json()) as {
            code: string;
            data?: Record<string, unknown> | Array<{
              coin?: string;
              equity?: string;
              available?: string;
              unrealizedPL?: string;
              usdtEquity?: string;
            }>;
          };

          if ((assetsJson.code === '00000' || assetsJson.code === '0') && assetsJson.data) {
            if (Array.isArray(assetsJson.data)) {
              for (const asset of assetsJson.data) {
                totalEquity += parseFloat(asset.equity || asset.usdtEquity || '0');
                availableEquity += parseFloat(asset.available || '0');
              }
            } else if (typeof assetsJson.data === 'object') {
              const d = assetsJson.data;
              totalEquity = parseFloat(String(d.accountEquity || d.effEquity || '0'));
              effEquity = parseFloat(String(d.effEquity || '0'));
              availableEquity = parseFloat(String(d.availableEquity || d.available || d.effEquity || '0'));
              unrealizedPnl = parseFloat(String(d.unrealisedPnl || d.unrealizedPL || '0'));
              mgnRatio = parseFloat(String(d.mgnRatio || d.mmr || '0'));
              posValue = parseFloat(String(d.positionValue || '0'));

              if (Array.isArray(d.assets) && totalEquity === 0) {
                for (const a of d.assets as Array<{ equity?: string; available?: string }>) {
                  totalEquity += parseFloat(a.equity || '0');
                  availableEquity += parseFloat(a.available || '0');
                }
              }
            }
          }
        } catch {
          // Fall through to positions rollup
        }
      }

      if (unrealizedPnl === 0) {
        for (const pos of positions) {
          unrealizedPnl += parseFloat(pos.unrealisedPnl || pos.unrealizedPL || '0');
        }
      }

      const accountLevel = settingsJson.data?.accountLevel || settingsJson.data?.accountMode || 'advanced';
      const accountMode = (['basic', 'advanced', 'isolated'].includes(accountLevel)
        ? accountLevel
        : 'advanced') as 'basic' | 'advanced' | 'isolated';

      return {
        totalEquityUsdt: parseFloat(totalEquity.toFixed(2)),
        availableEquityUsdt: parseFloat(availableEquity.toFixed(2)),
        unrealizedPnlUsdt: parseFloat(unrealizedPnl.toFixed(2)),
        marginRatioPercent: parseFloat((mgnRatio * 100).toFixed(2)),
        accountMode,
        accountLevel,
        effEquityUsdt: effEquity > 0 ? parseFloat(effEquity.toFixed(2)) : undefined,
        positionValueUsdt: posValue > 0 ? parseFloat(posValue.toFixed(2)) : undefined,
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
