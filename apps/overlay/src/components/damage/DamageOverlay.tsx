import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTelemetry } from '../../hooks/useTelemetry';
import { calculateDamage } from '../../utils/damage-calculator';
import { DamageStatusBanner } from './DamageStatusBanner';
import { ComponentDamageList } from './ComponentDamageList';
import { CompactDamageHUD } from './CompactDamageHUD';
import { DamageSettingsModal, type DamageSettings } from './DamageSettingsModal';
import './DamageOverlay.css';

const SETTINGS_STORAGE_KEY = 'forza_damage_settings';

const DEFAULT_SETTINGS: DamageSettings = {
  isCompact: false,
  opacity: 0.95,
  scale: 1.0,
  isClickThrough: false,
};

export const DamageOverlay: React.FC = () => {
  const { telemetry, isConnected } = useTelemetry();

  // Load persisted settings
  const [settings, setSettings] = useState<DamageSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // localStorage fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Persist settings whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Interpret damage state purely and deterministically with active tracking fallback
  const damageSummary = useMemo(() => {
    return calculateDamage(telemetry, isConnected, { enableClientFallback: true });
  }, [telemetry, isConnected]);

  // Global hotkey 'C' listener to toggle between compact and expanded HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        setSettings((prev) => ({ ...prev, isCompact: !prev.isCompact }));
      } else if (e.key === 'Escape' && isSettingsOpen) {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen]);

  // Mouse hover events to support interactive buttons and click-through
  const handleMouseEnter = useCallback(() => {
    if (!settings.isClickThrough) {
      window.electronAPI?.setIgnoreMouseEvents(false);
    }
  }, [settings.isClickThrough]);

  const handleResetPosition = () => {
    window.electronAPI?.resetDamagePosition?.();
  };

  const handleClose = () => {
    if (window.electronAPI?.hideDamageOverlay) {
      window.electronAPI.hideDamageOverlay();
    } else if (window.electronAPI?.closeCurrentWindow) {
      window.electronAPI.closeCurrentWindow();
    }
  };

  const rootStyle: React.CSSProperties = {
    opacity: settings.opacity,
    transform: `scale(${settings.scale})`,
    transformOrigin: 'top right',
  };

  if (settings.isCompact) {
    return (
      <div
        className="damage-compact-wrapper"
        onMouseEnter={handleMouseEnter}
        style={rootStyle}
      >
        <CompactDamageHUD
          summary={damageSummary}
          onExpand={() => setSettings((prev) => ({ ...prev, isCompact: false }))}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        {isSettingsOpen && (
          <DamageSettingsModal
            settings={settings}
            onUpdate={setSettings}
            onClose={() => setIsSettingsOpen(false)}
            onResetPosition={handleResetPosition}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="damage-overlay-root"
      onMouseEnter={handleMouseEnter}
      style={rootStyle}
    >
      {/* Titlebar Header */}
      <header className="dmg-header">
        <div className="dmg-header-left">
          <span className="dmg-title-icon">🏎️</span>
          <span className="dmg-title">Simulation Damage</span>
          <span className={`dmg-status-dot ${!isConnected ? 'offline' : ''}`} />
        </div>

        <div className="dmg-header-actions">
          <button
            className="dmg-icon-btn"
            onClick={() => setSettings((prev) => ({ ...prev, isCompact: true }))}
            title="Compact Mode (C)"
          >
            ⤓
          </button>
          <button
            className="dmg-icon-btn"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            title="Settings"
          >
            ⚙
          </button>
          <button
            className="dmg-icon-btn"
            onClick={handleClose}
            title="Hide Window"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Main Content */}
      <DamageStatusBanner summary={damageSummary} isConnected={isConnected} />
      <ComponentDamageList summary={damageSummary} />

      {/* In-Overlay Settings Modal */}
      {isSettingsOpen && (
        <DamageSettingsModal
          settings={settings}
          onUpdate={setSettings}
          onClose={() => setIsSettingsOpen(false)}
          onResetPosition={handleResetPosition}
        />
      )}
    </div>
  );
};

export default DamageOverlay;
