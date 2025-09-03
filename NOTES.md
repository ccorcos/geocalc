Notes
- shift+tab to auto-accept, and plan mode.
- @file will incluude the file without haveing to read them.
- claude --resume
- `#` will add to memory will in Claude.md

Strategies:
- make a plan in plans/yada.md.

---


Some drawings are at vastly different scales and it makes it hard to represent here very well. For example, one project might be working with 0.01 sized things. And other project might be working with 100,000 sized things. What happens is that I end up having to zoom in or out a bunch and then the lines and labels become either too big or too small. I think when zooming in, it makes sense that the features should have a max size as a function of the viewport, but when zooming out, I think it makes sense for those features to get smaller so you can see the drawing. I'm not sure what the best way to approach this is though. It seems like there should maybe be an initial scale of the drawing you can set? But then it might make sense to be able to change that whenever you want. It seems like you should be able zoom in or out however much you want with no limit, but then it probably also makes sense to have a button that will recenter the viewport on whatever has been drawn. What do you think we should do? Examine the trade-offs and recommend an approach that considers the UX as well. Write your plan in plans/scale.md



- I should be able to set the initial scale of the drawing so that all the shapes are an appropriate size.


There should be a max size of a label, max size of a point circle, and max thickness of a line (as a function of the viewport) so that as I zoom in, things don't get obnoxiously big. Zooming out though, they should get smaller and thats fine.


---

Saving documents. Import / Export. Automerge. Undo/redo. Collaboration.

selecting all and moving it moves the labels wrong. moving a label with its corresponding point should not move the label exactly...

- better colors. red vs green.

Line length constrating. Distance.

fixed radius + point on circle / tangent line

colinear (3+ points, or a line + points)
orthoganol-distance (line + point)
same-length (2+ lines)
same-radius (2+ circles)
bisector, midpoint (custom fraction though?)


Make sure this works on an iPad with a stylus. Right click with apple pencil?

The numbers in the legend seem blurry.

---

?Works yet?
Three points should be able to have a fixed angle


There should be a constraint to handle ambiguities. Maybe one value is larger than another or something. When there is more than one solution...

When I have two points that have a distance constraint, sometimes the point overshoots and ends up on the other side of the fixed point.


Testing...
I should be able to edit all the numbers in the panels
I should be able to cmd+click to fix things in place.
Tooltip hover takes to long to appear.
Give everything a little more of an Ivan Sutherland Sketchpad feel. I don't want to make my eyes bleed though so make it tasteful.


