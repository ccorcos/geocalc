Notes
- shift+tab to auto-accept.
- @file will incluude the file without haveing to read them.
- claude --resume
- `#` will add to memory will in Claude.md

Strategies:
- make a plan in plans/yada.md.

---

update claude.md based on these changes.
DEV.md is proabbly out of date, but incorporate any important parts into Claude.md and delete it.

typecheck command. fix types.
git commit


---


Lets focus on unit tests. Make a minimal unit test for each constraint type.

claude.md process for creating a constraint. the different places in the menu, and the tests to create.



Lets make tests first.
Unit tests and ui tests.

Start with the solver. Minimal example for each constraint.
















Let write a simple ui test for ever kind of constraint. Create the minimal number of shapes necessary, create the constraint, hit solve, and observe that the constraint is satisfied.

---

fix-x, fix-y, and fix-radius should all appear in the right click menu.

when selecting a constraint from the constraint panel, i should be able to click somewhere else to clear that selection.

/init
(Create a claude.md file)

Create a measurement tool. The tool is disabled until you have a valid selection. If you select a point, then measure gives will display the coordinates in the canvas. If I click two points, it measures the distance between between them and displays it on the canvas. These measurements are entities themselves and can be re-arranges on the canvas. If I click on three points, it measures the angle between them and also shows an angle indicator.


Make the grid representation a little better. When I zoom in, at some point the grid should change scale, all the way down to looking at value of 1 per grid separation. And when I zoom out, it should bump up as well.

The numbers in the legend seem blurry.



cleanup unused code and debug log statements and run tests to make sure everything is still working.

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