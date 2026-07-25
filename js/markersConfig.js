// ==========================================
// CONFIGURATION DES MARQUEURS
// ==========================================
//
// Point d'entrée unique pour ajouter/retirer
// un marqueur ArUco associé à un son.
//
// - id         : identifiant du marqueur ArUco (dictionnaire ARUCO)
// - audioFile  : chemin vers le fichier .wav ou .mp3 (aucune contrainte
//                de longueur ni de format commun entre marqueurs)
// - label      : nom affiché dans l'interface

export const MARKERS = [

  {
    id: 18,
    audioFile: "audio/marker-18.wav",
    label: "Compresseur"
  },

  {
    id: 24,
    audioFile: "audio/marker-24.mp3",
    label: "Ventilateur"
  },

  {
    id: 4,
    audioFile: "audio/marker-4.mp3",
    label: "Échappement"
  }

];
