# GeoCalc - 2D Geometry Calculator

A web-based 2D CAD application that lets you draw shapes, apply constraints, and use numerical optimization to solve for the geometry that satisfies all constraints simultaneously.

## Motivation

About once per year or so, I find myself trying to solve a geometry problem that is incredibly tedious and error-prone to do algebraically. I also usually don't care about the algebraic solution either, I just want to know the measurement. So I made this tool.

### Example

When working on the [Rainbow Bridge](https://chetcorcos.notion.site/Rainbow-Bridge-896c341316ab4ae59064c02d948382b0) project, I recall a very annoying geometry problem:

The inside of the arch is an arc on a 75ft diameter circle. But the actual base of the arch is 71ft across. We have all these arc-shaped plywood panels, but we need to figure out the size of the wedges at the base of the arch.



## 🎯 What is GeoCalc?

GeoCalc is an interactive 2D geometry tool where you can:
- **Draw** points, lines, and circles on a canvas
- **Apply constraints** like fixed distances, parallel lines, perpendicularity
- **Solve** the constraint system using numerical optimization
- **Get real-time feedback** as the solver adjusts your geometry

Unlike traditional CAD tools that use algebraic constraint solving, GeoCalc uses a numerical gradient descent approach that's simpler to implement and extend.
