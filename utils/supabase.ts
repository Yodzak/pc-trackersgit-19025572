import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oiexcrqfnwowzpcqeslh.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Y_i9lzeS7Pq-kHUiXq7knQ_juvWC4Wm';

const isWeb = Platform.OS === 'web';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Sur mobile, sans adaptateur de stockage la session ne vit qu'en
    // memoire : elle disparait a chaque fermeture de l'application et
    // l'utilisateur doit ressaisir son mot de passe. AsyncStorage la
    // conserve sur l'appareil. Sur le web, on laisse supabase-js utiliser
    // localStorage, son comportement par defaut.
    storage: isWeb ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // La lecture des jetons dans l'URL n'a de sens que dans un navigateur.
    // C'est ce qui fait fonctionner le lien de reinitialisation du mot de
    // passe sur le web ; sur mobile, reset-password lit le lien profond.
    detectSessionInUrl: isWeb,
  },
});

// Le rafraichissement automatique des jetons doit s'arreter quand
// l'application passe en arriere-plan, sinon supabase-js continue de
// programmer des minuteurs que le systeme finit par tuer.
if (!isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
