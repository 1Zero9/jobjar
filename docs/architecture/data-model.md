# Data Model

Prisma schema source of truth: `web/prisma/schema.prisma`

## Core entities
- `User`
- `AuthCredential`
- `Household`
- `HouseholdMember`
- `Location`
- `Room`
- `Task`
- `TaskSchedule`
- `TaskOccurrence`
- `TaskLog`
- `TaskAssignment`
- `ProjectCost`
- `ProjectMaterial`
- `ProjectMilestone`
- `ShareLink`

## Task model direction
`Task` is the central work item.

A task can represent:
- a one-off household job
- a recurring upkeep item
- an issue
- a planning item
- a project parent
- a project step inside a project

Project behavior is modeled inside `Task` using:
- `jobKind`
- `projectParentId`
- `projectTargetAt`
- `projectBudgetCents`

Project spend is stored separately in `ProjectCost`.
Project shopping items are stored separately in `ProjectMaterial`.
Project checkpoints are stored separately in `ProjectMilestone`.

## Operational notes
- RAG status is derived from due date and grace window.
- Room status is rolled up from underlying tasks.
- Project progress is derived from project step and milestone completion, not a separate project state table.
