import { useEffect, useState } from "react";
import { Canvas } from "./components/Canvas";
import { ConstraintPanel } from "./components/ConstraintPanel";
import { EntityPanel } from "./components/EntityPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FloatingToolbar } from "./components/FloatingToolbar";
import { useStore } from "./store";

function App() {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const { setCurrentTool, selection, removeEntity } = useStore();

  useEffect(() => {
    const updateCanvasSize = () => {
      const panelWidth = 560; // Both panels width (280 * 2)
      const padding = 20;

      setCanvasSize({
        width: window.innerWidth - panelWidth - padding,
        height: window.innerHeight - padding,
      });
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement).contentEditable === "true")
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case "p":
          event.preventDefault();
          setCurrentTool("point");
          break;
        case "l":
          event.preventDefault();
          setCurrentTool("line");
          break;
        case "o":
        case "c":
          event.preventDefault();
          setCurrentTool("circle");
          break;
        case "v":
        case "escape":
          event.preventDefault();
          setCurrentTool("select");
          break;
        case "delete":
        case "backspace":
          event.preventDefault();
          // Delete all selected entities
          Array.from(selection.selectedIds).forEach((id) => {
            removeEntity(id);
          });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCurrentTool, selection.selectedIds, removeEntity]);

  return (
    <ErrorBoundary>
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          margin: 0,
          padding: 0,
          height: "100vh",
          overflow: "hidden",
          backgroundColor: "#f8f9fa",
          display: "grid",
          gridTemplateColumns: "280px 1fr 280px",
          gridTemplateRows: "1fr",
          gap: 0,
        }}
      >
        {/* Left Panel - Entities */}
        <div
          style={{
            backgroundColor: "#f8f9fa",
            display: "flex",
            alignItems: "stretch",
          }}
        >
          <EntityPanel />
        </div>

        {/* Canvas */}
        <div
          style={{
            padding: "10px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            backgroundColor: "#f8f9fa",
          }}
        >
          <div
            style={{
              border: "1px solid #dee2e6",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              backgroundColor: "white",
              position: "relative",
            }}
          >
            <Canvas width={canvasSize.width} height={canvasSize.height} />
          </div>
          <FloatingToolbar />
        </div>

        {/* Right Panel - Constraints */}
        <div
          style={{
            backgroundColor: "#f8f9fa",
            display: "flex",
            alignItems: "stretch",
          }}
        >
          <ConstraintPanel />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
