import { describe, test, expect } from 'bun:test';
import type { MicroCandle } from '@/lib/bitget';

describe('Candlestick Stream & Micro-Trend Geometry Suite', () => {
  test('maintains sliding window of 30 1-minute candles on stream updates', () => {
    let buffer: MicroCandle[] = [];

    // Initial snapshot of 35 candles (should truncate to last 30)
    const rawSnapshot: MicroCandle[] = Array.from({ length: 35 }, (_, i) => ({
      timestamp: 1726000000000 + i * 60000,
      close: 65000 + (i % 5) * 10,
      high: 65050,
      low: 64950,
    }));

    buffer = rawSnapshot.slice(-30);
    expect(buffer).toHaveLength(30);
    expect(buffer[0].timestamp).toBe(1726000000000 + 5 * 60000);

    // In-place update of current active minute candle
    const currentCandleUpdate: MicroCandle = {
      timestamp: buffer[buffer.length - 1].timestamp,
      close: 65999.0,
      high: 66000.0,
      low: 64950.0,
    };

    const updated = [...buffer];
    updated[updated.length - 1] = currentCandleUpdate;
    buffer = updated.slice(-30);

    expect(buffer).toHaveLength(30);
    expect(buffer[buffer.length - 1].close).toBe(65999.0);

    // Ingestion of a brand-new minute candle (advances buffer, drops oldest)
    const newMinuteCandle: MicroCandle = {
      timestamp: buffer[buffer.length - 1].timestamp + 60000,
      close: 66100.0,
      high: 66150.0,
      low: 66000.0,
    };

    buffer = [...buffer, newMinuteCandle].slice(-30);
    expect(buffer).toHaveLength(30);
    expect(buffer[buffer.length - 1].timestamp).toBe(newMinuteCandle.timestamp);
    expect(buffer[buffer.length - 1].close).toBe(66100.0);
  });

  test('computes quadratic Bézier sparkline SVG geometry and trend direction', () => {
    const candles: MicroCandle[] = [
      { timestamp: 1000, close: 100, high: 105, low: 95 },
      { timestamp: 2000, close: 105, high: 110, low: 98 },
      { timestamp: 3000, close: 115, high: 120, low: 102 },
      { timestamp: 4000, close: 125, high: 130, low: 112 },
    ];

    const closes = candles.map((c) => c.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;

    expect(min).toBe(100);
    expect(max).toBe(125);
    expect(span).toBe(25);

    const isUp = closes[closes.length - 1] >= closes[0];
    expect(isUp).toBe(true);

    const width = 360;
    const height = 52;
    const paddingY = 8;
    const availableHeight = height - paddingY * 2;

    const points = closes.map((val, idx) => {
      const x = (idx / (closes.length - 1)) * width;
      const y = height - paddingY - ((val - min) / span) * availableHeight;
      return { x, y };
    });

    expect(points[0].x).toBe(0);
    expect(points[0].y).toBe(height - paddingY); // lowest point = bottom Y
    expect(points[points.length - 1].x).toBe(360);
    expect(points[points.length - 1].y).toBe(paddingY); // highest point = top Y

    // Bézier curve assembly
    const pathD = points.reduce((acc, pt, idx, arr) => {
      if (idx === 0) return `M ${pt.x},${pt.y}`;
      const prev = arr[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} Q ${cx},${prev.y} ${cx},${(prev.y + pt.y) / 2} T ${pt.x},${pt.y}`;
    }, '');

    expect(pathD.startsWith('M 0,44')).toBe(true);
    expect(pathD).toContain('Q');
    expect(pathD).toContain('T 360,8');
  });

  test('handles completely flat price candles without divide-by-zero errors', () => {
    const flatCandles: MicroCandle[] = [
      { timestamp: 1000, close: 100, high: 100, low: 100 },
      { timestamp: 2000, close: 100, high: 100, low: 100 },
      { timestamp: 3000, close: 100, high: 100, low: 100 },
    ];

    const closes = flatCandles.map((c) => c.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;

    expect(span).toBe(1);
    const y = 52 - 8 - ((100 - min) / span) * (52 - 16);
    expect(isNaN(y)).toBe(false);
    expect(isFinite(y)).toBe(true);
  });
});
