import React from 'react';

interface WarningIndicatorProps {
  isShiftWarning: boolean;
  isFuelEmpty?: boolean;
  isFuelLow: boolean;
  isFuelCritical: boolean;
}

export const WarningIndicator: React.FC<WarningIndicatorProps> = ({
  isShiftWarning,
  isFuelEmpty,
  isFuelLow,
  isFuelCritical,
}) => {
  if (!isShiftWarning && !isFuelEmpty && !isFuelLow && !isFuelCritical) {
    return null;
  }

  return (
    <div className="warning-banner-container">
      {isShiftWarning && (
        <div className="warning-pill shift-warning">
          ⚡ SHIFT UP ⚡
        </div>
      )}
      {isFuelEmpty && (
        <div className="warning-pill fuel-empty">
          🚨 OUT OF FUEL - ENGINE STALLED
        </div>
      )}
      {!isFuelEmpty && isFuelCritical && (
        <div className="warning-pill fuel-critical">
          ⚠️ PIT THIS LAP - CRITICAL FUEL
        </div>
      )}
      {!isFuelEmpty && !isFuelCritical && isFuelLow && (
        <div className="warning-pill fuel-low">
          ⛽ LOW FUEL WARNING
        </div>
      )}
    </div>
  );
};
