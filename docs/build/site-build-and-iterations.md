# Site Build And Iterations

## Product direction
JobJar is now a household work system rather than a flat chore board.

The core product loop is:
1. notice work
2. capture it quickly
3. shape it into a task
4. promote larger work into a project when needed
5. break projects into project steps
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
- project step creation
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
- scoped role model with `power_user` project access
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

## v2.5.0 — Fresh & playful visual redesign (2026-03-20)

Replaced the corporate blue palette and Inter font with a warmer, family-friendly look:

- **Green primary palette** — `#16a34a` replaces blue throughout. All shadows, borders, gradients, active states, and focus rings now use `rgba(22, 163, 74, …)`. Dark mode uses `#4ade80` as the primary accent.
- **Background tone** — `--bg` is now `#f5faf6` (light green tint) rather than cold white. Dark mode is `#0b1a10`.
- **Surface/border** — `--border-subtle` is `rgba(22, 163, 74, 0.16)`, giving cards a faint green edge.
- **Nunito font** — replaces Inter as the body/UI font. Warmer, rounder letterforms. Plus Jakarta Sans retained as the display/hero font. Loaded via `next/font/google` with weights 400–900.
- **Rounded corners** — `--radius-lg: 26px`, `--radius-md: 20px`, `--radius-sm: 14px` (slightly larger than before).
- **Browser theme-color** — updated to green in `layout.tsx` viewport config.
- **Profile colours preserved** — `.profile-boy-blue`, `.audience-under-12`, and related profile-theme sections were not touched.

## v2.4.0 — Steps UX overhaul (2026-03-20)

Rewrote the project/steps UX to be simple enough for a child or older person:

- **Steps live inside the parent card only** — child tasks are filtered from the main task list (`TasksPanelClient`). The parent card shows a checklist with per-step Done buttons.
- **Close whole job** — new `closeJobWithStepsAction`: closes all open children then the parent in one transaction.
- **Remove steps** — new `removeStepsAction`: archives all children, resets parent `jobKind` back to `"upkeep"`, returning it to a plain task.
- **Swipe-to-complete** — works for standard tasks in the summary row (left swipe → Done). Disabled for projects.
- **`TaskCardProjectDetail`** rewritten: progress bar, step checklist with Done buttons, suggestion chips, simple add-step form, "Close whole job" and "Remove steps" footer actions. No more costs, materials, or milestones.

## v2.3.0 — Simplified steps model (2026-03-20)

Replaced the complex project system with a simple task + steps model:

- **No more "promote" step** — any task gets steps added directly. Tapping "Add steps" in the task detail opens an inline form. `createProjectChildTaskAction` auto-sets `jobKind: "project"` on the first step added.
- **Auto-close parent** — when the last step is marked done, `completeTaskAction` checks all siblings. If all are done, the parent is automatically completed (captureStage → done, occurrence closed, log entry created).
- **Suggested steps** — based on keywords in the task title, a row of tap-to-fill chip suggestions appears. Covers: paint, decorate, clean, deep clean, fix, install, build, garden, move, bathroom, kitchen, diy. Lives in `src/lib/subtask-suggestions.ts`.
- **Simplified project detail** — removed costs, materials, milestones, demote button, legacy section. Panel now shows: progress bar, X of Y steps done, and the "Add step" form with suggestions.
- **Child task styling** — sub-tasks (`recorded-row-child`) render with a fainter left stripe and slightly smaller title, giving a clear visual hierarchy.
- **Removed** `hasLegacyProjectPlanningData`, `canDemoteProject`, `promoteTaskToProjectAction` from the UI layer. Data still in DB.

## v2.2.0 — Motion & transitions (2026-03-20)

Added a full page transition system and animation polish layer:

- **Page transitions**: `PageTransition` client component wraps all page content. On every route change, a spring-eased fade + slide-up plays (`cubic-bezier(0.22, 1, 0.36, 1)`, 360ms). Uses `useLayoutEffect` to reset the animation class before each paint.
- **Task card stagger**: On page enter, task cards in `.recorded-list` animate in sequentially (30ms → 295ms delay, 10 cards). Home page task cards also stagger via `.today-task-list`.
- **Settings/more card stagger**: Cards inside `.landing-grid` fade-slide in with 60–168ms stagger.
- **Task card detail reveal**: When a `<details>` card is opened, the detail content (`recorded-row-detail`) fades and slides up into view (200ms).
- **Task card hover lift**: Closed task cards lift 2px and deepen their shadow on hover, with border accent blend.
- **Bottom nav active indicator**: A 0.26rem dot appears below the active label with a spring pop (`cubic-bezier(0.34, 1.56, 0.64, 1)`). Primary (Log) button excluded.
- **Bottom nav icon bounce**: Active tab icon plays a 4-keyframe spring bounce (scale + translateY) when it receives the active state.
- **Reduced motion**: All new animations are suppressed via `@media (prefers-reduced-motion: reduce)`.

## What still wants iteration
- richer timeline interactions
- materials budget rollup into spend
- better timezone-aware due calculations
