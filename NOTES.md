Notes
- shift+tab to auto-accept, and plan mode.
- @file will incluude the file without haveing to read them.
- claude --resume
- `#` will add to memory will in Claude.md

Strategies:
- make a plan in plans/yada.md.


? Claude.md Never stop short of completing a task. If there are reamining tasks, keep going.

---




I'd like better UX for creating lables. When I click the label tool:
1. if i have a selection, then it automatically adds a label based on what is selected. 1 point = coordinates. 2 points or a line = distance. 3 points = angle. 4+points nothing for now.
2. if I have no selection, nothing happens for now and the button is disabled and I should be on select mode.



I want you to as some new constraints. Write them down as a task list in a markdown file and work through them one by one methodically and writing tests for each one along the way.
- colinear (3+ points, or a line + points)
- orthoganol-distance (line + point)
- same-length (2+ lines)
- same-radius (2+ circles)


More tools for later. Right click, new entity or constraint or something...
- bisector, midpoint (custom fraction though?)


Better UX for creating labels.


Support undo/redo, just for state changes to geometry.


bug: Selecting all and moving it moves the labels wrong. moving a label with its corresponding point should not move the label exactly...

Contact / Issues -> Github.

Tooltip hover takes to long to appear.
Give everything a little more of an Ivan Sutherland Sketchpad feel. I don't want to make my eyes bleed though so make it tasteful.


---

selection doesnt get set on mousedown. only mousemove / mouseup. That way clicking the background to make the constraint menu go away doesnt clear the selection before the menu disappears.


Create a panel on the far left that lists all the different files ordered by recently viewed. The save/load/reset functionality can call go in that panel too. I should be able to toggle that panel open and closed.




Make sure this works on an iPad with a stylus. Right click with apple pencil?
Make an app icon thing, make it work offline.


There should be a constraint to handle ambiguities. Maybe one value is larger than another or something. When there is more than one solution...



