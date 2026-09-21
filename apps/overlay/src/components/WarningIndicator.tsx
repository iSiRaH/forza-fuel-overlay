import React from 'react';

interface WarningIndicatorProps {
  isShiftWarning: boolean;
  isFuelLow: boolean;
  isFuelCritical: boolean;
}

export const WarningIndicator: React.FC<WarningIndicatorProps> = ({
  isShiftWarning,
  isFuelLow,
  isFuelCritical,
}) => {
  if (!isShiftWarning && !isFuelLow && !isFuelCritical) {
    return null;
  }

  return (
    <div className="warning-banner-container">
      {isShiftWarning && (
        <div className="warning-pill shift-warning">
          ⚡ SHIFT UP ⚡
        </div>
      )}
      {isFuelCritical && (
        <div className="warning-pill fuel-critical">
          ⚠️ PIT THIS LAP - CRITICAL FUEL
        </div>
      )}
      {!isFuelCritical && isFuelLow && (
        <div className="warning-pill fuel-low">
          ⛽ LOW FUEL WARNING
        </div>
      )}
    </div>
  );
};
