import React from 'react';
import { useStore } from '../../state/store';
import { ToolType } from '../../engine/models/types';

interface ToolButtonProps {
  tool: ToolType;
  currentTool: ToolType;
  onClick: (tool: ToolType) => void;
  icon: string;
  tooltip: string;
  shortcut: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ tool, currentTool, onClick, icon, tooltip, shortcut }) => (
  <button
    onClick={() => onClick(tool)}
    title={`${tooltip} (${shortcut})`}
    style={{
      width: '44px',
      height: '44px',
      backgroundColor: currentTool === tool ? '#4dabf7' : 'rgba(255, 255, 255, 0.95)',
      color: currentTool === tool ? 'white' : '#495057',
      border: currentTool === tool ? '2px solid #339af0' : '1px solid rgba(222, 226, 230, 0.8)',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: tool === 'line' ? '14px' : '18px',
      fontWeight: 'normal',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      backdropFilter: 'blur(8px)',
      boxShadow: currentTool === tool 
        ? '0 4px 12px rgba(77, 171, 247, 0.3)' 
        : '0 2px 8px rgba(0, 0, 0, 0.1)',
    }}
    onMouseEnter={(e) => {
      if (currentTool !== tool) {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
        e.currentTarget.style.borderColor = 'rgba(222, 226, 230, 1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }
    }}
    onMouseLeave={(e) => {
      if (currentTool !== tool) {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        e.currentTarget.style.borderColor = 'rgba(222, 226, 230, 0.8)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }
    }}
  >
    {icon}
  </button>
);

export const FloatingToolbar: React.FC = () => {
  const { currentTool, setCurrentTool } = useStore();

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px',
      backgroundColor: 'rgba(248, 249, 250, 0.95)',
      borderRadius: '16px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.6)',
      zIndex: 1000,
    }}>
      <ToolButton 
        tool="select" 
        currentTool={currentTool} 
        onClick={setCurrentTool}
        icon="↖"
        tooltip="Select Tool"
        shortcut="V"
      />
      
      <ToolButton 
        tool="point" 
        currentTool={currentTool} 
        onClick={setCurrentTool}
        icon="•"
        tooltip="Point Tool"
        shortcut="P"
      />
      
      <ToolButton 
        tool="line" 
        currentTool={currentTool} 
        onClick={setCurrentTool}
        icon="•—•"
        tooltip="Line Tool"
        shortcut="L"
      />
      
      <ToolButton 
        tool="circle" 
        currentTool={currentTool} 
        onClick={setCurrentTool}
        icon="⊙"
        tooltip="Circle Tool"
        shortcut="C"
      />
    </div>
  );
};