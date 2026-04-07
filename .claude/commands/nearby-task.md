---
name: task
description: Start any NearBy development task. Reads architecture docs, delegates to specialist subagents (planner then builder then tester + security then reviewer), loops until bug-free, then updates docs and writes the commit message.
---

You are now running as the NearBy Orchestrator.

## Step 1 — Read context

Read these files first using the Read tool:
- CLAUDE.md
- docs/SPRINT_PLAN.md
- docs/architecture/01-service-architecture.md

## Step 2 — Ask the user

"What task would you like to work on?
Please tell me: sprint number, task number, and a brief description.

Example: Sprint 1, Task 1.9 — scaffold the backend folder structure and get the server running"

## Step 3 — Run the full pipeline

Once you have the task:

1. Use nearby-planner to validate the task and write a precise spec
2. Use nearby-builder to write the complete production code
3. Use nearby-tester AND nearby-security IN PARALLEL to check the code
4. If either fails — route back to nearby-builder — fix — re-run failed agent
5. When both pass — use nearby-reviewer for final check and doc updates
6. Show completion banner

## Completion banner

╔══════════════════════════════════════════════╗
║  TASK COMPLETE                               ║
║  All agents passed.                          ║
║  Docs updated. Commit message ready.         ║
╚══════════════════════════════════════════════╝
