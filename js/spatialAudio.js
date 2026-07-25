// ==========================================
// SPATIAL AUDIO — WEB AUDIO API (MULTI-SOURCE)
// ==========================================
//
// Un seul AudioContext partagé, mais autant de
// couples (élément <audio> + PannerNode HRTF) que
// de marqueurs validés. Chaque source est créée à
// la demande et gardée en mémoire dans `sources`,
// indexée par l'id du marqueur.
//
// Aucune contrainte de longueur ou de format (.wav /
// .mp3) entre les différentes sources : chacune est
// un graphe audio indépendant.

let audioContext =
  null;

const sources =
  new Map();


// ==========================================
// CONTEXTE AUDIO (créé au premier besoin)
// ==========================================

function ensureAudioContext() {

  if (!audioContext) {

    audioContext =
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();

  }

  return audioContext;

}


export function isAudioContextReady() {

  return audioContext !== null;

}


// ==========================================
// REPRISE DU CONTEXTE AUDIO
// (nécessaire après un geste utilisateur)
// ==========================================

export async function resumeAudioContext() {

  const ctx =
    ensureAudioContext();

  if (
    ctx.state === "suspended"
  ) {

    await ctx.resume();

  }

}


// ==========================================
// CRÉATION (OU RÉCUPÉRATION) D'UNE SOURCE
// SPATIALISÉE POUR UN MARQUEUR DONNÉ
// ==========================================

export function createSpatialSource(markerId, audioUrl) {


  // ========================================
  // DÉJÀ CRÉÉE ?
  // ========================================

  if (
    sources.has(markerId)
  ) {

    return sources.get(markerId);

  }


  const ctx =
    ensureAudioContext();


  // ========================================
  // ÉLÉMENT AUDIO (hors DOM, créé en JS)
  // ========================================

  const audioElement =
    new Audio(audioUrl);


  // Lecture en boucle pour une
  // ambiance sonore continue.

  audioElement.loop =
    true;

  audioElement.preload =
    "auto";


  // ========================================
  // GRAPHE WEB AUDIO
  // ========================================

  const sourceNode =
    ctx.createMediaElementSource(
      audioElement
    );

  const pannerNode =
    ctx.createPanner();


  // ========================================
  // SPATIALISATION HRTF
  // ========================================

  pannerNode.panningModel =
    "HRTF";


  // ========================================
  // MODÈLE D'ATTÉNUATION
  // ========================================

  pannerNode.distanceModel =
    "inverse";

  pannerNode.refDistance =
    1;

  pannerNode.maxDistance =
    10;

  pannerNode.rolloffFactor =
    1;


  // ========================================
  // CONNEXION AUDIO
  // ========================================

  sourceNode.connect(
    pannerNode
  );

  pannerNode.connect(
    ctx.destination
  );


  const entry = {

    audioElement,
    pannerNode

  };


  sources.set(
    markerId,
    entry
  );


  console.log(

    `Source spatiale créée pour le marqueur ${markerId}`

  );


  return entry;

}


// ==========================================
// POSITIONNEMENT D'UNE SOURCE
// ==========================================

export function setSourcePosition(markerId, x, y, z) {

  const entry =
    sources.get(markerId);

  if (!entry) {

    return;

  }

  entry.pannerNode.positionX.value =
    x;

  entry.pannerNode.positionY.value =
    y;

  entry.pannerNode.positionZ.value =
    z;

}


// ==========================================
// LECTURE D'UNE SOURCE
// ==========================================

export async function playSource(markerId) {

  const entry =
    sources.get(markerId);

  if (!entry) {

    return;

  }

  entry.audioElement.currentTime =
    0;

  await entry.audioElement.play();

}


// ==========================================
// ARRÊT D'UNE SOURCE
// ==========================================

export function stopSource(markerId) {

  const entry =
    sources.get(markerId);

  if (!entry) {

    return;

  }

  entry.audioElement.pause();

  entry.audioElement.currentTime =
    0;

}


// ==========================================
// LECTURE DE PLUSIEURS SOURCES EN MÊME TEMPS
// ==========================================

export async function playSources(markerIds) {

  await Promise.all(

    markerIds.map(
      id => playSource(id)
    )

  );

}


// ==========================================
// ARRÊT DE TOUTES LES SOURCES ACTIVES
// ==========================================

export function stopAllSources() {

  for (

    const markerId
    of
    sources.keys()

  ) {

    stopSource(markerId);

  }

}


// ==========================================
// UNE SOURCE A-T-ELLE ÉTÉ CRÉÉE POUR CE MARQUEUR ?
// ==========================================

export function hasSource(markerId) {

  return sources.has(markerId);

}
