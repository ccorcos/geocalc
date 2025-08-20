import React, { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../state/store';
import { CanvasRenderer } from '../../rendering/renderer';
import { CanvasInteraction } from '../../interaction/CanvasInteraction';

interface CanvasProps {
  width: number;
  height: number;
}

export const Canvas: React.FC<CanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const interactionRef = useRef<CanvasInteraction | null>(null);
  
  const { document, viewport, selection, setViewport } = useStore();

  // Initialize renderer and interaction
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    
    if (!rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvas);
    }
    
    if (!interactionRef.current) {
      interactionRef.current = new CanvasInteraction(canvas);
    }

    return () => {
      if (interactionRef.current) {
        interactionRef.current.destroy();
        interactionRef.current = null;
      }
    };
  }, []);

  // Update viewport dimensions when size changes
  useEffect(() => {
    setViewport({ width, height });
    if (rendererRef.current) {
      rendererRef.current.resize(width, height);
    }
  }, [width, height, setViewport]);

  // Render on state changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.render(document, viewport, selection);
    }
  }, [document, viewport, selection]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onContextMenu={handleContextMenu}
      style={{
        display: 'block',
        cursor: 'crosshair',
        outline: 'none',
      }}
      tabIndex={0}
    />
  );
};