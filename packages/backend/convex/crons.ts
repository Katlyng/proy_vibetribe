import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Refresh COP -> USD exchange rate",
  { hours: 6 },
  internal.currency.refreshExchangeRate,
  {}
);

export default crons;
