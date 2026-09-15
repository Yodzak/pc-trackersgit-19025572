import { Alert, Platform } from 'react-native';

/**
 * Dialogues de l'application.
 *
 * POURQUOI CE FICHIER EXISTE
 *
 * `Alert.alert()` de react-native-web est une fonction VIDE :
 *
 *     class Alert { static alert() {} }
 *
 * Sur le web, aucun message n'apparaissait et les rappels `onPress` des
 * boutons n'etaient jamais declenches : une suppression de dossier ne
 * partait donc jamais, et les erreurs de connexion restaient invisibles.
 *
 * COMMENT CA MARCHE
 *
 * `DialogHost` (monte une fois dans le layout racine) s'enregistre ici et
 * affiche une modale aux couleurs de l'application. Les ecrans gardent une
 * ecriture simple :
 *
 *     const ok = await confirmAction({ title: 'Supprimer ?' });
 *
 * Si aucun host n'est monte — rendu statique du site, tout premier instant
 * du demarrage — on retombe sur les dialogues natifs pour ne jamais perdre
 * un message.
 */

export interface DialogRequest {
  kind: 'alert' | 'confirm';
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (result: boolean) => void;
}

type DialogHandler = (request: DialogRequest) => void;

let host: DialogHandler | null = null;

/** Appele par DialogHost au montage, puis avec `null` au demontage. */
export function registerDialogHost(handler: DialogHandler | null): void {
  host = handler;
}

/** Repli natif quand la modale n'est pas disponible. */
function fallback(request: Omit<DialogRequest, 'resolve'>): boolean {
  const text = request.message ? `${request.title}\n\n${request.message}` : request.title;

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    return request.kind === 'confirm' ? window.confirm(text) : (window.alert(text), true);
  }

  Alert.alert(request.title, request.message);
  return true;
}

/** Message d'information simple. */
export function showAlert(title: string, message?: string): void {
  if (!host) {
    fallback({ kind: 'alert', title, message });
    return;
  }
  host({ kind: 'alert', title, message, resolve: () => {} });
}

interface ConfirmOptions {
  title: string;
  message?: string;
  /** Libelle du bouton de validation. Defaut : « Confirmer ». */
  confirmLabel?: string;
  /** Libelle du bouton d'annulation. Defaut : « Annuler ». */
  cancelLabel?: string;
  /** Bouton rouge et icone d'alerte, pour une action irreversible. */
  destructive?: boolean;
}

/**
 * Demande une confirmation et resout a `true` si l'utilisateur accepte.
 *
 * Toujours resolu, jamais rejete : fermer la boite compte comme un refus.
 * L'appelant n'a donc pas besoin de try/catch.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (!host) {
    return Promise.resolve(fallback({ kind: 'confirm', ...options }));
  }

  return new Promise<boolean>((resolve) => {
    host!({ kind: 'confirm', ...options, resolve });
  });
}
