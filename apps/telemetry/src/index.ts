import { ForzaUDPReceiver } from './udp/receiver.js';

const PORT = parseInt(process.env.FORZA_UDP_PORT || '5300', 10);
const HOST = process.env.FORZA_UDP_HOST || '0.0.0.0';

console.log('====================================================');
console.log(' 🏎️ FORZA FUEL OVERLAY - REAL-TIME TELEMETRY LOGGER');
console.log('====================================================');

const receiver = new ForzaUDPReceiver({
  port: PORT,
  host: HOST,
  formatted: true,
  prefix: 'FORZA-LIVE',
});

receiver.start();

// Handle graceful shutdown on CTRL+C
process.on('SIGINT', () => {
  console.log('\nClosing telemetry listener...');
  receiver.stop();
  process.exit(0);
});
