import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 1st of every month at 03:00 UTC — see convex/backups.ts for what runs.
crons.monthly(
  "monthly-backup",
  { day: 1, hourUTC: 3, minuteUTC: 0 },
  internal.backups.runMonthlyBackup,
);

export default crons;
