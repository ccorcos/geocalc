# GeoCalc - Interactive Geometry Calculator

A modern web-based geometry application that lets you draw shapes and apply constraints, then uses gradient descent optimization to solve for the geometry that satisfies all constraints simultaneously.

![GeoCalc Demo](https://via.placeholder.com/800x400/4dabf7/ffffff?text=GeoCalc+Interactive+Geometry)

## 🎯 What is GeoCalc?

GeoCalc is an interactive 2D geometry tool where you can:
- **Draw** points, lines, and circles on a canvas
- **Apply constraints** like fixed distances, parallel lines, perpendicularity
- **Solve** the constraint system using numerical optimization
- **Get real-time feedback** as the solver adjusts your geometry

Unlike traditional CAD tools that use algebraic constraint solving, GeoCalc uses a numerical gradient descent approach that's simpler to implement and extend.

## ✨ Features

### Drawing Tools
- 📍 **Points** - Click to place movable or fixed points
- 📏 **Lines** - Click two points to create line segments or infinite lines  
- ⭕ **Circles** - Click center then radius to create circles

### Constraint System
- 📐 **Distance** - Fix the distance between two points
- ↔️ **Parallel** - Make two lines parallel to each other
- ⟂ **Perpendicular** - Make two lines perpendicular
- ➡️ **Horizontal** - Constrain a line to be horizontal
- ⬆️ **Vertical** - Constrain a line to be vertical

### Interactive Features
- 🖱️ **Pan & Zoom** - Navigate large drawings smoothly
- 🎯 **Selection** - Click to select, shift-click for multi-select
- ↗️ **Dragging** - Move points by dragging (respects constraints after solving)
- 🔄 **Real-time Updates** - Immediate visual feedback
- ⚡ **Gradient Descent Solver** - Numerical constraint satisfaction

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd geocalc

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Basic Usage

1. **Draw Some Geometry**
   - Select "Point" tool and click to place points
   - Select "Line" tool and click two points to create a line
   - Select "Circle" tool, click center then click for radius

2. **Add Constraints**
   - Switch to "Constraint" tool
   - Click entities you want to constrain (hold Shift for multi-select)
   - Use the constraint panel (appears on right) to create constraints
   - Set values if needed (e.g., distance constraint)

3. **Solve the System**
   - Click the green "Solve" button in the toolbar
   - Watch as the geometry adjusts to satisfy all constraints
   - Try moving points and re-solving to see constraint preservation

## 🎮 Example Workflows

### Create a Fixed Distance Constraint
1. Place two points on the canvas
2. Switch to constraint tool and select both points
3. Choose "Fixed Distance" from the constraint panel
4. Leave value empty to use current distance, or enter a specific value
5. Click "Create" then "Solve"

### Make Lines Parallel
1. Draw two lines on the canvas
2. Switch to constraint tool and select both lines
3. Choose "Parallel" from the constraint panel  
4. Click "Create" then "Solve"

### Create a Right Angle
1. Draw two intersecting lines
2. Select both lines with the constraint tool
3. Choose "Perpendicular" from the constraint panel
4. Click "Create" then "Solve"

## 🏗️ Architecture

GeoCalc uses a modern React + TypeScript stack with a clean architecture:

- **UI Layer**: React components for canvas, toolbar, and panels
- **State Management**: Zustand with Immer for immutable updates
- **Rendering**: HTML5 Canvas API for smooth 2D graphics
- **Constraint Engine**: Custom gradient descent solver
- **Extensible Design**: Easy to add new constraints and geometry types

### Key Technologies
- React 18 + TypeScript
- Zustand (state management)
- HTML5 Canvas (rendering)
- Immer (immutable updates)
- Vite (build tool)

## 📁 Project Structure

```
src/
├── components/      # React UI components
├── engine/          # Geometry and constraint logic
├── rendering/       # Canvas rendering system
├── interaction/     # Mouse/keyboard handling
├── state/           # Global state management
└── utils/           # Helper functions
```

For detailed architecture documentation, see [DEV.md](./DEV.md).

## 🎯 Roadmap

### Phase 1 - Core Features ✅
- Basic drawing tools (points, lines, circles)
- Essential constraints (distance, parallel, perpendicular)
- Gradient descent solver
- Interactive canvas with pan/zoom

### Phase 2 - Enhanced Constraints
- [ ] Tangent constraints
- [ ] Angle constraints  
- [ ] Concentric circles
- [ ] Point-on-line/circle constraints
- [ ] Length and radius constraints

### Phase 3 - User Experience
- [ ] Undo/redo system
- [ ] Constraint visualization (dimension lines, symbols)
- [ ] Improved error handling and user feedback
- [ ] Keyboard shortcuts
- [ ] Export capabilities (SVG, PNG)

### Phase 4 - Collaboration & Persistence
- [ ] Local storage persistence
- [ ] Cloud synchronization
- [ ] Real-time collaboration with Automerge
- [ ] Version history
- [ ] Sharing and embedding

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes
4. **Test** your changes thoroughly
5. **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. **Push** to the branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update documentation for API changes
- Keep the constraint system modular and extensible

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by classic geometry software like GeoGebra and Cabri
- Built with modern web technologies for accessibility and performance
- Numerical approach influenced by constraint satisfaction research

## 🐛 Issues & Support

- **Bug Reports**: Please use GitHub Issues with detailed reproduction steps
- **Feature Requests**: Open an issue with the "enhancement" label  
- **Questions**: Check existing issues or start a discussion

## 🔗 Links

- **Live Demo**: [Coming Soon]
- **Documentation**: [DEV.md](./DEV.md)
- **GitHub Issues**: [Issues Page]
- **Discussions**: [GitHub Discussions]

---

**Built with ❤️ using React + TypeScript + Canvas API**

*GeoCalc makes constraint-based geometry accessible through modern web technology and intuitive design.*