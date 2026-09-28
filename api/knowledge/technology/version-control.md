---
title: Version control as a time machine
tag: technology
source: cognite-original
---

Version control is easy to treat as a backup button. Its deeper idea is that software is a history of decisions. A commit is a snapshot plus a message about why the snapshot exists. A branch is a parallel history. A merge is a negotiation between two histories that both claim to be true.

Git, the most common tool for this, stores snapshots of a project as a directed graph of commits. Each commit points to its parent (or parents). That graph lets you reconstruct any past state without keeping an endless stack of duplicate folders. It also makes collaboration possible: two people can change the same project, then reconcile those changes instead of overwriting one another.

Three practical habits matter more than advanced commands. First, commit in small, coherent pieces so the history is readable. Second, write messages that explain the reason for a change, not only the file list. Third, review diffs before you share them. A diff is a map of what actually moved, which is often more honest than memory.

Conflicts feel like failures, but they are the system doing its job. Git cannot know which of two edits to a paragraph is the intended one. A human has to decide. The same is true of product choices: tools can record options, but they cannot pick the goal. Version control does not invent intelligence. It externalizes memory so your attention can stay on the next decision.
