// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// ---------------------------------------------------------------------
// Correctif : icones cassees dans le bundle web
//
// Sur le web, `react-native-svg` (dont depend lucide-react-native) plante
// des le rendu de la premiere icone :
//   "(0, n.hasTouchableProperty) is not a function"
// Le defaut vient du paquet lui-meme et existe independamment de notre
// code (verifie sur la version d'origine du projet).
//
// Solution : sur le web uniquement, on sert `lucide-react`, qui produit
// des <svg> DOM natifs sans passer par react-native-svg. L'API est
// identique (memes noms d'icones, memes props size / color / strokeWidth),
// donc aucun ecran n'a besoin d'etre modifie.
//
// Sur iOS et Android, rien ne change : lucide-react-native reste utilise.
// ---------------------------------------------------------------------
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'lucide-react-native') {
    return context.resolveRequest(context, 'lucide-react', platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
