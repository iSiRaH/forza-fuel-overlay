import { useState, useEffect, useCallback, useRef } from 'react';
import type { ForzaTelemetryData } from '../../../../packages/shared/src/types/telemetry.js';
import type { TelemetryControlMessage } from '../../../../packages/shared/src/types/fuel.js';
import { mpsToKmh, mpsToMph, type SpeedUnit } from '../../../../packages/shared/src/utils/speed.js';

export interface UseTelemetryOptions {
  wsUrl?: string;
  defaultUnit?: SpeedUnit;
}

export function useTelemetry(options: UseTelemetryOptions = {}) {
  const wsUrl = options.wsUrl || (import.meta.env.VITE_WS_URL as string | undefined) || 'ws://localhost:8080';
  const [telemetry, setTelemetry] = useState<Partial<ForzaTelemetryData> | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>(options.defaultUnit || 'kmh');
  
  // Fuel Tank Size configuration state (defaults to 60L or persisted value)
  const [tankCapacityLiters, setTankCapacityLiters] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('forza_tank_capacity');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 5) return Math.round(val / 5) * 5;
      }
    } catch {
      // localStorage fallback
    }
    return 60;
  });

  const [isFuelTaskPaused, setIsFuelTaskPaused] = useState<boolean>(false);
  const [showEmptyModal, setShowEmptyModal] = useState<boolean>(false);
  const [hasDismissedEmptyModal, setHasDismissedEmptyModal] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  const sendControlMessage = useCallback((msg: TelemetryControlMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

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
            // Sync initial tank capacity setting to telemetry server on connect
            ws.send(JSON.stringify({
              type: 'SET_TANK_CAPACITY',
              payload: { capacityLiters: tankCapacityLiters },
            }));
            if (isFuelTaskPaused) {
              ws.send(JSON.stringify({
                type: 'SET_PAUSED',
                payload: { isPaused: true },
              }));
            }
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data) as Partial<ForzaTelemetryData>;
            setTelemetry(data);
            const liters = data.currentFuelLiters ?? (data.fuel ? data.fuel * 60 : 60);
            if (liters <= 0.001) {
              setShowEmptyModal(true);
            } else if (liters > 0.05) {
              setHasDismissedEmptyModal(false);
              setShowEmptyModal(false);
            }
          } catch {
            console.error('Failed to parse WS telemetry message');
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
      } catch {
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
  }, [wsUrl, tankCapacityLiters, isFuelTaskPaused]);

  const toggleSpeedUnit = useCallback(() => {
    setSpeedUnit((prev) => (prev === 'kmh' ? 'mph' : 'kmh'));
  }, []);

  const updateTankCapacity = useCallback((newCapacity: number) => {
    const valid = Math.max(5, Math.round(newCapacity / 5) * 5);
    setTankCapacityLiters(valid);
    try {
      localStorage.setItem('forza_tank_capacity', valid.toString());
    } catch {
      // ignore
    }
    sendControlMessage({ type: 'SET_TANK_CAPACITY', payload: { capacityLiters: valid } });
  }, [sendControlMessage]);

  const increaseTankCapacity = useCallback(() => {
    updateTankCapacity(tankCapacityLiters + 5);
  }, [tankCapacityLiters, updateTankCapacity]);

  const decreaseTankCapacity = useCallback(() => {
    updateTankCapacity(tankCapacityLiters - 5);
  }, [tankCapacityLiters, updateTankCapacity]);

  const togglePauseFuelTask = useCallback(() => {
    setIsFuelTaskPaused((prev) => {
      const nextState = !prev;
      sendControlMessage({ type: 'SET_PAUSED', payload: { isPaused: nextState } });
      return nextState;
    });
  }, [sendControlMessage]);

  const dismissEmptyModal = useCallback(() => {
    setHasDismissedEmptyModal(true);
    setShowEmptyModal(false);
  }, []);

  const refillFuel = useCallback(() => {
    sendControlMessage({ type: 'REFILL_FUEL' });
    setHasDismissedEmptyModal(false);
    setShowEmptyModal(false);

    setTelemetry((prev) => {
      if (!prev) return null;
      const maxCap = tankCapacityLiters || prev.maxFuelCapacityLiters || 60;
      return {
        ...prev,
        fuel: 1.0,
        currentFuelLiters: maxCap,
        fuelSpentLiters: 0,
      };
    });
  }, [sendControlMessage, tankCapacityLiters]);

  const rawSpeedMps = telemetry?.speed ?? 0;
  const speedKmH = mpsToKmh(rawSpeedMps);
  const speedMph = mpsToMph(rawSpeedMps);
  const currentSpeed = speedUnit === 'kmh' ? speedKmH : speedMph;

  const currentRpm = telemetry?.currentEngineRpm ?? 0;
  const maxRpm = telemetry?.engineMaxRpm ?? 8000;
  const rpmPercent = Math.min(100, Math.max(0, (currentRpm / (maxRpm || 1)) * 100));
  const isShiftWarning = rpmPercent >= 90;

  const fuelRatio = telemetry?.fuel ?? 1.0;
  const fuelPct = Math.max(0, Math.min(100, fuelRatio * 100));
  const isFuelLow = fuelPct < 20;
  const isFuelCritical = fuelPct < 10;

  const maxFuelCapacityLiters = telemetry?.maxFuelCapacityLiters ?? tankCapacityLiters;
  const currentFuelLiters = telemetry?.currentFuelLiters ?? (fuelRatio * maxFuelCapacityLiters);
  const fuelSpentLiters = telemetry?.fuelSpentLiters ?? 0;
  const engineDisplacementLiters = telemetry?.engineDisplacementLiters ?? 3.0;
  const fuelConsumptionRate = telemetry?.fuelConsumptionRate ?? 0;

  const isModalOpen = showEmptyModal && !hasDismissedEmptyModal;

  const carName = telemetry?.carName ?? (telemetry?.carOrdinal ? `Forza Car #${telemetry.carOrdinal}` : '---');
  const piClassName = telemetry?.piClassName ?? 'S1';
  const piRating = telemetry?.piRating ?? (telemetry?.carPerformanceIndex ?? 800);
  const piBadgeColor = telemetry?.piBadgeColor ?? '#ffffff';
  const piBadgeBg = telemetry?.piBadgeBg ?? 'linear-gradient(135deg, #6600cc, #b84dff)';
  const carOrdinal = telemetry?.carOrdinal ?? 0;

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
    carName,
    piClassName,
    piRating,
    piBadgeColor,
    piBadgeBg,
    carOrdinal,
    // Fuel enhancements state & actions
    tankCapacityLiters,
    increaseTankCapacity,
    decreaseTankCapacity,
    updateTankCapacity,
    isFuelTaskPaused,
    togglePauseFuelTask,
    showEmptyModal: isModalOpen,
    dismissEmptyModal,
  };
}
