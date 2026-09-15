import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Paperclip,
  Plus,
  Trash2,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
  Download,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { Attachment } from '@/types';
import { showAlert, confirmAction } from '@/utils/dialog';
import {
  listAttachments,
  pickFiles,
  uploadAttachment,
  deleteAttachment,
  getAttachmentUrl,
  formatFileSize,
  getFileKind,
  FileKind,
} from '@/utils/attachments';
import { formatDate } from '@/utils';

interface Props {
  projectId: number;
}

/** Icone et couleur par famille de fichier, pour reperer d'un coup d'oeil. */
const KIND_STYLE: Record<FileKind, { color: string; bg: string; Icon: any }> = {
  image: { color: Colors.orange, bg: Colors.orangeBg, Icon: ImageIcon },
  pdf: { color: Colors.red500, bg: Colors.red50, Icon: FileText },
  document: { color: Colors.blue600, bg: Colors.blue100, Icon: FileText },
  sheet: { color: Colors.teal, bg: Colors.tealBg, Icon: FileSpreadsheet },
  archive: { color: Colors.amber, bg: Colors.amberBg, Icon: FileArchive },
  other: { color: Colors.slate500, bg: Colors.slate100, Icon: FileIcon },
};

/**
 * Pieces jointes d'un dossier : plans, arretes, notices, photos de chantier.
 *
 * Les fichiers vivent dans un bucket prive. L'ouverture passe par une URL
 * signee valable une heure — aucun lien permanent n'existe, ce qui evite
 * qu'un document se retrouve accessible publiquement.
 */
export const AttachmentsSection: React.FC<Props> = ({ projectId }) => {
  const { user } = useApp();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);

  const queryKey = ['attachments', projectId];

  const { data: attachments = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => listAttachments(projectId),
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Non connecté');
      const files = await pickFiles();
      if (!files) return 0;

      // Un echec sur un fichier ne doit pas annuler les autres :
      // on les traite un par un et on regroupe les erreurs.
      const errors: string[] = [];
      let uploaded = 0;
      for (const file of files) {
        try {
          await uploadAttachment(user.id, projectId, file);
          uploaded++;
        } catch (e: any) {
          errors.push(e?.message ?? file.name);
        }
      }
      if (errors.length) throw new Error(errors.join('\n'));
      return uploaded;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey });
      // Une piece jointe compte comme une activite : le dossier sort du sommeil.
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (count) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: any) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showAlert('Envoi incomplet', e?.message ?? 'Erreur inconnue');
    },
  });

  const handleOpen = useCallback(async (attachment: Attachment) => {
    try {
      setBusyId(attachment.id);
      const url = await getAttachmentUrl(attachment);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
      } else {
        await Linking.openURL(url);
      }
    } catch (e: any) {
      showAlert('Ouverture impossible', e?.message ?? 'Erreur inconnue');
    } finally {
      setBusyId(null);
    }
  }, []);

  const handleDelete = useCallback(
    async (attachment: Attachment) => {
      const confirmed = await confirmAction({
        title: 'Supprimer ce fichier ?',
        message: `« ${attachment.fileName} » sera définitivement supprimé.`,
        confirmLabel: 'Supprimer',
        destructive: true,
      });
      if (!confirmed) return;

      try {
        setBusyId(attachment.id);
        await deleteAttachment(attachment);
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      } catch (e: any) {
        showAlert('Suppression impossible', e?.message ?? 'Erreur inconnue');
      } finally {
        setBusyId(null);
      }
    },
    [queryClient, projectId]
  );

  const totalSize = attachments.reduce((sum, a) => sum + (a.sizeBytes ?? 0), 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.accent} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Pièces jointes</Text>
          <Text style={styles.subtitle}>
            {attachments.length === 0
              ? 'Aucun fichier'
              : `${attachments.length} fichier${attachments.length > 1 ? 's' : ''} · ${formatFileSize(totalSize)}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => uploadMutation.mutate()}
          disabled={uploadMutation.isPending}
          activeOpacity={0.85}
          testID="add-attachment"
        >
          {uploadMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.onBrand} />
          ) : (
            <>
              <Plus size={15} color={Colors.onBrand} strokeWidth={3} />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="small" color={Colors.brandGold} />
        </View>
      ) : attachments.length === 0 ? (
        <TouchableOpacity
          style={styles.dropZone}
          onPress={() => uploadMutation.mutate()}
          activeOpacity={0.7}
        >
          <Paperclip size={22} color={Colors.slate300} />
          <Text style={styles.dropText}>Plans, arrêtés, notices, photos…</Text>
          <Text style={styles.dropHint}>25 Mo maximum par fichier</Text>
        </TouchableOpacity>
      ) : (
        attachments.map((a, i) => {
          const kind = KIND_STYLE[getFileKind(a.mimeType, a.fileName)];
          const Icon = kind.Icon;
          const busy = busyId === a.id;

          return (
            <TouchableOpacity
              key={a.id}
              style={[styles.row, i < attachments.length - 1 && styles.rowBorder]}
              onPress={() => handleOpen(a)}
              activeOpacity={0.7}
              testID={`attachment-${a.id}`}
            >
              <View style={[styles.fileIcon, { backgroundColor: kind.bg }]}>
                <Icon size={17} color={kind.color} />
              </View>

              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {a.fileName}
                </Text>
                <Text style={styles.fileMeta}>
                  {formatFileSize(a.sizeBytes)} · {formatDate(a.createdAt)}
                </Text>
              </View>

              {busy ? (
                <ActivityIndicator size="small" color={Colors.brandGold} />
              ) : (
                <View style={styles.rowActions}>
                  <View style={styles.iconButton}>
                    <Download size={15} color={Colors.slate400} />
                  </View>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleDelete(a)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    testID={`delete-attachment-${a.id}`}
                  >
                    <Trash2 size={15} color={Colors.red400} />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  accent: {
    width: 3,
    height: 26,
    borderRadius: 2,
    backgroundColor: Colors.brandGold,
  },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800' as const, color: Colors.slate800 },
  subtitle: { fontSize: 11, color: Colors.slate400, marginTop: 2 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.brandGold,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 10,
    minWidth: 92,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 12.5,
    fontWeight: '800' as const,
    color: Colors.onBrand,
  },
  empty: { paddingVertical: 24, alignItems: 'center' },
  dropZone: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 26,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.slate200,
    backgroundColor: Colors.slate50,
  },
  dropText: { fontSize: 13, color: Colors.slate500, fontWeight: '600' as const },
  dropHint: { fontSize: 11, color: Colors.slate400 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 13.5, fontWeight: '700' as const, color: Colors.slate800 },
  fileMeta: { fontSize: 11, color: Colors.slate400, marginTop: 2 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate50,
  },
});
