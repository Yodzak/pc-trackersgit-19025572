import React, { useState, useEffect, useMemo, createContext, useContext, ReactNode, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';
import { User, ProjectRecord, CalendarEvent, ChecklistItem } from '@/types';
import { calculateTotalExpenses, calculateProfit } from '@/utils';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, sendLocalNotification } from '@/utils/notifications';

interface AppContextType {
  user: User | null;
  data: ProjectRecord[];
  events: CalendarEvent[];
  stats: any;
  isReady: boolean;
  isLoading: boolean;
  loginMutation: any;
  logoutMutation: any;
  addProject: (data: Omit<ProjectRecord, 'id'>) => void;
  updateProject: (id: number, data: Omit<ProjectRecord, 'id'>) => void;
  deleteProject: (id: number) => void;
  updateNote: (id: number, note: string) => void;
  updateChecklist: (id: number, checklist: ChecklistItem[]) => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  deleteEvent: (id: number) => void;
  expoPushToken: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  
  const queryClient = useQueryClient();

  // 1. Gestion de la Session Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          name: session.user.user_metadata.name || 'Utilisateur',
          role: 'admin',
        });
      }
      setIsReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          name: session.user.user_metadata.name || 'Utilisateur',
          role: 'admin',
        });
      } else {
        setUser(null);
        queryClient.clear();
      }
      setIsReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Gestion des Notifications
  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync().then(token => {
          if (token) setExpoPushToken(token);
      });

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        setNotification(notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification Response:', response);
      });

      return () => {
        if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
        if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
      };
    }
  }, [user]);

  // 3. Récupération des Projets
  const projectsQuery = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      return (data || []).map((p: any) => ({
        id: p.id,
        clientName: p.clientName,
        projectType: p.projectType,
        versements: p.versements,
        expenses: typeof p.expenses === 'string' ? JSON.parse(p.expenses) : p.expenses,
        checklist: typeof p.checklist === 'string' ? JSON.parse(p.checklist) : p.checklist,
        notes: p.notes,
      })) as ProjectRecord[];
    },
    enabled: !!user,
  });

  // 4. Récupération des Événements
  const eventsQuery = useQuery({
    queryKey: ['events', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw new Error(error.message);
      
      return (data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        type: e.type,
      })) as CalendarEvent[];
    },
    enabled: !!user,
  });

  const projectsData = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const eventsData = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  // 5. Mutations
  const loginMutation = useMutation({
    mutationFn: async ({ email, password, name, isSignUp }: { email: string; password: string; name?: string; isSignUp: boolean }) => {
      try {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
          });
          if (error) throw error;
          return data.user;
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          return data.user;
        }
      } catch (error: any) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error: any) => Alert.alert('Erreur', error.message),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });

  const addProjectMutation = useMutation({
    mutationFn: async (newProject: Omit<ProjectRecord, 'id'>) => {
      if (!user) throw new Error("Non connecté");
      const payload = {
        clientName: newProject.clientName,
        projectType: newProject.projectType,
        versements: newProject.versements,
        expenses: newProject.expenses,
        checklist: newProject.checklist,
        notes: newProject.notes,
        user_id: user.id,
      };
      const { data, error } = await supabase.from('projects').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      sendLocalNotification('Succès', `Le dossier de ${data.clientName} a été ajouté.`);
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Omit<ProjectRecord, 'id'> }) => {
      const { error } = await supabase.from('projects').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      sendLocalNotification('Succès', `Le dossier de ${variables.data.clientName} a été mis à jour.`);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      sendLocalNotification('Suppression', `Le dossier a été supprimé avec succès.`);
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ projectId, note }: { projectId: number; note: string }) => {
      const { error } = await supabase.from('projects').update({ notes: note }).eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ projectId, checklist }: { projectId: number; checklist: ChecklistItem[] }) => {
      const { error } = await supabase.from('projects').update({ checklist }).eq('id', projectId);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const addEventMutation = useMutation({
    mutationFn: async (event: Omit<CalendarEvent, 'id'>) => {
      if (!user) throw new Error("Non connecté");
      const { error } = await supabase.from('events').insert({ ...event, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      sendLocalNotification('Agenda', `Un nouvel événement a été ajouté.`);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const stats = useMemo(() => {
    return projectsData.reduce(
      (acc, curr) => {
        const expenses = calculateTotalExpenses(curr);
        const profit = calculateProfit(curr);
        return {
          totalRevenue: acc.totalRevenue + curr.versements,
          totalExpenses: acc.totalExpenses + (expenses || 0),
          totalProfit: acc.totalProfit + (profit || 0),
          count: acc.count + 1,
        };
      },
      { totalRevenue: 0, totalExpenses: 0, totalProfit: 0, count: 0 }
    );
  }, [projectsData]);

  const value = {
    user,
    data: projectsData,
    events: eventsData,
    stats,
    isReady,
    isLoading: projectsQuery.isLoading || eventsQuery.isLoading,
    loginMutation,
    logoutMutation,
    addProject: (data: Omit<ProjectRecord, 'id'>) => addProjectMutation.mutate(data),
    updateProject: (id: number, data: Omit<ProjectRecord, 'id'>) => updateProjectMutation.mutate({ id, data }),
    deleteProject: (id: number) => deleteProjectMutation.mutate({ id }),
    updateNote: (projectId: number, note: string) => updateNoteMutation.mutate({ projectId, note }),
    updateChecklist: (projectId: number, checklist: ChecklistItem[]) => updateChecklistMutation.mutate({ projectId, checklist }),
    addEvent: (event: Omit<CalendarEvent, 'id'>) => addEventMutation.mutate(event),
    deleteEvent: (id: number) => deleteEventMutation.mutate({ id }),
    expoPushToken,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
