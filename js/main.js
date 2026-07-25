// ==========================================
// MAIN — ORCHESTRATION DE L'APPLICATION
// (multi-marqueurs, écoute spatiale simultanée,
// affichage des cartes uniquement à la détection)
// ==========================================

import {
  resumeAudioContext,
  createSpatialSource,
  setSourcePosition,
  playSources,
  stopSource,
  stopAllSources
} from "./spatialAudio.js";

import {
  estimatePose
} from "./pose.js";

import {
  createAcquisitionTracker
} from "./acquisition.js";

import {
  startCamera
} from "./camera.js";

import {
  detectMarkers,
  indexMarkersById,
  drawMarker
} from "./aruco.js";

import {
  MARKERS
} from "./markersConfig.js";


// ==========================================
// ÉLÉMENTS HTML
// ==========================================

const video =
  document.getElementById("video");

const canvas =
  document.getElementById("canvas");

const context =
  canvas.getContext("2d");

const status =
  document.getElementById("status");

const markersPanel =
  document.getElementById("markersPanel");

const listenButton =
  document.getElementById("listenButton");

const stopButton =
  document.getElementById("stopButton");


// ==========================================
// NOMBRE DE FRAMES SANS DÉTECTION TOLÉRÉES
// AVANT DE RETIRER LA CARTE DU PANNEAU
// ==========================================
//
// Évite que la carte clignote à cause d'une
// détection ponctuellement instable (une frame
// ratée de temps en temps est normal).

const MISS_FRAMES_BEFORE_HIDE =
  15;


// ==========================================
// ÉTAT PAR MARQUEUR
// ==========================================
//
// - trackers : un tracker d'acquisition indépendant
//   par marqueur CONFIGURÉ (créé une fois, persiste
//   même quand la carte n'est pas affichée)
// - rows     : les éléments DOM des cartes
//   actuellement AFFICHÉES (créées/retirées à la volée)
// - missCounts : compteur de frames consécutives
//   sans détection, par marqueur

const trackers =
  new Map();

const rows =
  new Map();

const missCounts =
  new Map();


// Marqueurs déverrouillés manuellement : on
// bloque le redémarrage automatique de l'acquisition
// tant que le marqueur n'est pas sorti du champ puis
// revenu (sinon il se reverrouille instantanément
// puisque la caméra pointe toujours dessus).

const suspended =
  new Set();


// ==========================================
// INITIALISATION DES TRACKERS
// ==========================================

function initTrackers() {

  for (

    const config
    of
    MARKERS

  ) {

    trackers.set(
      config.id,
      createAcquisitionTracker()
    );

    missCounts.set(
      config.id,
      0
    );

  }

}


// ==========================================
// COULEUR D'ÉTAT (lue depuis les variables CSS)
// ==========================================
//
// Une seule source de vérité pour les couleurs :
// le fichier css/style.css. Le cadre dessiné sur
// le canvas réutilise ainsi exactement les mêmes
// teintes que l'anneau de progression du panneau.

function getStateColor(state) {

  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--state-${state}`)
    .trim();

}


// ==========================================
// CIRCONFÉRENCE DE L'ANNEAU (r = 19)
// ==========================================

const RING_CIRCUMFERENCE =
  2 * Math.PI * 19;


// ==========================================
// CRÉATION D'UNE CARTE (à la détection)
// ==========================================

function createRow(config) {

  if (
    rows.has(config.id)
  ) {

    return rows.get(config.id);

  }


  const row =
    document.createElement("div");

  row.className =
    "markerRow";

  row.dataset.state =
    "idle";


  row.innerHTML = `
    <div class="ringWrap">
      <svg class="ring" viewBox="0 0 44 44">
        <circle class="ringTrack" cx="22" cy="22" r="19"></circle>
        <circle class="ringProgress" cx="22" cy="22" r="19"></circle>
      </svg>
    </div>
    <div class="markerInfo">
      <div class="markerHeader">
        <span class="markerLabel">${config.label}</span>
        <span class="markerId">#${config.id}</span>
      </div>
      <div class="markerStatus">STANDBY</div>
      <div class="markerCoords">X --.--- Y --.--- Z --.--- m</div>
    </div>
    <button class="unlockBtn" type="button" title="Déverrouiller ce marqueur">
      ⟲
    </button>
  `;


  markersPanel.appendChild(
    row
  );


  const entry = {

    rowEl:
      row,

    statusEl:
      row.querySelector(".markerStatus"),

    coordsEl:
      row.querySelector(".markerCoords"),

    ringEl:
      row.querySelector(".ringProgress"),

    unlockBtn:
      row.querySelector(".unlockBtn")

  };


  rows.set(
    config.id,
    entry
  );


  // ========================================
  // BOUTON DE DÉVERROUILLAGE
  // ========================================
  //
  // Visible uniquement quand la carte est à
  // l'état "validated" (voir CSS). Remet le
  // marqueur à zéro : une nouvelle acquisition
  // de 2s repart dès qu'il est revu par la caméra.

  entry.unlockBtn.addEventListener(

    "click",

    (event) => {

      event.stopPropagation();

      unlockMarker(config.id);

    }

  );


  return entry;

}


// ==========================================
// DÉVERROUILLAGE D'UN MARQUEUR
// ==========================================

function unlockMarker(id) {

  const tracker =
    trackers.get(id);

  tracker.reset();

  stopSource(id);

  suspended.add(id);


  if (
    rows.has(id)
  ) {

    setMarkerState(
      id,
      "idle"
    );

    setMarkerStatus(
      id,
      "STANDBY"
    );

    setMarkerProgress(
      id,
      0
    );

    rows.get(id).coordsEl.innerText =
      "X --.--- Y --.--- Z --.--- m";

  }


  if (
    getValidatedMarkerIds().length === 0
  ) {

    listenButton.disabled =
      true;

    listenButton.classList
      .remove("ready");

  }

}


// ==========================================
// RETRAIT D'UNE CARTE (marqueur hors champ)
// ==========================================

function removeRow(id) {

  const entry =
    rows.get(id);

  if (!entry) {

    return;

  }

  entry.rowEl.remove();

  rows.delete(id);

}


// ==========================================
// MISE À JOUR DE L'ÉTAT VISUEL D'UN MARQUEUR
// ==========================================
//
// Ces fonctions supposent que la carte existe déjà
// (appelées uniquement depuis la boucle de détection,
// juste après createRow).

function setMarkerState(id, state) {

  rows.get(id).rowEl.dataset.state =
    state;

}


function setMarkerProgress(id, ratio) {

  const offset =

    RING_CIRCUMFERENCE
    *
    (1 - ratio);

  rows.get(id).ringEl.style.strokeDashoffset =

    `${offset}`;

}


function setMarkerStatus(id, text) {

  rows.get(id).statusEl.innerText =
    text;

}


function setMarkerCoords(id, position) {

  rows.get(id).coordsEl.innerText =

    `X ${position.X.toFixed(3)}  ` +
    `Y ${position.Y.toFixed(3)}  ` +
    `Z ${position.Z.toFixed(3)} m`;

}


// ==========================================
// UN MARQUEUR VIENT D'ÊTRE VALIDÉ
// ==========================================
//
// On crée dès maintenant sa source audio
// spatialisée et on la positionne. La lecture
// elle-même n'est déclenchée que par le bouton
// LISTEN (geste utilisateur requis par les
// navigateurs pour démarrer l'audio).

function onMarkerValidated(config, position) {

  createSpatialSource(
    config.id,
    config.audioFile
  );

  setSourcePosition(
    config.id,
    position.X,
    position.Y,
    position.Z
  );

  setMarkerState(
    config.id,
    "validated"
  );

  setMarkerStatus(
    config.id,
    "LOCKED"
  );

  setMarkerProgress(
    config.id,
    1
  );


  listenButton.disabled =
    false;

  listenButton.classList
    .add("ready");

}


// ==========================================
// Y A-T-IL AU MOINS UN MARQUEUR VALIDÉ ?
// ==========================================

function getValidatedMarkerIds() {

  const ids =
    [];

  for (

    const [id, tracker]
    of
    trackers

  ) {

    if (
      tracker.isValidated()
    ) {

      ids.push(id);

    }

  }

  return ids;

}


// ==========================================
// DÉTECTION ARUCO — BOUCLE PRINCIPALE
// ==========================================

function detectLoop() {


  // ========================================
  // VIDÉO PRÊTE ?
  // ========================================

  if (

    video.readyState
    !==
    video.HAVE_ENOUGH_DATA

  ) {

    requestAnimationFrame(detectLoop);

    return;

  }


  // ========================================
  // DIMENSIONS
  // ========================================

  const width =
    video.videoWidth;

  const height =
    video.videoHeight;


  if (

    width === 0 ||
    height === 0

  ) {

    requestAnimationFrame(detectLoop);

    return;

  }


  // ========================================
  // CANVAS
  // ========================================

  if (

    canvas.width !== width ||
    canvas.height !== height

  ) {

    canvas.width =
      width;

    canvas.height =
      height;

  }


  // ========================================
  // IMAGE CAMÉRA
  // ========================================

  context.drawImage(

    video,

    0,
    0,

    width,
    height

  );


  const imageData =

    context.getImageData(

      0,
      0,

      width,
      height

    );


  // ========================================
  // DÉTECTION (tous marqueurs confondus)
  // ========================================

  const markers =
    detectMarkers(imageData);

  const markersById =
    indexMarkersById(markers);


  // ========================================
  // BOUCLE SUR CHAQUE MARQUEUR CONFIGURÉ
  // ========================================

  for (

    const config
    of
    MARKERS

  ) {

    const tracker =
      trackers.get(config.id);

    const marker =
      markersById.get(config.id);


    if (marker) {


      missCounts.set(
        config.id,
        0
      );


      // ======================================
      // LA CARTE APPARAÎT DÈS LA DÉTECTION
      // ======================================

      createRow(config);


      drawMarker(

        context,
        marker,

        getStateColor(

          tracker.isValidated()
            ? "validated"
            : suspended.has(config.id)
              ? "idle"
              : "measuring"

        )

      );


      const position =
        estimatePose(marker, video);


      // ======================================
      // DÉJÀ VALIDÉ AUPARAVANT
      // (le marqueur revient dans le champ après
      // avoir été verrouillé une première fois)
      // ======================================

      if (
        tracker.isValidated()
      ) {

        setMarkerState(
          config.id,
          "validated"
        );

        setMarkerStatus(
          config.id,
          "LOCKED"
        );

        setMarkerCoords(
          config.id,
          tracker.getValidatedPosition()
        );

        setMarkerProgress(
          config.id,
          1
        );

      }


      // ======================================
      // DÉMARRAGE ACQUISITION
      // ======================================

      if (

        !tracker.isActive()
        &&
        !tracker.isValidated()
        &&
        !suspended.has(config.id)

      ) {

        tracker.start();

        setMarkerState(
          config.id,
          "measuring"
        );

        setMarkerStatus(
          config.id,
          "MEASURING"
        );

      }


      // ======================================
      // ACQUISITION EN COURS
      // ======================================

      if (
        tracker.isActive()
      ) {

        tracker.addPosition(position);

        setMarkerCoords(config.id, position);

        setMarkerProgress(
          config.id,
          tracker.getProgress()
        );


        if (
          tracker.isTimeElapsed()
        ) {

          const result =
            tracker.finish();


          if (result.success) {

            onMarkerValidated(
              config,
              result.position
            );

          }

          else {

            setMarkerState(
              config.id,
              "error"
            );

            setMarkerStatus(
              config.id,
              "RETRY"
            );

          }

        }

      }


    }

    else {


      // ======================================
      // MARQUEUR NON DÉTECTÉ CE FRAME
      // ======================================

      if (
        tracker.isActive()
      ) {

        tracker.cancel();

        if (
          rows.has(config.id)
        ) {

          setMarkerState(
            config.id,
            "idle"
          );

          setMarkerStatus(
            config.id,
            "SIGNAL LOST"
          );

          setMarkerProgress(
            config.id,
            0
          );

        }

      }


      const misses =

        (missCounts.get(config.id) || 0)
        + 1;

      missCounts.set(
        config.id,
        misses
      );


      // ======================================
      // RETRAIT DE LA CARTE APRÈS LE DÉLAI
      // DE TOLÉRANCE (hors champ trop longtemps)
      // ======================================

      if (
        misses
        >=
        MISS_FRAMES_BEFORE_HIDE
      ) {

        removeRow(config.id);

        suspended.delete(
          config.id
        );

      }

    }

  }


  requestAnimationFrame(detectLoop);

}


// ==========================================
// BOUTON LISTEN
// ==========================================
//
// Joue simultanément toutes les sources déjà
// validées, chacune spatialisée à sa position.
// Les marqueurs validés après ce clic peuvent
// être ajoutés à l'écoute par un nouveau clic
// sur LISTEN (redémarre l'ensemble depuis 0).

listenButton.addEventListener(

  "click",

  async () => {

    const validatedIds =
      getValidatedMarkerIds();


    if (
      validatedIds.length === 0
    ) {

      console.warn(
        "Aucune position validée"
      );

      return;

    }


    await resumeAudioContext();


    await playSources(
      validatedIds
    );


    stopButton.disabled =
      false;

    stopButton.classList
      .add("active");

  }

);


// ==========================================
// BOUTON STOP
// ==========================================

stopButton.addEventListener(

  "click",

  () => {

    stopAllSources();


    stopButton.classList
      .remove("active");


    console.log(
      "Lecture audio arrêtée"
    );

  }

);


// ==========================================
// LANCEMENT
// ==========================================

initTrackers();

startCamera(video, status);


video.addEventListener(

  "loadeddata",

  () => {

    detectLoop();

  }

);
