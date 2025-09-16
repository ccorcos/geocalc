Notes
- shift+tab to auto-accept, and plan mode.
- @file will incluude the file without haveing to read them.
- claude --resume
- `#` will add to memory will in Claude.md

Strategies:
- make a plan in plans/yada.md.

? Claude.md Never stop short of completing a task. If there are reamining tasks, keep going.

---

"[Warning] Failed to save geometry to URL: – SecurityError: Attempt to use history.replaceState() more than 100 times per 10 seconds (store.ts, line 88)
SecurityError: Attempt to use history.replaceState() more than 100 times per 10 seconds"



If the model is too big for a URL, then add a warning above the save/load/reset buttons.


bug: Selecting all and moving it moves the labels wrong. moving a label with its corresponding point should not move the label exactly...


bug: angle label problems.
bug: Tooltip hover takes to long to appear.


bug: the page shouldn't error if its too narrow. it doesnt have to work well on mobile but it shouldnt crash either. a nice warning would be nice along with attempting to show things however possible.



Give everything a little more of an Ivan Sutherland Sketchpad feel. I don't want to make my eyes bleed though so make it tasteful.

Contact / Issues -> Github.

Deploy to github pages npm command (don't use github actions ci.)


---

More tools for later. Right click, new entity or constraint or something...
- bisector, midpoint (custom fraction though?)


Support undo/redo, just for state changes to geometry.

---

selection doesnt get set on mousedown. only mousemove / mouseup. That way clicking the background to make the constraint menu go away doesnt clear the selection before the menu disappears.


Create a panel on the far left that lists all the different files ordered by recently viewed. The save/load/reset functionality can call go in that panel too. I should be able to toggle that panel open and closed.




Make sure this works on an iPad with a stylus. Right click with apple pencil?
Make an app icon thing, make it work offline.


There should be a constraint to handle ambiguities. Maybe one value is larger than another or something. When there is more than one solution...



