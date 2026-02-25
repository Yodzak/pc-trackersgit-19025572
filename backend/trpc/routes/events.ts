import * as z from "zod";
import { createTRPCRouter, authedProcedure } from "../create-context";
import { db } from "@/backend/db/store";

export const eventsRouter = createTRPCRouter({
  list: authedProcedure.query(({ ctx }) => {
    console.log(`[API] Fetching events for ${ctx.userEmail}`);
    return db.getEvents(ctx.userEmail);
  }),

  add: authedProcedure
    .input(
      z.object({
        title: z.string(),
        date: z.string(),
        type: z.enum(["deadline", "meeting", "payment", "alert"]),
      })
    )
    .mutation(({ ctx, input }) => {
      console.log(`[API] Adding event for ${ctx.userEmail}: ${input.title}`);
      return db.addEvent(ctx.userEmail, input);
    }),

  delete: authedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => {
      console.log(`[API] Deleting event ${input.id} for ${ctx.userEmail}`);
      db.deleteEvent(ctx.userEmail, input.id);
      return { success: true };
    }),
});
