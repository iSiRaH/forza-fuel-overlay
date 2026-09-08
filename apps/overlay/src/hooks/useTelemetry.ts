import { useState, useEffect, useCallback } from 'react';
import type { ForzaTelemetryData } from '../../../../packages/shared/src/types/telemetry.js';
import { mpsToKmh, mpsToMph, type SpeedUnit } from '../../../../packages/shared/src/utils/speed.js';

export interface UseTelemetryOptions {
  wsUrl?: string;
  defaultUnit?: SpeedUnit;
}

export function useTelemetry(options: UseTelemetryOptions = {}) {
  const wsUrl = options.wsUrl || 'ws://localhost:8080';
  const [telemetry, setTelemetry] = useState<Partial<ForzaTelemetryData> | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>(options.defaultUnit || 'kmh');

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isMounted) {
            setIsConnected(true);
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data) as Partial<ForzaTelemetryData>;
            setTelemetry(data);
          } catch (e) {
            console.error('Failed to parse WS telemetry message:', e);
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsConnected(false);
            // Attempt reconnect after 2 seconds
            reconnectTimeout = setTimeout(connect, 2000);
          }
        };

        ws.onerror = () => {
          if (isMounted) {
            setIsConnected(false);
          }
        };
      } catch (err) {
        if (isMounted) {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 2000);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [wsUrl]);

  const toggleSpeedUnit = useCallback(() => {
    setSpeedUnit((prev) => (prev === 'kmh' ? 'mph' : 'kmh'));
  }, []);

  const rawSpeedMps = telemetry?.speed ?? 0;
  const speedKmH = mpsToKmh(rawSpeedMps);
  const speedMph = mpsToMph(rawSpeedMps);
  const currentSpeed = speedUnit === 'kmh' ? speedKmH : speedMph;

  const currentRpm = telemetry?.currentEngineRpm ?? 0;
  const maxRpm = telemetry?.engineMaxRpm ?? 8000;
  const rpmPercent = Math.min(100, Math.max(0, (currentRpm / (maxRpm || 1)) * 100));
  const isShiftWarning = rpmPercent >= 90;

  const fuelRatio = telemetry?.fuel ?? 1.0;
  const fuelPct = fuelRatio * 100;
  const isFuelLow = fuelPct < 20;
  const isFuelCritical = fuelPct < 10;

  return {
    telemetry,
    isConnected,
    speedUnit,
    setSpeedUnit,
    toggleSpeedUnit,
    currentSpeed,
    speedKmH,
    speedMph,
    rpmPercent,
    currentRpm,
    maxRpm,
    isShiftWarning,
    fuelRatio,
    fuelPct,
    isFuelLow,
    isFuelCritical,
  };
}
