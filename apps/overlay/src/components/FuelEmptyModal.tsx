import React from 'react';

interface FuelEmptyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefill?: () => void;
}

export const FuelEmptyModal: React.FC<FuelEmptyModalProps> = ({ isOpen, onClose, onRefill }) => {
  if (!isOpen) return null;

  const handleRefill = () => {
    if (onRefill) {
      onRefill();
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="fuel-empty-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fuel-empty-title"
      >
        <div className="modal-header">
          <span className="modal-icon">🚨</span>
          <h2 id="fuel-empty-title" className="modal-title">TANK EMPTY</h2>
          <span className="modal-subtitle">0.0% FUEL REMAINING</span>
        </div>

        <div className="modal-body">
          <p className="modal-message">
            Your vehicle has completely run out of fuel. Refill your tank to continue driving.
          </p>
        </div>

        <div className="modal-footer">
          {onRefill && (
            <button
              type="button"
              className="modal-refill-btn"
              onClick={handleRefill}
              autoFocus
            >
              🔄 REFILL FUEL (100%)
            </button>
          )}
          <button
            type="button"
            className="modal-dismiss-btn"
            onClick={onClose}
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
