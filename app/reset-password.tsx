import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Lock, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { supabase } from '@/utils/supabase';

const MIN_LENGTH = 6;

type Phase = 'checking' | 'ready' | 'invalid' | 'done';

/**
 * Ecran d'arrivee du lien de reinitialisation recu par e-mail.
 *
 * Supabase transmet les jetons de recuperation dans le FRAGMENT de l'URL
 * (apres le #), jamais dans la query string — ils ne transitent donc pas
 * par les journaux serveur. Selon la plateforme :
 *   - web    : supabase-js lit le fragment automatiquement et ouvre une
 *              session temporaire (evenement PASSWORD_RECOVERY)
 *   - mobile : le lien profond arrive via expo-linking et les jetons
 *              doivent etre passes manuellement a setSession()
 */
export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    /** Extrait les jetons d'un lien profond mobile et ouvre la session. */
    const consumeDeepLink = async (url: string | null) => {
      if (!url) return false;
      const fragment = url.split('#')[1];
      if (!fragment) return false;

      const params = new URLSearchParams(fragment);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (!access_token || !refresh_token) return false;

      const { error: sbError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      return !sbError;
    };

    const init = async () => {
      // Le lien de recuperation ouvre une session : sans elle, impossible
      // de changer le mot de passe.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        setPhase('ready');
        return;
      }

      if (Platform.OS !== 'web') {
        const initialUrl = await Linking.getInitialURL();
        if (await consumeDeepLink(initialUrl)) {
          if (!cancelled) setPhase('ready');
          return;
        }
      }

      if (!cancelled) setPhase('invalid');
    };

    // Sur le web, supabase-js peut emettre PASSWORD_RECOVERY juste apres
    // avoir lu le fragment : on ecoute pour ne pas afficher « lien invalide »
    // par erreur dans cette fenetre de quelques millisecondes.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || session) setPhase('ready');
    });

    init();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async () => {
    setError('');

    if (password.length < MIN_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      const { error: sbError } = await supabase.auth.updateUser({ password });
      if (sbError) throw sbError;
      setPhase('done');
    } catch (e: any) {
      setError(e?.message ?? 'Modification impossible. Redemandez un lien.');
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = async () => {
    // On ferme la session de recuperation pour forcer une vraie connexion
    // avec le nouveau mot de passe.
    await supabase.auth.signOut();
    router.replace('/login' as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topDecoration} />
      <View style={styles.bottomDecoration} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandAccent} />
            <View>
              <Text style={styles.brandTitle}>SUIVI PERMIS</Text>
              <Text style={styles.brandTitleGold}>PRO</Text>
            </View>
          </View>

          <View style={styles.card}>
            {phase === 'checking' && (
              <View style={styles.centerBlock}>
                <ActivityIndicator size="large" color={Colors.brandGold} />
                <Text style={styles.cardSubtitle}>Vérification du lien...</Text>
              </View>
            )}

            {phase === 'invalid' && (
              <>
                <View style={styles.cardHeader}>
                  <TriangleAlert size={28} color={Colors.orange} />
                  <Text style={styles.cardTitle}>Lien invalide ou expiré</Text>
                  <Text style={styles.cardSubtitle}>
                    Les liens de réinitialisation ne sont valables qu'une heure
                    et ne peuvent servir qu'une seule fois.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => router.replace('/forgot-password' as any)}
                  testID="request-new-link"
                >
                  <Text style={styles.submitText}>Demander un nouveau lien</Text>
                </TouchableOpacity>
              </>
            )}

            {phase === 'done' && (
              <>
                <View style={styles.cardHeader}>
                  <ShieldCheck size={28} color={Colors.emerald500} />
                  <Text style={styles.cardTitle}>Mot de passe modifié</Text>
                  <Text style={styles.cardSubtitle}>
                    Vous pouvez maintenant vous connecter avec votre nouveau
                    mot de passe.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={goToLogin}
                  testID="go-to-login"
                >
                  <Text style={styles.submitText}>Se connecter</Text>
                </TouchableOpacity>
              </>
            )}

            {phase === 'ready' && (
              <>
                <View style={styles.cardHeader}>
                  <Lock size={28} color={Colors.brandGold} />
                  <Text style={styles.cardTitle}>Nouveau mot de passe</Text>
                  <Text style={styles.cardSubtitle}>
                    Choisissez un mot de passe d'au moins {MIN_LENGTH} caractères
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>NOUVEAU MOT DE PASSE</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color={Colors.slate400} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={Colors.slate300}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      testID="new-password-input"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CONFIRMER</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color={Colors.slate400} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={Colors.slate300}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      testID="confirm-password-input"
                    />
                  </View>
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  testID="save-password-button"
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={styles.submitText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brandDark },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  topDecoration: {
    position: 'absolute',
    top: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: -80,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(212,175,55,0.06)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  brandAccent: {
    width: 3,
    height: 40,
    borderRadius: 2,
    backgroundColor: Colors.brandGold,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 1.5,
  },
  brandTitleGold: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.brandGold,
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  centerBlock: { alignItems: 'center', gap: 14, paddingVertical: 24 },
  cardHeader: { alignItems: 'center', marginBottom: 22, gap: 6 },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.slate800,
    marginTop: 4,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 19,
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.slate500,
    letterSpacing: 1,
    marginBottom: 7,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.slate50,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.slate800,
    fontWeight: '500' as const,
  },
  errorBox: {
    backgroundColor: Colors.red50,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontSize: 12, color: Colors.red500, fontWeight: '600' as const },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.brandDark,
    height: 54,
    borderRadius: 16,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
