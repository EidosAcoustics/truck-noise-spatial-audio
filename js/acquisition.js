// ==========================================
// ACQUISITION — MESURE DE POSITION SUR 2s
// ==========================================
//
// Factory produisant un "tracker" d'acquisition
// indépendant. Chaque marqueur configuré obtient
// sa propre instance (cf. markersConfig.js + main.js),
// ce qui permet à plusieurs marqueurs d'être en cours
// d'acquisition simultanément sans interférer.
//
// Ce module ne touche plus au DOM : il renvoie juste
// des résultats, c'est à l'appelant (main.js) de
// mettre à jour l'interface.

import { median } from "./pose.js";


// Durée de l'acquisition
// avant validation de la position.

const ACQUISITION_TIME =
  2000;


// Nombre minimum de mesures
// pour valider une position.

const MIN_SAMPLES =
  5;


// ==========================================
// CRÉATION D'UN TRACKER D'ACQUISITION
// ==========================================

export function createAcquisitionTracker() {


  let active =
    false;

  let validated =
    false;

  let startTime =
    0;

  let positions =
    [];

  let validatedPosition =
    null;


  // ========================================
  // DÉMARRAGE D'UNE ACQUISITION
  // ========================================

  function start() {

    active =
      true;

    validated =
      false;

    startTime =
      performance.now();

    positions =
      [];

    validatedPosition =
      null;

  }


  // ========================================
  // AJOUT D'UNE MESURE
  // ========================================

  function addPosition(position) {

    positions.push(
      position
    );

  }


  // ========================================
  // TEMPS ÉCOULÉ
  // ========================================

  function getElapsed() {

    return (
      performance.now()
      -
      startTime
    );

  }


  function isTimeElapsed() {

    return (
      getElapsed()
      >=
      ACQUISITION_TIME
    );

  }


  // ========================================
  // FIN D'ACQUISITION
  // ========================================
  //
  // Renvoie { success: false } si pas assez
  // de mesures, ou { success: true, position }
  // si la position médiane a pu être calculée.

  function finish() {

    active =
      false;


    if (
      positions.length
      <
      MIN_SAMPLES
    ) {

      return {
        success: false
      };

    }


    const medianX =
      median(
        positions.map(p => p.X)
      );

    const medianY =
      median(
        positions.map(p => p.Y)
      );

    const medianZ =
      median(
        positions.map(p => p.Z)
      );


    validatedPosition = {

      X: medianX,
      Y: medianY,
      Z: medianZ

    };


    validated =
      true;


    return {

      success: true,

      position: validatedPosition

    };

  }


  // ========================================
  // ANNULATION (marqueur perdu)
  // ========================================

  function cancel() {

    active =
      false;

    positions =
      [];

  }


  // ========================================
  // PROGRESSION (0 à 1, pour l'anneau visuel)
  // ========================================

  function getProgress() {

    if (validated) {

      return 1;

    }

    if (!active) {

      return 0;

    }

    return Math.min(

      getElapsed() / ACQUISITION_TIME,

      1

    );

  }


  // ========================================
  // RÉINITIALISATION MANUELLE
  // (bouton "déverrouiller" dans l'interface)
  // ========================================

  function reset() {

    active =
      false;

    validated =
      false;

    positions =
      [];

    validatedPosition =
      null;

  }


  // ========================================
  // API PUBLIQUE DU TRACKER
  // ========================================

  return {

    start,
    addPosition,
    getElapsed,
    isTimeElapsed,
    finish,
    cancel,
    reset,
    getProgress,

    isActive: () => active,

    isValidated: () => validated,

    getValidatedPosition: () => validatedPosition,

    getLastPosition: () =>
      positions[positions.length - 1] || null

  };

}
