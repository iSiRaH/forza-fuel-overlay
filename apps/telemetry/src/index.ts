import { ForzaUDPReceiver } from './udp/receiver.js';
import { TelemetryWebSocketServer } from './websocket/websocketServer.js';
import { MockTelemetryGenerator } from './mock/mockGenerator.js';
import { globalFuelTracker } from './parser/telemetryParser.js';

const PORT = parseInt(process.env.FORZA_UDP_PORT || '5300', 10);
const HOST = process.env.FORZA_UDP_HOST || '0.0.0.0';
const WS_PORT = parseInt(process.env.FORZA_WS_PORT || '8080', 10);
const isMockMode = process.argv.includes('--mock') || process.env.MOCK_TELEMETRY === 'true';

console.log('====================================================');
console.log(' 🏎️ FORZA FUEL OVERLAY - REAL-TIME TELEMETRY LOGGER');
console.log(` Mode: ${isMockMode ? 'MOCK / SIMULATION 🧪' : 'LIVE UDP RECEIVER 📡'}`);
console.log('====================================================');

let receiver: ForzaUDPReceiver | null = null;
let mockGenerator: MockTelemetryGenerator | null = null;

// 1. Initialize WebSocket server for streaming telemetry to overlay UI
const wsServer = new TelemetryWebSocketServer({
  port: WS_PORT,
  onControlMessage: (msg) => {
    if (msg.type === 'REFILL_FUEL') {
      console.log('⛽ Refill fuel request received from client UI!');
      globalFuelTracker.refill(1.0);
      if (mockGenerator) {
        mockGenerator.refill();
      }
    } else if (msg.type === 'SET_TANK_CAPACITY') {
      const capacity = Number(msg.payload?.capacityLiters);
      if (!isNaN(capacity) && capacity > 0) {
        console.log(`⛽ Setting tank capacity to ${capacity} L...`);
        globalFuelTracker.setTankCapacity(capacity);
        if (mockGenerator) {
          mockGenerator.setTankCapacity(capacity);
        }
      }
    } else if (msg.type === 'SET_PAUSED') {
      const isPaused = Boolean(msg.payload?.isPaused);
      console.log(`⏸️ Fuel calculation pause toggled: ${isPaused}`);
      globalFuelTracker.setPaused(isPaused);
      if (mockGenerator) {
        mockGenerator.setPaused(isPaused);
      }
    }
  },
});
wsServer.start();


if (isMockMode) {
  // 2a. Start mock generator for test data stream
  mockGenerator = new MockTelemetryGenerator({
    intervalMs: 33,
    onData: (data) => {
      wsServer.broadcast(data);
    },
  });
  mockGenerator.start();
} else {
  // 2b. Start real UDP receiver for game telemetry stream
  receiver = new ForzaUDPReceiver({
    port: PORT,
    host: HOST,
    formatted: true,
    prefix: 'FORZA-LIVE',
    onData: (data) => {
      wsServer.broadcast(data);
    },
  });
  receiver.start();
}

// Handle graceful shutdown on CTRL+C or SIGTERM
const handleShutdown = () => {
  console.log('\nClosing telemetry service...');
  if (receiver) receiver.stop();
  if (mockGenerator) mockGenerator.stop();
  wsServer.stop();
  process.exit(0);
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
