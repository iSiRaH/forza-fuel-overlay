import { WebSocketServer, WebSocket } from 'ws';
import type { ForzaTelemetryData, TelemetryControlMessage } from '../../../../packages/shared/src/index.js';



export interface WebSocketServerOptions {
  port?: number;
  onControlMessage?: ((message: TelemetryControlMessage) => void) | undefined;
}

export class TelemetryWebSocketServer {
  private wss: WebSocketServer | null = null;
  private port: number;
  private clients: Set<WebSocket> = new Set();
  private onControlMessage?: ((message: TelemetryControlMessage) => void) | undefined;

  constructor(options: WebSocketServerOptions = {}) {
    this.port = options.port || parseInt(process.env.FORZA_WS_PORT || '8080', 10);
    this.onControlMessage = options.onControlMessage;
  }

  public setControlMessageHandler(handler: (message: TelemetryControlMessage) => void): void {
    this.onControlMessage = handler;
  }

  public start(): void {
    if (this.wss) return;

    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.clients.add(ws);
      const clientIp = req.socket.remoteAddress || 'unknown';
      console.log(`🔌 Overlay client connected from ${clientIp} (Total clients: ${this.clients.size})`);

      ws.on('message', (rawMsg) => {
        try {
          const parsed = JSON.parse(rawMsg.toString()) as TelemetryControlMessage;
          if (parsed && parsed.type && this.onControlMessage) {
            console.log(`📥 Received control command: ${parsed.type}`);
            this.onControlMessage(parsed);
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      });

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
