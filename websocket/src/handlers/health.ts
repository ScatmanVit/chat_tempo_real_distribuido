import { IncomingMessage, ServerResponse } from 'http';

const startTime = Date.now();

export interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
}

const HEALTH_PATH = '/health';

export const createHealthHandler = () => {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    if (req.url !== HEALTH_PATH || req.method !== 'GET') {
      return false;
    }

    const body: HealthResponse = {
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
    return true;
  };
};
