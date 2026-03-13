# RAG Rules

## Task-level status
- `green`: completed or not due soon.
- `amber`: due within 2 hours, or overdue but still within grace window.
- `red`: overdue beyond grace window.

## Project usage
- Projects currently inherit urgency from their underlying child tasks and due dates.
- There is no separate stored project RAG field yet.
- A future project dashboard can roll up child-task RAG into a parent-project health state.

## Room rollup
- If any room task is red, room is red.
- Else if any room task is amber, room is amber.
- Else room is green.

## Household rollup
- V1: use worst room status across all active rooms.
- V2: add weighted scoring by room priority and number of overdue jobs.
