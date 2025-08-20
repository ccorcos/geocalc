import React, { useEffect, useState } from 'react';
import { Canvas } from './components/Canvas/Canvas';
import { Toolbar } from './components/Toolbar/Toolbar';
import { ConstraintPanel } from './components/ConstraintPanel/ConstraintPanel';

function App() {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateCanvasSize = () => {
      const toolbarHeight = 60; // Approximate toolbar height
      const padding = 20;
      
      setCanvasSize({
        width: window.innerWidth - padding,
        height: window.innerHeight - toolbarHeight - padding,
      });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      margin: 0,
      padding: 0,
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#f8f9fa',
      position: 'relative',
    }}>
      <Toolbar />
      <div style={{
        padding: '10px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: `calc(100vh - 60px)`, // Subtract toolbar height
      }}>
        <div style={{
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          backgroundColor: 'white',
        }}>
          <Canvas 
            width={canvasSize.width} 
            height={canvasSize.height} 
          />
        </div>
      </div>
      <ConstraintPanel />
    </div>
  );
}

export default App;