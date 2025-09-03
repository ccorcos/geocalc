Notes
- shift+tab to auto-accept, and plan mode.
- @file will incluude the file without haveing to read them.
- claude --resume
- `#` will add to memory will in Claude.md

Strategies:
- make a plan in plans/yada.md.

---



I want to make some improvements to the way the background grid is presented.
- Lets show the x-y axis as a slightly bolder line.
- When I zoom in far enough, the background is just white. Instead, I should see the grid adjust by factors of 10 so that I can see increasing precision as I zoom in. The legend at the bottom should adjust accordingly, showing the grid size.
- Zooming out should similarly adjust the grid size. And lets stick to factors of 10.
Lets strategize about the best way to do this in plans/grid.md.


The legend should only show a line thats the width of the grid and the grid scale. It shouldn't show this dynamically stretching thing thats showing anything other than the factor of 10 grid scale. And instead of 1k, write out 1,000. Also no need for percent zoom in the legend. And no need to display a subgrid at all.

---


selecting all and moving it moves the labels wrong. moving a label with its corresponding point should not move the label exactly...


- I should be able to set the initial scale of the drawing so that all the shapes are an appropriate size.


There should be a max size of a label, max size of a point circle, and max thickness of a line (as a function of the viewport) so that as I zoom in, things don't get obnoxiously big. Zooming out though, they should get smaller and thats fine.





- better colors. red vs green.

---



Line length constrating. Distance.


fixed radius + point on circle / tangent line


colinear (3+ points, or a line + points)
orthoganol-distance (line + point)
same-length (2+ lines)
same-radius (2+ circles)
bisector, midpoint (custom fraction though?)














Later or Never: In the constraint panel, swap the target label with the list of entities. That way the topright shows the target with the error below. And the bottom left shows the list of entities.



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