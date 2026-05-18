import { describe, it, expect, vi } from 'vitest';
import { createHealthHandler } from '../../../handlers/health.js';
import type { HealthResponse } from '../../../handlers/health.js';

const mockJson = (body: Record<string, unknown>): string => JSON.stringify(body);

const makeReq = (url: string, method: string = 'GET') =>
  ({ url, method } as unknown as import('http').IncomingMessage);

const makeRes = () => {
  const chunks: Buffer[] = [];
  return {
    _getData: () => Buffer.concat(chunks).toString(),
    writeHead: vi.fn(),
    end: vi.fn((chunk?: unknown) => {
      if (chunk) chunks.push(Buffer.from(String(chunk)));
    }),
  } as unknown as import('http').ServerResponse & { _getData: () => string };
};

describe('Health Handler', () => {
  it('should return 200 with health status on GET /health', () => {
    const handler = createHealthHandler();
    const req = makeReq('/health');
    const res = makeRes();

    const handled = handler(req, res);

    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'application/json',
    });
    expect(res.end).toHaveBeenCalledOnce();
  });

  it('should include uptime and timestamp in response', () => {
    const handler = createHealthHandler();
    const req = makeReq('/health');
    const res = makeRes();

    handler(req, res);

    const call = (res.end as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const body: HealthResponse = JSON.parse(call);

    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(() => new Date(body.timestamp)).not.toThrow();
  });

  it('should return false for non-health paths', () => {
    const handler = createHealthHandler();
    const req = makeReq('/api/users');
    const res = makeRes();

    const handled = handler(req, res);

    expect(handled).toBe(false);
    expect(res.writeHead).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  it('should return false for POST /health', () => {
    const handler = createHealthHandler();
    const req = makeReq('/health', 'POST');
    const res = makeRes();

    const handled = handler(req, res);

    expect(handled).toBe(false);
  });

  it('should return valid JSON content-type', () => {
    const handler = createHealthHandler();
    const req = makeReq('/health');
    const res = makeRes();

    handler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'application/json',
    });
  });
});
