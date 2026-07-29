# Le Bandeur

Jeu mobile en hommage à ceux qui tirent les bandes sur le BA13.

## Le principe

Un mur de plaques de plâtre, des joints à bander. On pose le doigt sur le point
vert, on descend le long du joint sans lever le couteau, et on essaie de sortir
une bande droite, régulière, sans cloque et sans bavure.

Quatre choses sont notées :

| Critère | Ce qui compte |
|---|---|
| **Longueur bandée** | avoir fini tous les joints avant la fin du temps |
| **Rectitude** | rester dans l'axe du joint (sinon on tartine la plaque) |
| **Régularité du geste** | ni trop vite (ça manque d'enduit) ni trop lentement (bourrelet) |
| **Finition** | cloques chassées au ralenti, angles pris sans plisser |

Malus pour chaque bavure hors du joint et chaque reprise (couteau levé en cours
de bande). Bonus si le chantier est livré en avance.

Notation : ★ à 60 points, ★★ à 80, ★★★ à 92.

## Les 10 chantiers

Du simple montant de la chambre du fond jusqu'au chantier du vendredi soir
(quatre joints, des angles, six cloques et livraison lundi). Chaque chantier se
débloque en décrochant au moins une étoile sur le précédent.

## Technique

Trois fichiers, aucune dépendance, aucun réseau :

- `index.html` — les cinq écrans (menu, chantiers, règles, jeu, résultat)
- `style.css` — l'habillage
- `game.js` — géométrie des joints, moteur de jeu, rendu canvas, sons WebAudio

La progression est gardée dans `localStorage` (`bandeur.v1`). La géométrie est
exprimée en fraction de la hauteur du mur : le jeu se comporte pareil sur un
petit et sur un grand écran, et supporte la rotation en cours de partie.

## Y jouer

Ouvrir `bandeur/index.html` dans un navigateur, ou publier le dossier et aller
sur `/bandeur/`. Conçu pour le tactile, mais jouable à la souris.
