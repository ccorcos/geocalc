import React from 'react'
import ReactDOM from 'react-dom/client'
import { enableMapSet } from 'immer'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import Reset from './Reset.tsx'
import './index.css'
import { useStore } from './store'
import { createDiagnostics } from './diagnostics'

// Enable Map and Set support in Immer
enableMapSet()

// Expose store and diagnostics to window for testing
if (typeof window !== 'undefined') {
  (window as any).__GEOCALC_STORE__ = useStore;
  (window as any).__GEOCALC_DIAGNOSTICS__ = createDiagnostics();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/reset" element={<Reset />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)