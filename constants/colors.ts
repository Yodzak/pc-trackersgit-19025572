/**
 * Palette de l'application.
 *
 * Reprend la maquette fournie : barre laterale bleu nuit, fond bleu tres
 * clair, accent bleu vif, et quatre couleurs de categories.
 *
 * Les cles historiques (`brandDark`, `brandGold`, `brandGray`) sont
 * conservees et simplement repointees : les 16 fichiers qui les utilisent
 * adoptent le nouveau style sans etre modifies.
 */
export const Colors = {
  // --- Identite -------------------------------------------------------
  /** Bleu nuit de la barre laterale et des en-tetes. */
  brandDark: '#14356B',
  /** Accent bleu vif : boutons principaux, elements actifs. */
  brandGold: '#2F6BE4',
  /** Fond general, bleu tres clair. */
  brandGray: '#EAF1FB',
  /** Couleur a poser SUR un fond d'accent (texte et icones). */
  onBrand: '#FFFFFF',

  // --- Barre laterale -------------------------------------------------
  sidebarBg: '#14356B',
  sidebarActive: '#1E4A8F',
  sidebarText: '#C7D6EF',
  sidebarTextActive: '#FFFFFF',

  // --- Categories (cartes colorees de la maquette) --------------------
  catPurple: '#7A5AF5',
  catPurpleDark: '#6947E8',
  catTeal: '#12A3A3',
  catPink: '#E85C9A',
  catBlue: '#2F6BE4',

  // --- Neutres --------------------------------------------------------
  white: '#FFFFFF',
  black: '#000000',
  slate50: '#F7FAFF',
  slate100: '#EEF3FB',
  slate200: '#DCE6F5',
  slate300: '#B9C8E0',
  slate400: '#8A9CBB',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',

  // --- Etats ----------------------------------------------------------
  emerald500: '#10B981',
  emerald600: '#059669',
  red400: '#F87171',
  red500: '#EF4444',
  red50: '#FEF2F2',

  // --- Accents secondaires (statistiques, graphiques) -----------------
  orange: '#E8578E',
  orangeBg: '#FDE7F1',
  teal: '#12A3A3',
  tealBg: '#D6F3F3',
  amber: '#7A5AF5',
  amberBg: '#EDE8FE',
  yellow: '#2F6BE4',
  yellowBg: '#DFEAFD',
  blue100: '#DFEAFD',
  blue600: '#2F6BE4',

  // --- Voiles d'accent ------------------------------------------------
  goldLight: 'rgba(47, 107, 228, 0.12)',
  goldMedium: 'rgba(47, 107, 228, 0.28)',
};
