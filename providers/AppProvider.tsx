import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { User, ProjectRecord, CalendarEvent, ChecklistItem } from '@/types';
import { calculateTotalExpenses, calculateProfit } from '@/utils';
import { trpc, setTrpcUserEmail } from '@/lib/trpc';

const SESSION_KEY = 'permistrack_active_session';

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const utils = trpc.useUtils();

  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const saved = await AsyncStorage.getItem(SESSION_KEY);
      return saved ? (JSON.parse(saved) as User) : null;
    },
  });

  useEffect(() => {
    if (sessionQuery.data !== undefined && !isReady) {
      const loadedUser = sessionQuery.data;
      if (loadedUser) {
        setUser(loadedUser);
        setTrpcUserEmail(loadedUser.email);
        console.log('[APP] Session restored for:', loadedUser.email);
      }
      setIsReady(true);
    }
  }, [sessionQuery.data]);

  const projectsQuery = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });

  const eventsQuery = trpc.events.list.useQuery(undefined, {
    enabled: !!user,
  });

  const data = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password, name: userName, isSignUp }: { email: string; password: string; name?: string; isSignUp: boolean }) => {
      const normalizedEmail = email.toLowerCase().trim();

      if (isSignUp) {
        if (!userName) throw new Error('Nom requis');
        const result = await utils.client.auth.register.mutate({
          email: normalizedEmail,
          password,
          name: userName,
        });
        console.log('[APP] Register success via API:', result.email);
        return { email: result.email, name: result.name, role: result.role as 'admin' | 'viewer' };
      } else {
        const result = await utils.client.auth.login.mutate({
          email: normalizedEmail,
          password,
        });
        console.log('[APP] Login success via API:', result.email);
        return { email: result.email, name: result.name, role: result.role as 'admin' | 'viewer' };
      }
    },
    onSuccess: async (loggedInUser) => {
      setUser(loggedInUser);
      setTrpcUserEmail(loggedInUser.email);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(loggedInUser));
      utils.projects.list.invalidate();
      utils.events.list.invalidate();
      console.log('[APP] User session saved:', loggedInUser.email);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(SESSION_KEY);
    },
    onSuccess: () => {
      setUser(null);
      setTrpcUserEmail(null);
      queryClient.clear();
      console.log('[APP] User logged out');
    },
  });

  const addProjectMutation = trpc.projects.add.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      console.log('[APP] Project added, refreshing list');
    },
    onError: (err) => {
      console.error('[APP] Error adding project:', err.message);
    },
  });

  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      console.log('[APP] Project updated, refreshing list');
    },
    onError: (err) => {
      console.error('[APP] Error updating project:', err.message);
    },
  });

  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      console.log('[APP] Project deleted, refreshing list');
    },
    onError: (err) => {
      console.error('[APP] Error deleting project:', err.message);
    },
  });

  const updateNoteMutation = trpc.projects.updateNote.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      console.log('[APP] Note updated, refreshing list');
    },
    onError: (err) => {
      console.error('[APP] Error updating note:', err.message);
    },
  });

  const updateChecklistMutation = trpc.projects.updateChecklist.useMutation({
    onMutate: async ({ projectId, checklist }) => {
      await utils.projects.list.cancel();
      const previousData = utils.projects.list.getData();
      utils.projects.list.setData(undefined, (old) => {
        if (!old) return old;
        return old.map((p: ProjectRecord) =>
          p.id === projectId ? { ...p, checklist } : p
        );
      });
      return { previousData };
    },
    onError: (err, _vars, context) => {
      if (context?.previousData) {
        utils.projects.list.setData(undefined, context.previousData);
      }
      console.error('[APP] Error updating checklist:', err.message);
    },
    onSettled: () => {
      utils.projects.list.invalidate();
    },
  });

  const addEventMutation = trpc.events.add.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      console.log('[APP] Event added, refreshing list');
    },
    onError: (err) => {
      console.error('[APP] Error adding event:', err.message);
    },
  });

  const deleteEventMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      console.log('[APP] Event deleted, refreshing list');
    },
    onError: (err) => {
      console.error('[APP] Error deleting event:', err.message);
    },
  });

  const stats = useMemo(() => {
    return data.reduce(
      (acc, curr) => {
        const expenses = calculateTotalExpenses(curr);
        const profit = calculateProfit(curr);
        return {
          totalRevenue: acc.totalRevenue + curr.versements,
          totalExpenses: acc.totalExpenses + expenses,
          totalProfit: acc.totalProfit + profit,
          count: acc.count + 1,
        };
      },
      { totalRevenue: 0, totalExpenses: 0, totalProfit: 0, count: 0 }
    );
  }, [data]);

  const addProject = useCallback((recordData: Omit<ProjectRecord, 'id'>) => {
    addProjectMutation.mutate(recordData);
  }, [addProjectMutation]);

  const updateProject = useCallback((id: number, recordData: Omit<ProjectRecord, 'id'>) => {
    updateProjectMutation.mutate({ id, data: recordData });
  }, [updateProjectMutation]);

  const deleteProject = useCallback((id: number) => {
    deleteProjectMutation.mutate({ id });
  }, [deleteProjectMutation]);

  const updateNote = useCallback((projectId: number, newNote: string) => {
    updateNoteMutation.mutate({ projectId, note: newNote });
  }, [updateNoteMutation]);

  const updateChecklist = useCallback((projectId: number, checklist: ChecklistItem[]) => {
    updateChecklistMutation.mutate({ projectId, checklist });
  }, [updateChecklistMutation]);

  const addEvent = useCallback((event: Omit<CalendarEvent, 'id'>) => {
    addEventMutation.mutate(event);
  }, [addEventMutation]);

  const deleteEvent = useCallback((id: number) => {
    deleteEventMutation.mutate({ id });
  }, [deleteEventMutation]);

  return {
    user,
    data,
    events,
    stats,
    isReady,
    isLoading: projectsQuery.isLoading || eventsQuery.isLoading,
    loginMutation,
    logoutMutation,
    addProject,
    updateProject,
    deleteProject,
    updateNote,
    updateChecklist,
    addEvent,
    deleteEvent,
  };
});
