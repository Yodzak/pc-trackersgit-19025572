import { createTRPCRouter } from "./create-context";
import { authRouter } from "./routes/auth";
import { projectsRouter } from "./routes/projects";
import { eventsRouter } from "./routes/events";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  projects: projectsRouter,
  events: eventsRouter,
});

export type AppRouter = typeof appRouter;
