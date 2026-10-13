export {};

declare global {
  interface Window {
    electronAPI?: {
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward?: boolean }) => void;
      toggleDamageOverlay?: () => void;
      showDamageOverlay?: () => void;
      hideDamageOverlay?: () => void;
      resetDamagePosition?: () => void;
      closeCurrentWindow?: () => void;
      onDamageVisibilityChanged?: (callback: (visible: boolean) => void) => () => void;
    };
  }
}
