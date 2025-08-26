import React from 'react'
import ReactDOM from 'react-dom/client'
import { enableMapSet } from 'immer'
import App from './App.tsx'
import './index.css'
import { useStore } from './store'

// Enable Map and Set support in Immer
enableMapSet()

// Expose store to window for testing
if (typeof window !== 'undefined') {
  (window as any).__GEOCALC_STORE__ = useStore;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)