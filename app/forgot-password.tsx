import React, { useState } from 'react';
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
import { Mail, ArrowLeft, MailCheck, KeyRound } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { supabase } from '@/utils/supabase';

/**
 * Demande de reinitialisation du mot de passe.
 *
 * Supabase envoie un e-mail contenant un lien de recuperation. Ce lien doit
 * revenir vers l'ecran /reset-password, d'ou le calcul de `redirectTo` :
 *   - sur le web  : l'adresse du site + /reset-password
 *   - sur mobile  : un lien profond rork-app://reset-password
 */
export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const buildRedirectUrl = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return `${window.location.origin}/reset-password`;
    }
    return Linking.createURL('/reset-password');
  };

  const handleSubmit = async () => {
    setError('');

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Veuillez saisir votre adresse e-mail');
      return;
    }

    setIsLoading(true);
    try {
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: buildRedirectUrl(),
      });
      if (sbError) throw sbError;

      // On affiche la meme confirmation que l'adresse existe ou non :
      // indiquer « cette adresse est inconnue » revelerait qui possede
      // un compte a quiconque essaie des adresses au hasard.
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? 'Envoi impossible. Réessayez dans un instant.');
    } finally {
      setIsLoading(false);
    }
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
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => router.back()}
            testID="back-to-login"
          >
            <ArrowLeft size={18} color={Colors.brandGold} />
            <Text style={styles.backText}>Retour à la connexion</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            {sent ? (
              <>
                <View style={styles.cardHeader}>
                  <MailCheck size={28} color={Colors.emerald500} />
                  <Text style={styles.cardTitle}>E-mail envoyé</Text>
                  <Text style={styles.cardSubtitle}>
                    Si un compte existe pour {email.trim()}, vous allez recevoir
                    un lien de réinitialisation.
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Ouvrez le lien depuis cet appareil. Pensez à vérifier vos
                    courriers indésirables : le message peut y atterrir.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => router.replace('/login' as any)}
                  testID="back-after-sent"
                >
                  <Text style={styles.submitText}>Revenir à la connexion</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setSent(false)}
                >
                  <Text style={styles.toggleText}>
                    Adresse incorrecte ? <Text style={styles.toggleLink}>Recommencer</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.cardHeader}>
                  <KeyRound size={28} color={Colors.brandGold} />
                  <Text style={styles.cardTitle}>Mot de passe oublié</Text>
                  <Text style={styles.cardSubtitle}>
                    Saisissez votre adresse e-mail pour recevoir un lien de
                    réinitialisation
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color={Colors.slate400} />
                    <TextInput
                      style={styles.input}
                      placeholder="email@exemple.com"
                      placeholderTextColor={Colors.slate300}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      testID="forgot-email-input"
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
                  testID="send-reset-button"
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={styles.submitText}>Envoyer le lien</Text>
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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.brandGold,
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
  cardHeader: { alignItems: 'center', marginBottom: 22, gap: 6 },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.slate800,
    marginTop: 4,
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
  infoBox: {
    backgroundColor: Colors.slate50,
    borderRadius: 12,
    padding: 13,
    marginBottom: 18,
  },
  infoText: { fontSize: 12, color: Colors.slate600, lineHeight: 18 },
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
  toggleRow: { alignItems: 'center', marginTop: 18 },
  toggleText: { fontSize: 13, color: Colors.slate500 },
  toggleLink: { color: Colors.brandDark, fontWeight: '700' as const },
});
