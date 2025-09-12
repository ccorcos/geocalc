Notes
- shift+tab to auto-accept, and plan mode.
- @file will incluude the file without haveing to read them.
- claude --resume
- `#` will add to memory will in Claude.md

Strategies:
- make a plan in plans/yada.md.

---

At the bottom left of the page, under the entity panel, add three buttons. Save, load, and reset. Save should export the state to a json file that I can download. Load should load from the file (and handle any migration necessary). And reset should clear the entire canvas of entities and constraints so I can start with something new.


Is it possible to persist the model state as a url parameter similar to how typescript playground does it on their website? Maybe if the state is too big we can display a warning somewhere at the bottom left of the canvas that the model is too big for the url param. Lets add some code to persist to the url bar

---

I want to carefully rework the concept of "scale" in the grid rendering / legend. When I say that the scale is 100, what I mean is that the things I'm going to draw on the canvas are on the order of 10-100 in size. That means the default viewport and grid size shold adjust (which doesnt look good) alongside the line thickness and label size (which looks good already) together. So when I say scale: 100, then the initial grid size should be 10 and the zoom 1x should be able to fit a 100 x 100 square with 10% margin around the object. I should be able to change the scale to 0.001 or 1000000 and the viewport should adjust to make sense for what I'm drawing. To be clear, when I adjust the scale, it changes the meaning of what 1x zoom means. Also, in regards to line thickness and viewport and grid, it should probably scale linearly -- when scale is less than 100, like 10, the size of a point is way too small.

---

Lets add a migration that persists the viewport scale, zoom, and position so that when you reload, you are looking at the same place in the model.



I should be able to set the initial scale of the drawing so that all the shapes are an appropriate size.


migration strategy, versioning 1, 2, 3...

save / load to a file you can keep on your computer. or serialize to a url parameter string for sharing...


Extrapolate system architecture into a boilerplate for a project.


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


