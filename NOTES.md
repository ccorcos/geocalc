Notes
- shift+tab to auto-accept, and plan mode.
- @file will incluude the file without haveing to read them.
- claude --resume
- `#` will add to memory will in Claude.md

Strategies:
- make a plan in plans/yada.md.

---

I want to carefully rework the concept of "scale" in the grid rendering / legend. When I say that the scale is 100, what I mean is that the things I'm going to draw on the canvas are on the order of 10-100 in size. That means the default viewport and grid size shold adjust (which doesnt look good) alongside the line thickness and label size (which looks good already) together. So when I say scale: 100, then the initial grid size should be 10 and the zoom 1x should be able to fit a 100 x 100 square with 10% margin around the object. I should be able to change the scale to 0.001 or 1000000 and the viewport should adjust to make sense for what I'm drawing. To be clear, when I adjust the scale, it changes the meaning of what 1x zoom means. Also, in regards to line thickness and viewport and grid, it should probably scale linearly -- when scale is less than 100, like 10, the size of a point is way too small.



The scaling logic with the grid is still not the way I want it. Let me be more specific:
- the default value is scale 100, zoom 1x. That means the grid I should see is spaced every 10 units. The viewport should show the given scale + 10% on either side, so theres 120 units across the screen, 12 grid lines...
- when I change scale to 10, then to maintain the same viewport as with 100, zoom has to go to 0.1x. And if we did that, nothing would really change. But we want to maintain the same zoom as before so we have to zoom the viewport by 10.
So lets disambiguate some terms here. There's the viewport size, the scale, the zoom, and the grid size. scale * zoom * 1.2 = viewport size. And grid size is something like 10^round(log10(scale*zoom)) -- the closest factor of 10 size. The thickness of a line or label should be a function of scale so that they're an appropriate size for the viewport when zoom = 1x. And when zoom < 1, things get smaller, and when zoom > 1, things stay the same size.






fix the end-to-end tests.

pinch zoom is too sensitive.


Lets add a migration that persists the viewport scale, zoom, and position so that when you reload, you are looking at the same place in the model.



How hard would it be to support undo/redo?



Create a panel on the far left that lists all the different files ordered by recently viewed. The save/load/reset buttons can go at the bottom of that panel, and I should be able to toggle that panel open and closed.


colinear (3+ points, or a line + points)
orthoganol-distance (line + point)
same-length (2+ lines)
same-radius (2+ circles)
bisector, midpoint (custom fraction though?)


the same constraints that apply to two points should also apply to a line, like distance.

bug: Selecting all and moving it moves the labels wrong. moving a label with its corresponding point should not move the label exactly...

Make sure this works on an iPad with a stylus. Right click with apple pencil?

Contact / Issues -> Github.

---

There should be a constraint to handle ambiguities. Maybe one value is larger than another or something. When there is more than one solution...

Tooltip hover takes to long to appear.
Give everything a little more of an Ivan Sutherland Sketchpad feel. I don't want to make my eyes bleed though so make it tasteful.


