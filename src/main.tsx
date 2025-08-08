import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Prevent lovable.js DataCloneError by monkey-patching the specific error
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args[0];
  // Filter out the specific DataCloneError messages that flood the console
  if (typeof message === 'string' && 
      message.includes('Failed to send message') && 
      message.includes('DataCloneError')) {
    return; // Skip logging these specific errors
  }
  return originalConsoleError.apply(this, args);
};

createRoot(document.getElementById("root")!).render(<App />);
