# Site Build And Iterations

## Product direction
JobJar is now a household work system rather than a flat chore board.

The core product loop is:
1. notice work
2. capture it quickly
3. shape it into a task
4. promote larger work into a project when needed
5. break projects into child tasks
6. review progress and spend

## Current surfaces

### `/log`
- fastest way to capture work
- minimal optional detail
- recurring setup for simple routine items

### `/tasks`
- general work board
- edit, assign, schedule, and complete tasks
- promote a task into a project

### `/projects`
- dedicated project board
- project-state filters
- project target date and budget
- child task creation
- cost line tracking
- materials and shopping list
- milestone tracking

### `/projects/timeline`
- date view across project targets, milestone dates, and child due dates
- overdue, upcoming, and recently done sections
- fast route back to the parent project card

### `/stats`
- household reporting
- recurring health
- recent completions
- project health and spend

### `/admin`
- people, rooms, and task shaping
- admin-only management controls

## Key iterations to date
- household auth and bootstrap
- recurring schedules and occurrence tracking
- assignment and validation rules
- private-task visibility rules
- task parent/child project model
- project planning fields and cost tracking
- project milestones and risk reporting
- dedicated project route and filters
- dedicated project timeline route
- project materials and shopping workflow
- docs realigned with current route model

## Stable build routine
```bash
cd web
npm run db:generate
npm run lint
npm run build
```

If schema changed:

```bash
cd web
npm run db:migrate -- --name <change-name>
npm run db:deploy
```

## What still wants iteration
- richer timeline interactions
- materials budget rollup into spend
- better timezone-aware due calculations
