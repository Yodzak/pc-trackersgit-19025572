import * as z from "zod";
import { createTRPCRouter, authedProcedure } from "../create-context";
import { db } from "@/backend/db/store";

const expenseSchema = z.object({
  cuVet: z.number(),
  planArchi: z.number(),
  etudeSol: z.number(),
  noticeSecurite: z.number(),
  depotDossier: z.number(),
  depotDossierDate: z.string().optional(),
  panneauChantier: z.number(),
  apporteur: z.number(),
  autreDepense: z.number().default(0),
});

const checklistItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  completed: z.boolean(),
});

const projectInputSchema = z.object({
  clientName: z.string(),
  projectType: z.enum(['maison_basse', 'r1', 'r2', 'r3', 'autre']),
  versements: z.number(),
  expenses: expenseSchema,
  checklist: z.array(checklistItemSchema),
  notes: z.string().optional(),
});

export const projectsRouter = createTRPCRouter({
  list: authedProcedure.query(({ ctx }) => {
    console.log(`[API] Fetching projects for ${ctx.userEmail}`);
    return db.getProjects(ctx.userEmail);
  }),

  add: authedProcedure
    .input(projectInputSchema)
    .mutation(({ ctx, input }) => {
      console.log(`[API] Adding project for ${ctx.userEmail}: ${input.clientName}`);
      return db.addProject(ctx.userEmail, input);
    }),

  update: authedProcedure
    .input(z.object({ id: z.number(), data: projectInputSchema }))
    .mutation(({ ctx, input }) => {
      console.log(`[API] Updating project ${input.id} for ${ctx.userEmail}`);
      return db.updateProject(ctx.userEmail, input.id, input.data);
    }),

  delete: authedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => {
      console.log(`[API] Deleting project ${input.id} for ${ctx.userEmail}`);
      db.deleteProject(ctx.userEmail, input.id);
      return { success: true };
    }),

  updateNote: authedProcedure
    .input(z.object({ projectId: z.number(), note: z.string() }))
    .mutation(({ ctx, input }) => {
      console.log(`[API] Updating note for project ${input.projectId}`);
      db.updateNote(ctx.userEmail, input.projectId, input.note);
      return { success: true };
    }),

  updateChecklist: authedProcedure
    .input(z.object({ projectId: z.number(), checklist: z.array(checklistItemSchema) }))
    .mutation(({ ctx, input }) => {
      console.log(`[API] Updating checklist for project ${input.projectId}`);
      db.updateChecklist(ctx.userEmail, input.projectId, input.checklist);
      return { success: true };
    }),
});
