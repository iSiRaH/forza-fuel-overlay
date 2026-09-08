import { WebSocketServer, WebSocket } from 'ws';
import type { ForzaTelemetryData } from '../../../../packages/shared/src/types/telemetry.js';

export interface WebSocketServerOptions {
  port?: number;
}

export class TelemetryWebSocketServer {
  private wss: WebSocketServer | null = null;
  private port: number;
  private clients: Set<WebSocket> = new Set();

  constructor(options: WebSocketServerOptions = {}) {
    this.port = options.port || parseInt(process.env.FORZA_WS_PORT || '8080', 10);
  }

  public start(): void {
    if (this.wss) return;

    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.clients.add(ws);
      const clientIp = req.socket.remoteAddress || 'unknown';
      console.log(`🔌 Overlay client connected from ${clientIp} (Total clients: ${this.clients.size})`);

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`🔌 Overlay client disconnected (Remaining clients: ${this.clients.size})`);
      });

      ws.on('error', (err) => {
        console.error('⚠️ WebSocket Client Error:', err.message);
        this.clients.delete(ws);
      });
    });

    this.wss.on('listening', () => {
      console.log(`🚀 Telemetry WebSocket Server active on ws://localhost:${this.port}`);
    });

    this.wss.on('error', (err) => {
      console.error('❌ Telemetry WebSocket Server Error:', err.message);
    });
  }

  public broadcast(data: Partial<ForzaTelemetryData>): void {
    if (this.clients.size === 0) return;

    const payload = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public stop(): void {
    if (this.wss) {
      for (const client of this.clients) {
        client.close();
      }
      this.clients.clear();
      this.wss.close(() => {
        console.log('🛑 WebSocket server stopped.');
      });
      this.wss = null;
    }
  }
}
