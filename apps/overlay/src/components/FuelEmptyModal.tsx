import React from 'react';

interface FuelEmptyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FuelEmptyModal: React.FC<FuelEmptyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
          <span className="modal-icon">⚠️</span>
          <h2 id="fuel-empty-title" className="modal-title">FUEL EMPTY</h2>
        </div>

        <div className="modal-body">
          <p className="modal-message">Your fuel tank is empty.</p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="modal-ok-btn"
            onClick={onClose}
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
