import dgram from 'node:dgram';
import { parseForzaTelemetryPacket } from '../parser/telemetryParser.js';
import { logTelemetryData, type LoggerOptions } from '../telemetry/telemetryLogger.js';

export interface UDPReceiverOptions {
  port?: number;
  host?: string;
  formatted?: boolean;
  prefix?: string;
  onData?: (data: ReturnType<typeof parseForzaTelemetryPacket>) => void;
}

export class ForzaUDPReceiver {
  private socket: dgram.Socket | null = null;
  private port: number;
  private host: string;
  private options: UDPReceiverOptions;

  constructor(options: UDPReceiverOptions = {}) {
    this.port = options.port || 5300;
    this.host = options.host || '0.0.0.0';
    this.options = options;
  }

  public start(): void {
    if (this.socket) {
      console.log('⚠️ UDP receiver is already running.');
      return;
    }

    this.socket = dgram.createSocket('udp4');

    this.socket.on('error', (err) => {
      console.error('❌ UDP Socket Error:', err.message);
    });

    this.socket.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
      try {
        const telemetry = parseForzaTelemetryPacket(msg);

        // Optional custom data callback
        if (this.options.onData) {
          this.options.onData(telemetry);
        }

        // Log real-time telemetry to console output
        logTelemetryData(telemetry, {
          formatted: this.options.formatted ?? true,
          prefix: this.options.prefix || `LIVE-${rinfo.address}`,
        });
      } catch (err) {
        if (err instanceof Error) {
          console.error(`⚠️ Failed to parse packet from ${rinfo.address}:${rinfo.port}:`, err.message);
        }
      }
    });

    this.socket.on('listening', () => {
      if (!this.socket) return;
      const address = this.socket.address();
      console.log(`📡 Real-time Forza UDP Telemetry Listener active on ${address.address}:${address.port}`);
      console.log(`🏎️ Waiting for live in-game data from Forza Horizon 6 / Forza Motorsport...`);
    });

    this.socket.bind(this.port, this.host);
  }

  public stop(): void {
    if (this.socket) {
      this.socket.close(() => {
        console.log('🛑 UDP telemetry listener stopped.');
      });
      this.socket = null;
    }
  }
}
