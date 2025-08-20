import React from 'react';
import { useStore } from '../../state/store';
import { ToolType } from '../../engine/models/types';

interface ToolButtonProps {
  tool: ToolType;
  currentTool: ToolType;
  onClick: (tool: ToolType) => void;
  children: React.ReactNode;
}

const ToolButton: React.FC<ToolButtonProps> = ({ tool, currentTool, onClick, children }) => (
  <button
    onClick={() => onClick(tool)}
    style={{
      padding: '8px 16px',
      margin: '0 2px',
      backgroundColor: currentTool === tool ? '#4dabf7' : '#f8f9fa',
      color: currentTool === tool ? 'white' : '#495057',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: currentTool === tool ? 'bold' : 'normal',
    }}
  >
    {children}
  </button>
);

export const Toolbar: React.FC = () => {
  const { currentTool, setCurrentTool, solve, isSolving } = useStore();

  return (
    <div
      style={{
        padding: '10px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span style={{ fontWeight: 'bold', marginRight: '10px' }}>Tools:</span>
      
      <ToolButton tool="select" currentTool={currentTool} onClick={setCurrentTool}>
        Select
      </ToolButton>
      
      <ToolButton tool="point" currentTool={currentTool} onClick={setCurrentTool}>
        Point
      </ToolButton>
      
      <ToolButton tool="line" currentTool={currentTool} onClick={setCurrentTool}>
        Line
      </ToolButton>
      
      <ToolButton tool="circle" currentTool={currentTool} onClick={setCurrentTool}>
        Circle
      </ToolButton>
      
      <div style={{ marginLeft: '20px', marginRight: '20px' }}>
        <button
          onClick={solve}
          disabled={isSolving}
          style={{
            padding: '8px 16px',
            backgroundColor: isSolving ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSolving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {isSolving ? 'Solving...' : 'Solve'}
        </button>
      </div>
      
      <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#6c757d' }}>
        {currentTool === 'select' && 'Click to select, drag to move. Selected entities show constraint options.'}
        {currentTool === 'point' && 'Click to place point'}
        {currentTool === 'line' && 'Click two points to create line'}
        {currentTool === 'circle' && 'Click center, then click for radius'}
      </div>
    </div>
  );
};