import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import DamageOverlay from './components/damage/DamageOverlay.tsx';

function RootRouter() {
  const [route, setRoute] = useState(() => {
    return window.location.hash.toLowerCase().includes('damage') ? 'damage' : 'fuel';
  });

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash.toLowerCase().includes('damage') ? 'damage' : 'fuel');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (route === 'damage') {
    return <DamageOverlay />;
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootRouter />
  </StrictMode>,
);
