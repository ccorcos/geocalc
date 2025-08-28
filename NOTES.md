Notes
- shift+tab to auto-accept.
- @file will incluude the file without haveing to read them.
- claude --resume
- `#` will add to memory will in Claude.md

Strategies:
- make a plan in plans/yada.md.

---

working on getting angle constraints to work and compound constraints like angle with an anchored point.



fix e2e tests.


write a tool claude hook that runs prettier on files after writing to them. Add a npm run prettier command that runs for the whole repo. And add a prettierrc file that specifies tabs and no semis.


add to claude.md that says we always need to write a minimal unit tests for new constraint types.


lets make a plan for e2e tests. similar to unit tests, I want a minimal tests for each constraint type, using the ui to draw, select, constrain, and solve.



I want to display constraints and dimensions visually in the canvas in a style consistent with physics or engineering drawings like dimension lines.
- For a point, lets display (x: ?) if there's an x constraint and (x: ?, y: ?) if there's an x and y constraint. Don't display the current coordinated but the desired coordinates for the constraint.
- For distance, if its just two points then draw a dimension line with the distance constraint value labeled. If its a distance but there's a line already drawn there then you don't need a dimension line, just draw the number label next to the line.


  | "distance"
  | "x-distance"
  | "y-distance"
  | "parallel"
  | "perpendicular"
  | "tangent"
  | "angle"
  | "horizontal"
  | "vertical"
  | "x"
  | "y"
  | "same-x"
  | "same-y"
  | "radius";






in the constraint panel, swap the position of the target number with the list of entities.


e2e
constraints



lets alter the type system to ensure that any constraints we define but also be implemented.
Lets focus on unit tests. Make a minimal unit test for each constraint type.
claude.md process for creating a constraint. the different places in the menu, and the tests to create.
Let write a simple ui test for ever kind of constraint. Create the minimal number of shapes necessary, create the constraint, hit solve, and observe that the constraint is satisfied.


Create a measurement tool. The tool is disabled until you have a valid selection. If you select a point, then measure gives will display the coordinates in the canvas. If I click two points, it measures the distance between between them and displays it on the canvas. These measurements are entities themselves and can be re-arranges on the canvas. If I click on three points, it measures the angle between them and also shows an angle indicator.

e2e interactions for cmd-click.

---

fix-x, fix-y, and fix-radius should all appear in the right click menu.

when selecting a constraint from the constraint panel, i should be able to click somewhere else to clear that selection.

Make the grid representation a little better. When I zoom in, at some point the grid should change scale, all the way down to looking at value of 1 per grid separation. And when I zoom out, it should bump up as well.

The numbers in the legend seem blurry.

Make a unit test for Test that creating a circle, setting a fixes radius, then changing the radius, then solving will converge back to the fixed radius.

---


?Works yet?
Three points should be able to have a fixed angle


Implement tangent and angle constraints.

A point and a line should have an orthogonal distance contraint.

A point and a circle should have a distance constraint offset from the radius of the circle. negative number being inside the circle, positive being outside of the circle, 0 being on the circle.

A line and a circle should have a tangent distance constraint a well as an orthoganol constraint.

When creating a circle, I should be able to click on an existing point rather than create a new one.

---

When I have two points that have a distance constraint, sometimes the point overshoots and ends up on the other side of the fixed point.







I should be able to edit number for the circle's radius in the entity panel.

I should be able to cmd click a number in the entity panel (such as the radius of a circle) to make the value fixed.


Lets persist the document to local storage and use the `/clear` route to clear it in case something goes wrong. Lets not worry about migrating old data for now, we can just reset.



The tools should be a floating panel at the bottom center of the screen. We should use symbols to represent the tools with an alt hover text that says `Point (P)` where P is the shortct for creating a point, etc. The Solve button can remain at the top, but I want a button to run just a simple step of the solver vs a full solve.


Give everything a little more of an Ivan Sutherland Sketchpad feel. I don't want to make my eyes bleed though so make it tasteful.