import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { TriangleAlert, Info } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { registerDialogHost, DialogRequest } from '@/utils/dialog';

/**
 * Boite de dialogue de l'application.
 *
 * Monte une seule fois dans le layout racine. `utils/dialog.ts` lui envoie
 * les demandes et attend la reponse, ce qui permet aux ecrans de garder
 * une ecriture simple :
 *
 *     const ok = await confirmAction({ title: '...' });
 *
 * Remplace les dialogues bruts du navigateur, qui juraient avec le reste
 * de l'interface.
 */
export const DialogHost: React.FC = () => {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    // Le host s'enregistre au montage et se retire au demontage.
    registerDialogHost((req) => setRequest(req));
    return () => registerDialogHost(null);
  }, []);

  const close = useCallback((result: boolean) => {
    setRequest((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  if (!request) return null;

  const isConfirm = request.kind === 'confirm';
  const destructive = request.destructive === true;
  const accent = destructive ? Colors.red500 : Colors.brandGold;
  const accentBg = destructive ? Colors.red50 : Colors.goldLight;

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      // Le bouton retour d'Android et la touche Echap comptent comme un refus.
      onRequestClose={() => close(false)}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => close(false)}
        testID="dialog-backdrop"
      >
        {/* Un clic dans la carte ne doit pas fermer la boite. */}
        <Pressable
          style={[styles.card, { maxWidth: Math.min(width - 48, 420) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.iconWrap, { backgroundColor: accentBg }]}>
            {destructive ? (
              <TriangleAlert size={22} color={accent} strokeWidth={2.5} />
            ) : (
              <Info size={22} color={Colors.brandDark} strokeWidth={2.5} />
            )}
          </View>

          <Text style={styles.title}>{request.title}</Text>
          {request.message ? (
            <Text style={styles.message}>{request.message}</Text>
          ) : null}

          <View style={styles.actions}>
            {isConfirm && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => close(false)}
                activeOpacity={0.8}
                testID="dialog-cancel"
              >
                <Text style={styles.cancelText}>
                  {request.cancelLabel ?? 'Annuler'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: destructive ? Colors.red500 : Colors.brandDark },
              ]}
              onPress={() => close(true)}
              activeOpacity={0.85}
              testID="dialog-confirm"
            >
              <Text style={styles.confirmText}>
                {request.confirmLabel ?? (isConfirm ? 'Confirmer' : 'OK')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 33, 33, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: Colors.slate800,
    textAlign: 'center',
  },
  message: {
    fontSize: 13.5,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.slate600,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
