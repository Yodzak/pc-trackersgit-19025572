# PC TRACKERS — INSTALLATION EN LOCAL (WINDOWS)

Application Expo / React Native + Supabase.
Dossier : `D:\PC TRACKER\pc-trackers`

## PRÉREQUIS (UNE SEULE FOIS)

1. Installer **Node.js LTS** : https://nodejs.org → bouton « LTS » → installer avec les options par défaut.
2. Redémarrer l'ordinateur (ou au moins fermer toutes les fenêtres PowerShell).

## ÉTAPE 1 — INSTALLER LES DÉPENDANCES

Double-cliquer sur **`1-INSTALLER.bat`**.
Durée : 5 à 10 minutes. Laisser la fenêtre ouverte jusqu'à « INSTALLATION TERMINEE ».

Équivalent en ligne de commande :
```powershell
cd "D:\PC TRACKER\pc-trackers"
npm install --legacy-peer-deps
```

## ÉTAPE 2 — LANCER L'APPLICATION

### Version navigateur (la plus simple)
Double-cliquer sur **`2-LANCER-WEB.bat`** → le navigateur s'ouvre sur http://localhost:8081

### Version téléphone
1. Installer **Expo Go** sur le téléphone (Play Store / App Store).
2. Double-cliquer sur **`3-LANCER-MOBILE.bat`**.
3. Scanner le QR code affiché dans la fenêtre (PC et téléphone sur le même Wi-Fi).

Pour arrêter le serveur : `Ctrl + C` dans la fenêtre noire.

## BASE DE DONNÉES (SUPABASE)

Les clés Supabase sont déjà dans le fichier `.env` et dans `utils/supabase.ts`.
Si les tables n'existent pas encore dans le projet Supabase :
ouvrir Supabase → SQL Editor → coller le contenu de `db_setup.sql` → RUN.

## STRUCTURE

```
app/            écrans (Expo Router : dashboard, projets, checklist, calendrier, notes, login)
components/     composants réutilisables
providers/      état global (AppProvider)
utils/          supabase.ts, notifications.ts
constants/      couleurs, checklist
db_setup.sql    création des tables Supabase
```

## EN CAS DE PROBLÈME

| Problème | Solution |
|---|---|
| `node n'est pas reconnu` | Node.js n'est pas installé ou PC pas redémarré |
| Erreurs de dépendances | `npm install --legacy-peer-deps --force` |
| Page blanche / cache | `npx expo start --clear` |
| Port 8081 occupé | `npx expo start --port 8082` |
| Tout casser et recommencer | supprimer `node_modules` puis relancer `1-INSTALLER.bat` |

## GIT

Le dépôt est déjà lié à GitHub :
```powershell
cd "D:\PC TRACKER\pc-trackers"
git status
git add .
git commit -m "modifications locales"
git push
```

---

# MISE EN PLACE DES 5 NOUVEAUTES

Tout le code est ecrit et compile. Il reste 4 actions a faire par vos soins,
car elles demandent VOS identifiants (Supabase, Vercel, Expo).

## ETAPE A — Base de donnees (obligatoire, 2 min)

Sans cette etape, les alertes et les reglages ne fonctionnent pas.

1. Ouvrir Supabase > votre projet > **SQL Editor** > **New query**
2. Coller tout le contenu de **`db_migration_v2.sql`** > **RUN**
3. Verifier : les 3 dernieres lignes doivent afficher `resultat = 1`

Ce script ajoute :
- la date de derniere modification (`updated_at`) + mise a jour automatique
- la table des appareils pour les notifications (`push_tokens`)
- la table des reglages (`user_settings`)
- le correctif de modification des evenements du calendrier

## ETAPE B — Version web (PC + mobile + tablette)

Construire :
```
npm run build:web
```
Le site est genere dans le dossier `dist`.

Mise en ligne avec Vercel (gratuit) :
```
npx vercel --prod
```
La premiere fois, Vercel demande de creer/lier le projet. Le fichier
`vercel.json` contient deja la configuration.

Une fois en ligne, sur telephone ou tablette : ouvrir l'adresse dans le
navigateur > menu > **Ajouter a l'ecran d'accueil**. L'application apparait
alors avec son icone, comme une vraie application.

## ETAPE C — Notifications automatiques et rapport par e-mail

1. Installer l'outil Supabase :
   ```
   npm install -g supabase
   supabase login
   supabase link --project-ref oiexcrqfnwowzpcqeslh
   ```

2. Deployer la tache automatique :
   ```
   supabase functions deploy daily-check
   ```

3. Pour recevoir aussi le rapport par e-mail, creer un compte gratuit sur
   resend.com, puis :
   ```
   supabase secrets set RESEND_API_KEY=votre_cle
   ```
   Sans cette cle, les notifications push fonctionnent quand meme ;
   seul l'e-mail est ignore.

4. Ouvrir Supabase > SQL Editor > coller **`db_cron_setup.sql`**,
   remplacer la ligne marquee `COLLEZ_ICI_VOTRE_CLE_SERVICE_ROLE`
   (Project Settings > API > service_role), puis **RUN**.

La tache tourne ensuite chaque matin a 7h00 UTC.

## ETAPE D — Application Android installable

```
npm install -g eas-cli
eas login
npm run build:apk
```
EAS construit le fichier APK dans le cloud (10 a 20 min) et fournit un lien
de telechargement. Necessaire pour recevoir les notifications push :
Expo Go ne les prend plus en charge sur Android.

---

# CE QUI A CHANGE DANS L'APPLICATION

| Ecran | Nouveaute |
|---|---|
| Tableau de bord | Bandeau orange « X dossiers en sommeil », cliquable |
| Dossiers | Pastille « 12 j sans activite » + filtre « En sommeil » |
| **Rapport** (nouvel onglet) | Synthese complete + export PDF + reglages |

Dans l'onglet Rapport vous pouvez changer, sans toucher au code :
- le seuil d'alerte : 3, 7, 14 ou 30 jours
- la frequence du rapport : chaque jour, chaque lundi, chaque mois, ou jamais

## Nouveaux fichiers

```
db_migration_v2.sql              base de donnees (ETAPE A)
db_cron_setup.sql                planification (ETAPE C)
vercel.json                      configuration de mise en ligne
supabase/functions/daily-check/  tache automatique serveur
app/(tabs)/report/               ecran Rapport
components/StaleBadge.tsx        pastille d'inactivite
utils/report.ts                  calcul et rendu du rapport
```

## Correctifs de bugs preexistants

Trois defauts bloquaient la version navigateur, independamment des
nouveautes (verifie en recompilant le code d'origine) :

1. **Icones** : `react-native-svg` plantait sur le web. Les icones passent
   desormais par `lucide-react` sur le web uniquement (`metro.config.js`).
   iOS et Android ne changent pas.
2. **Cartes de statistiques invisibles** : animation en pilote natif, non
   supportee par le navigateur (`components/StatsCard.tsx`).
3. **Alerte parasite** au chargement sur navigateur
   (`utils/notifications.ts`).

Egalement corrige : la modification d'un dossier envoyait des champs
inexistants a la base, ce qui aurait fait echouer l'enregistrement apres
l'ajout de `updated_at`.

---

# AMELIORATIONS APRES REVUE SUR DONNEES REELLES

Verifie le 15 septembre 2026 sur la base de production (8 dossiers,
24 270 000 F de versements).

## Corrections

| Probleme | Consequence evitee |
|---|---|
| Session non persistee sur mobile | Il fallait ressaisir son mot de passe a **chaque ouverture** de l'app. AsyncStorage etait installe mais jamais branche. |
| Totaux fragiles | Une seule cle absente dans `expenses` affichait `NaN` sur tout le tableau de bord. Tous les montants sont desormais convertis defensivement. |
| Nom affiche « Utilisateur » | Les comptes sans `user_metadata.name` restaient anonymes. Repli sur le debut de l'e-mail. |
| Tris divergents | Le bandeau du tableau de bord et le rapport ne designaient pas le meme dossier prioritaire. |

## Ajouts

- **Ecran « Mot de passe oublie »** + ecran de reinitialisation
  (`app/forgot-password.tsx`, `app/reset-password.tsx`). Le layout racine
  autorise ces deux routes sans etre connecte.
- **Montants dans la liste des dossiers en sommeil** : quand tout dort
  depuis le meme nombre de jours, c'est le montant qui dit quoi relancer
  en premier. Tri par montant decroissant a duree egale.
- **Recherche elargie** : nom du client, type de projet (« R+1 ») ou
  numero de dossier.
- **Tirer pour rafraichir** sur l'ecran Rapport.

## A faire cote Supabase pour la reinitialisation

Authentication > URL Configuration > Redirect URLs, ajouter :
```
http://localhost:4173/reset-password
```
Puis, apres mise en ligne, l'equivalent sur le domaine de production.

## Point de securite restant

Authentication > activer **Leaked password protection** : refuse les mots
de passe presents dans les fuites publiques connues.

---

# CORRECTIF : DIALOGUES INVISIBLES SUR LE WEB

## Le symptome

Impossible de supprimer un dossier depuis le navigateur : le clic sur la
corbeille ne produisait strictement rien.

## La cause

`Alert.alert()` de react-native-web est une fonction VIDE :

```js
class Alert { static alert() {} }
```

Aucune boite ne s'affichait, et surtout le `onPress` du bouton
« Supprimer » n'etait jamais appele. La suppression ne partait donc
jamais. Le defaut touchait 8 endroits de l'application.

## Ce qui etait casse sur le web

| Endroit | Consequence |
|---|---|
| Liste des dossiers | Suppression impossible |
| Calendrier | Suppression d'alerte impossible + erreur de saisie invisible |
| Connexion | **Mot de passe errone : aucun message**, l'ecran semblait fige |
| Nouveau dossier | « Le nom du client est requis » invisible |
| Rapport | Erreurs d'export invisibles |
| Reglages | Echec d'enregistrement invisible |

## La correction

Nouveau fichier `utils/dialog.ts` avec deux fonctions :

- `showAlert(titre, message)` — message d'information
- `confirmAction({ title, message, ... })` — renvoie une promesse
  resolue a `true` si l'utilisateur confirme

Sur le web elles utilisent les dialogues du navigateur, sur iOS et
Android le composant `Alert` natif. Les 8 appels ont ete migres ;
plus aucun `Alert.alert` direct ne subsiste dans le code.

## Verification

Test effectue en neutralisant la confirmation pour qu'elle reponde
toujours « non » : le message
« Supprimer le dossier ? — Voulez-vous supprimer le dossier de ... »
est bien remonte, et les 8 dossiers sont restes intacts.
