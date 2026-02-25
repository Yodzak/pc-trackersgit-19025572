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
  Animated,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, ArrowRight, User, Building2 } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { loginMutation } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [buttonScale] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
  };

  const handleSubmit = () => {
    setError('');

    if (isSignUp) {
      if (!email || !password || !name || !confirmPassword) {
        setError('Veuillez remplir tous les champs');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        return;
      }
    } else {
      if (!email || !password) {
        setError('Veuillez remplir tous les champs');
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    loginMutation.mutate(
      { email, password, name, isSignUp },
      {
        onError: (err: Error) => {
          setError(err.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
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
            <View style={styles.cardHeader}>
              <Building2 size={28} color={Colors.brandGold} />
              <Text style={styles.cardTitle}>
                {isSignUp ? 'Créer un compte' : 'Connexion'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {isSignUp
                  ? 'Créez votre espace personnel'
                  : 'Accédez à vos données'}
              </Text>
            </View>

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOM COMPLET</Text>
                <View style={styles.inputWrapper}>
                  <User size={18} color={Colors.slate400} />
                  <TextInput
                    style={styles.input}
                    placeholder="Votre nom"
                    placeholderTextColor={Colors.slate300}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    testID="name-input"
                  />
                </View>
              </View>
            )}

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
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="email-input"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MOT DE PASSE</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={Colors.slate400} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.slate300}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  testID="password-input"
                />
              </View>
            </View>

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRMATION</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={Colors.slate400} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.slate300}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    testID="confirm-password-input"
                  />
                </View>
              </View>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                disabled={loginMutation.isPending}
                testID="submit-button"
              >
                {loginMutation.isPending ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Text style={styles.submitText}>
                      {isSignUp ? 'Créer' : 'Connexion'}
                    </Text>
                    <ArrowRight size={20} color={Colors.white} />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity onPress={toggleMode} style={styles.toggleRow}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Déjà un compte ? ' : 'Pas de compte ? '}
                <Text style={styles.toggleLink}>
                  {isSignUp ? 'Connexion' : 'Créer'}
                </Text>
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brandDark,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  topDecoration: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(212,175,55,0.05)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  brandAccent: {
    width: 4,
    height: 40,
    borderRadius: 2,
    backgroundColor: Colors.brandGold,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 1.5,
  },
  brandTitleGold: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.brandGold,
    letterSpacing: 1.5,
    marginTop: -4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: 28,
    gap: 16,
  },
  cardHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.slate800,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.slate400,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.slate500,
    letterSpacing: 1.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.slate200,
    paddingHorizontal: 14,
    gap: 10,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.slate700,
    fontWeight: '500' as const,
  },
  errorBox: {
    backgroundColor: Colors.red50,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  errorText: {
    color: Colors.red500,
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Colors.brandDark,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.brandDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  submitText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  toggleRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: 14,
    color: Colors.slate400,
  },
  toggleLink: {
    fontWeight: '700' as const,
    color: Colors.brandDark,
  },

});
