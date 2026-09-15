import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/utils/supabase';
import { Attachment } from '@/types';

const BUCKET = 'attachments';

/** Taille maximale acceptee par le bucket (25 Mo). */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Affiche une taille en octets de facon lisible : « 2,4 Mo ». */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

/** Famille de fichier, pour choisir une icone et une couleur. */
export type FileKind = 'image' | 'pdf' | 'document' | 'sheet' | 'archive' | 'other';

export function getFileKind(mimeType?: string | null, fileName?: string): FileKind {
  const mime = (mimeType ?? '').toLowerCase();
  const ext = (fileName ?? '').split('.').pop()?.toLowerCase() ?? '';

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(ext)) {
    return 'image';
  }
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.includes('word') || ['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext)) return 'document';
  if (mime.includes('sheet') || mime.includes('excel') || ['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return 'sheet';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'other';
}

/**
 * Nettoie un nom de fichier pour en faire un segment de chemin sur.
 * Les accents et espaces passent mal dans les URL de stockage.
 */
function safeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

/** Liste les pieces jointes d'un dossier, la plus recente en premier. */
export async function listAttachments(projectId: number): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((a: any) => ({
    id: a.id,
    projectId: a.project_id,
    fileName: a.file_name,
    storagePath: a.storage_path,
    mimeType: a.mime_type,
    sizeBytes: a.size_bytes,
    createdAt: a.created_at,
  }));
}

export interface PickedFile {
  name: string;
  mimeType?: string | null;
  size?: number | null;
  uri: string;
}

/**
 * Ouvre le selecteur de fichiers du systeme.
 * Renvoie null si l'utilisateur annule.
 */
export async function pickFiles(): Promise<PickedFile[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) return null;

  return result.assets.map((a) => ({
    name: a.name,
    mimeType: a.mimeType,
    size: a.size,
    uri: a.uri,
  }));
}

/**
 * Envoie un fichier dans le bucket puis enregistre ses metadonnees.
 *
 * Le chemin suit la convention <user_id>/<project_id>/<horodatage>-<nom>,
 * imposee par les regles de securite du stockage : le premier segment doit
 * etre l'identifiant de l'utilisateur connecte.
 */
export async function uploadAttachment(
  userId: string,
  projectId: number,
  file: PickedFile
): Promise<Attachment> {
  if (file.size && file.size > MAX_FILE_SIZE) {
    throw new Error(
      `« ${file.name} » fait ${formatFileSize(file.size)}. La limite est de ${formatFileSize(MAX_FILE_SIZE)}.`
    );
  }

  const path = `${userId}/${projectId}/${Date.now()}-${safeName(file.name)}`;

  // Le SDK Supabase attend un corps binaire. `fetch` sur l'URI locale
  // fonctionne aussi bien pour un blob web que pour un fichier local
  // renvoye par le selecteur sur mobile.
  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: file.mimeType ?? blob.type ?? 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      project_id: projectId,
      user_id: userId,
      file_name: file.name,
      storage_path: path,
      mime_type: file.mimeType ?? blob.type ?? null,
      size_bytes: file.size ?? blob.size ?? null,
    })
    .select()
    .single();

  if (error) {
    // La ligne n'a pas pu etre creee : on retire le fichier pour ne pas
    // laisser d'orphelin dans le stockage.
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(error.message);
  }

  return {
    id: data.id,
    projectId: data.project_id,
    fileName: data.file_name,
    storagePath: data.storage_path,
    mimeType: data.mime_type,
    sizeBytes: data.size_bytes,
    createdAt: data.created_at,
  };
}

/** Supprime la piece jointe : d'abord le fichier, puis sa ligne. */
export async function deleteAttachment(attachment: Attachment): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([attachment.storagePath]);

  // Un fichier deja absent ne doit pas empecher de nettoyer la ligne.
  if (storageError) {
    console.warn('[attachments] Fichier non supprime :', storageError.message);
  }

  const { error } = await supabase.from('attachments').delete().eq('id', attachment.id);
  if (error) throw new Error(error.message);
}

/**
 * URL temporaire pour consulter ou telecharger un fichier.
 * Le bucket est prive : aucun lien permanent n'existe.
 */
export async function getAttachmentUrl(
  attachment: Attachment,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(attachment.storagePath, expiresInSeconds, {
      download: Platform.OS === 'web' ? false : undefined,
    });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Lien indisponible');
  }
  return data.signedUrl;
}
