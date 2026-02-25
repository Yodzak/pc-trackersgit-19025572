import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { db } from "@/backend/db/store";

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(({ input }) => {
      const user = db.findUser(input.email);
      if (!user || user.password !== input.password) {
        throw new Error("Email ou mot de passe incorrect.");
      }
      console.log(`[AUTH] Login success: ${user.email}`);
      return { email: user.email, name: user.name, role: user.role };
    }),

  register: publicProcedure
    .input(z.object({ email: z.string(), password: z.string(), name: z.string() }))
    .mutation(({ input }) => {
      const user = db.createUser(input.email, input.password, input.name);
      console.log(`[AUTH] Register success: ${user.email}`);
      return { email: user.email, name: user.name, role: user.role };
    }),
});
