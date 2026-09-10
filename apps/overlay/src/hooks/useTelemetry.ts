import { useState, useEffect, useCallback, useRef } from 'react';
import type { ForzaTelemetryData } from '../../../../packages/shared/src/types/telemetry.js';
import type { TelemetryControlMessage } from '../../../../packages/shared/src/types/fuel.js';
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
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

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
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [wsUrl]);

  const toggleSpeedUnit = useCallback(() => {
    setSpeedUnit((prev) => (prev === 'kmh' ? 'mph' : 'kmh'));
  }, []);

  const refillFuel = useCallback(() => {
    // Send REFILL_FUEL command over WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: TelemetryControlMessage = { type: 'REFILL_FUEL' };
      wsRef.current.send(JSON.stringify(msg));
    }

    // Optimistic local telemetry update
    setTelemetry((prev) => {
      if (!prev) return null;
      const maxCap = prev.maxFuelCapacityLiters ?? 60;
      return {
        ...prev,
        fuel: 1.0,
        currentFuelLiters: maxCap,
        fuelSpentLiters: 0,
      };
    });
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

  const maxFuelCapacityLiters = telemetry?.maxFuelCapacityLiters ?? 60;
  const currentFuelLiters = telemetry?.currentFuelLiters ?? (fuelRatio * maxFuelCapacityLiters);
  const fuelSpentLiters = telemetry?.fuelSpentLiters ?? 0;
  const engineDisplacementLiters = telemetry?.engineDisplacementLiters ?? 3.0;
  const fuelConsumptionRate = telemetry?.fuelConsumptionRate ?? 0;

  return {
    telemetry,
    isConnected,
    speedUnit,
    setSpeedUnit,
    toggleSpeedUnit,
    refillFuel,
    currentSpeed,
    speedKmH,
    speedMph,
    rpmPercent,
    currentRpm,
    maxRpm,
    isShiftWarning,
    fuelRatio,
    fuelPct,
    maxFuelCapacityLiters,
    currentFuelLiters,
    fuelSpentLiters,
    engineDisplacementLiters,
    fuelConsumptionRate,
    isFuelLow,
    isFuelCritical,
  };
}

