# Working agreement

This project runs against a local model with a 32k limit on any single
response. A reply that exceeds it is cut off mid-token, producing files that
look finished but are not. Every rule below exists to keep one response
comfortably under that limit.

In this project you are implementing a horizontal platform scrolling game in the style of super mario bros. It is called Unicorn Queens.

1. **Never rewrite a whole file to change part of it.** Use `edit` for
   existing files. `write` is only for creating a new file.

2. **Build in stages.** First a skeleton: structure, empty stubs, one-line
   comment per stub, no implementations. Then one subsystem per turn.

3. **Keep any single response under ~800 lines.** If the task needs more,
   do the first part and say what remains.

4. **Stop after each subsystem and wait.** Don't chain into the next one.

If a request seems to need a single large file in one go, say so and propose
a staged breakdown instead of attempting it.
