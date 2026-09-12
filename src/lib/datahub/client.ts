const DATAHUB_MCP_BASE = 'https://datahub.noxiaohao.com/mcp';

/**
 * Helper to call DataHub MCP JSON-RPC tool via SSE stream with fast timeout
 */
export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<Record<string, unknown> | null> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };

    // Initialize session
    const initRes = await fetch(DATAHUB_MCP_BASE, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'sterling', version: '1.0.0' },
        },
      }),
      signal: AbortSignal.timeout(3500),
    });

    const sessionId = initRes.headers.get('mcp-session-id') || '';

    // Call tool
    const callRes = await fetch(DATAHUB_MCP_BASE, {
      method: 'POST',
      headers: { ...headers, ...(sessionId ? { 'mcp-session-id': sessionId } : {}) },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      }),
      signal: AbortSignal.timeout(4500),
    });

    const reader = callRes.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder();
    let text = '';

    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (chunk.value) {
        text += decoder.decode(chunk.value, { stream: true });
        if (text.includes('data: {')) break;
      }
    }
    reader.cancel();

    const dataLine = text.split('\n').find((l) => l.startsWith('data: '));
    if (dataLine) {
      const parsed = JSON.parse(dataLine.slice(6)) as {
        result?: { content?: Array<{ type: string; text?: string }> };
      };
      const textContent = parsed.result?.content?.[0]?.text;
      if (textContent) {
        return JSON.parse(textContent) as Record<string, unknown>;
      }
    }
    return null;
  } catch {
    return null;
  }
}
