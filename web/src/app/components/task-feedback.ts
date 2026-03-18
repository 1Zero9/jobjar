export function getTaskFeedbackMessage(error?: string) {
  if (error === "task-title-required") {
    return "Add a job title before saving.";
  }
  if (error === "task-room-required") {
    return "Pick a room before saving this job.";
  }
  if (error === "task-not-found") {
    return "That job could not be found.";
  }
  if (error === "task-archive-complete-only") {
    return "Finish this job before archiving it.";
  }
  if (error === "task-archive-not-allowed") {
    return "Only power users and admins can archive jobs from the board.";
  }
  if (error === "task-strict-note-required") {
    return "Add a short note before finishing this strict job.";
  }
  if (error === "task-strict-start-required") {
    return "Start this strict job before marking it finished.";
  }
  if (error === "task-strict-minutes-required") {
    return "This strict job needs more tracked time before it can be finished.";
  }
  if (error === "project-demote-blocked") {
    return "Remove subtasks and any legacy planning extras before turning this back into a normal job.";
  }
  if (error === "project-child-title-required") {
    return "Enter a title before adding a subtask.";
  }
  if (error === "project-cost-title-required") {
    return "Enter a title for the project cost.";
  }
  if (error === "reward-amount-invalid") {
    return "Enter a valid value like 5 or 5.50.";
  }
  if (error === "reward-not-available") {
    return "That reward is not available for this job.";
  }
  if (error === "reward-pay-not-allowed") {
    return "Only the person who logged this reward can mark it paid.";
  }
  if (error === "reward-pay-before-accept") {
    return "Wait until the reward has been accepted before marking it paid.";
  }
  if (error === "reward-pay-before-complete") {
    return "Finish the job before marking the reward paid.";
  }
  if (error === "project-cost-amount-invalid") {
    return "Enter a valid amount greater than zero for the project cost.";
  }
  if (error === "project-cost-not-found") {
    return "That project cost could not be found.";
  }
  if (error === "project-material-title-required") {
    return "Enter a title before adding a project material.";
  }
  if (error === "project-material-not-found") {
    return "That project material could not be found.";
  }
  if (error === "project-milestone-title-required") {
    return "Enter a title before adding a project milestone.";
  }
  if (error === "project-milestone-not-found") {
    return "That project milestone could not be found.";
  }
  return "We could not save that job change.";
}
