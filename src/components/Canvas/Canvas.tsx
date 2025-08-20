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
  
  const { document, viewport, selection, setViewport, currentTool, isDragging } = useStore();

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

  // Render function
  const renderCanvas = useCallback(() => {
    if (rendererRef.current && interactionRef.current) {
      const tempLineStart = interactionRef.current.getTempLineStart();
      const tempCircleCenter = interactionRef.current.getTempCircleCenter();
      const selectionRect = interactionRef.current.getSelectionRect();
      
      rendererRef.current.render(document, viewport, selection, {
        tempLineStart,
        tempCircleCenter,
        selectionRect
      });
    }
  }, [document, viewport, selection, isDragging]);

  // Render on state changes  
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Animation loop for interactive states
  useEffect(() => {
    let animationId: number;
    let wasActive = false;
    
    const animate = () => {
      if (interactionRef.current) {
        const selectionRect = interactionRef.current.getSelectionRect();
        const isActive = !!selectionRect;
        
        if (isActive) {
          renderCanvas();
          wasActive = true;
        } else if (wasActive) {
          // Render one final time to clear the selection rect
          renderCanvas();
          wasActive = false;
        }
      }
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [renderCanvas]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Determine cursor based on current state
  const getCursor = useCallback(() => {
    if (currentTool !== 'select') {
      return 'crosshair';
    }
    
    if (isDragging) {
      // Check if we're dragging radius handles
      if (interactionRef.current) {
        // We would need to expose more state from the interaction handler
        // For now, just use grabbing for all drags
        return 'grabbing';
      }
      return 'grabbing';
    }
    
    // Check if hovering over a selected entity that can be moved
    if (selection.hoveredId) {
      if (selection.selectedIds.has(selection.hoveredId)) {
        const canMove = document.points.has(selection.hoveredId) || 
                       document.circles.has(selection.hoveredId) || 
                       document.lines.has(selection.hoveredId);
        if (canMove) {
          return 'grab';
        }
      }
      
      // Show resize cursor for circle radius handles
      if (document.circles.has(selection.hoveredId)) {
        return 'ew-resize';
      }
    }
    
    return 'default';
  }, [currentTool, isDragging, selection.hoveredId, selection.selectedIds, document.points, document.circles, document.lines]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onContextMenu={handleContextMenu}
      style={{
        display: 'block',
        cursor: getCursor(),
        outline: 'none',
      }}
      tabIndex={0}
    />
  );
};