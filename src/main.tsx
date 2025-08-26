import React from 'react'
import ReactDOM from 'react-dom/client'
import { enableMapSet } from 'immer'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import Reset from './Reset.tsx'
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/reset" element={<Reset />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)