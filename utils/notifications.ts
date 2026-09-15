import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/utils/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  // Sur le web, les notifications push Expo ne s'appliquent pas : on sort
  // sans rien tenter, sinon l'utilisateur recoit une alerte parasite
  // « Must use physical device » a chaque connexion depuis un navigateur.
  if (Platform.OS === 'web') {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    // Obtenez le token EAS Project ID depuis Constants
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    
    if (!projectId) {
        console.warn('Project ID not found in config. Ensure eas.json or app.json contains it.');
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo Push Token:', token);
    } catch (e) {
      console.error('Error getting push token:', e);
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

export async function sendLocalNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
    },
    trigger: null, // Immédiat
  });
}

/**
 * Enregistre le jeton push en base.
 *
 * Indispensable pour les alertes « dossier en sommeil » : la tâche planifiée
 * tourne côté serveur et n'a aucun autre moyen de connaître les appareils de
 * l'utilisateur. Un même compte peut avoir plusieurs jetons (tél. + tablette).
 *
 * L'échec est volontairement silencieux : si la migration V2 n'a pas encore
 * été exécutée, l'application doit continuer à fonctionner normalement.
 */
export async function savePushToken(userId: string, token: string) {
  try {
    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
        device_name: Device.deviceName ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );
    if (error) {
      console.warn('[push] Jeton non enregistré :', error.message);
    }
  } catch (e) {
    console.warn('[push] Jeton non enregistré :', e);
  }
}

/** Identifiant du rappel quotidien local, pour pouvoir le remplacer. */
const STALE_DIGEST_ID = 'stale-digest';

/**
 * Filet de sécurité local : un rappel quotidien programmé sur l'appareil.
 *
 * La notification serveur (Edge Function) reste la source principale car elle
 * connaît l'état réel de la base. Ce rappel local prend le relais si le
 * téléphone est resté hors ligne ou si la tâche serveur n'est pas déployée.
 */
export async function scheduleStaleDigest(hour: number = 8, minute: number = 0) {
  try {
    await Notifications.cancelScheduledNotificationAsync(STALE_DIGEST_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: STALE_DIGEST_ID,
      content: {
        title: 'PC Trackers',
        body: 'Vérifiez vos dossiers en sommeil du jour.',
        data: { type: 'stale-digest' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (e) {
    console.warn('[push] Rappel quotidien non programmé :', e);
  }
}
