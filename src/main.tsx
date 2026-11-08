import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useGame } from './game/state';
import './styles.css';

// dev-only handle for testing (not included in production builds)
if (import.meta.env.DEV) (window as unknown as { game: typeof useGame }).game = useGame;

createRoot(document.getElementById('root')!).render(<App />);
