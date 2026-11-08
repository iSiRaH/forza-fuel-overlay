import React from 'react';

export interface DamageSettings {
  isCompact: boolean;
  opacity: number;       // 0.5 - 1.0
  scale: number;         // 0.8 - 1.2
  isClickThrough: boolean;
  displayMode: 'damage' | 'condition'; // 'damage' matches Forza HUD (0% -> 100%), 'condition' shows health (100% -> 0%)
}

interface DamageSettingsModalProps {
  settings: DamageSettings;
  onUpdate: (updater: (prev: DamageSettings) => DamageSettings) => void;
  onClose: () => void;
  onResetPosition: () => void;
}

export const DamageSettingsModal: React.FC<DamageSettingsModalProps> = ({
  settings,
  onUpdate,
  onClose,
  onResetPosition,
}) => {
  return (
    <div className="dmg-settings-modal">
      <div className="dmg-settings-header">
        <span className="dmg-settings-title">⚙️ Damage Overlay Settings</span>
        <button className="dmg-icon-btn" onClick={onClose} title="Close settings">
          ✕
        </button>
      </div>

      {/* Mode selection */}
      <div className="dmg-setting-row">
        <span>Display Value Format</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={`dmg-icon-btn ${settings.displayMode === 'damage' ? 'active' : ''}`}
            onClick={() => onUpdate((prev) => ({ ...prev, displayMode: 'damage' }))}
            title="Shows Damage % (0% = Healthy, 100% = Destroyed) - Matches Forza In-Game HUD"
          >
            Damage % (In-Game)
          </button>
          <button
            className={`dmg-icon-btn ${settings.displayMode === 'condition' ? 'active' : ''}`}
            onClick={() => onUpdate((prev) => ({ ...prev, displayMode: 'condition' }))}
            title="Shows Health Remaining (100% = Healthy, 0% = Destroyed)"
          >
            Health %
          </button>
        </div>
      </div>

      {/* Mode selection */}
      <div className="dmg-setting-row">
        <span>Compact Mode</span>
        <button
          className={`dmg-icon-btn ${settings.isCompact ? 'active' : ''}`}
          onClick={() => onUpdate((prev) => ({ ...prev, isCompact: !prev.isCompact }))}
        >
          {settings.isCompact ? 'ON (Press C)' : 'OFF (Press C)'}
        </button>
      </div>

      {/* Click-through toggle */}
      <div className="dmg-setting-row">
        <span>Click-Through Mode</span>
        <button
          className={`dmg-icon-btn ${settings.isClickThrough ? 'active' : ''}`}
          onClick={() =>
            onUpdate((prev) => {
              const next = !prev.isClickThrough;
              window.electronAPI?.setIgnoreMouseEvents(next, { forward: true });
              return { ...prev, isClickThrough: next };
            })
          }
          title="When ON, clicks pass through window to the game"
        >
          {settings.isClickThrough ? '🔒 LOCKED' : '🔓 UNLOCKED'}
        </button>
      </div>

      {/* Opacity slider */}
      <div className="dmg-setting-row">
        <span>Opacity ({Math.round(settings.opacity * 100)}%)</span>
        <input
          type="range"
          className="dmg-slider"
          min="0.4"
          max="1.0"
          step="0.05"
          value={settings.opacity}
          onChange={(e) => {
            const opacity = parseFloat(e.target.value);
            onUpdate((prev) => ({ ...prev, opacity }));
          }}
        />
      </div>

      {/* Scale slider */}
      <div className="dmg-setting-row">
        <span>UI Scale ({Math.round(settings.scale * 100)}%)</span>
        <input
          type="range"
          className="dmg-slider"
          min="0.75"
          max="1.25"
          step="0.05"
          value={settings.scale}
          onChange={(e) => {
            const scale = parseFloat(e.target.value);
            onUpdate((prev) => ({ ...prev, scale }));
          }}
        />
      </div>

      {/* Screen position */}
      <div className="dmg-setting-row">
        <span>Window Position</span>
        <button className="dmg-icon-btn" onClick={onResetPosition}>
          Reset to Top-Right
        </button>
      </div>

      {/* Telemetry info notice */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
        <p style={{ fontSize: '10.5px', color: '#94a3b8', margin: '0 0 6px 0', lineHeight: 1.4 }}>
          ℹ️ <strong>Forza UDP Stream Info:</strong> Modern Forza games (FH5, FH6, FM) do not stream raw internal damage bytes via UDP Data Out. Damage is simulated in real time using 60Hz physics telemetry (impact G-shocks, over-revs, bottoming, and tire slip).
        </p>
        <p style={{ fontSize: '10.5px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
          💡 <strong>Tip:</strong> Drag the top bar to reposition anywhere. Press <kbd>C</kbd> to toggle Compact HUD.
        </p>
      </div>
    </div>
  );
};
