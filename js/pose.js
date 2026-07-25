// ==========================================
// POSE — CALCUL DE POSITION 3D DU MARQUEUR
// ==========================================

// Taille réelle du marqueur
// en mètres.
//
// Exemple :
// marqueur de 10 cm = 0.10

export const MARKER_SIZE =
  0.10;


// Focale approximative
// de la caméra en pixels.

export const FOCAL_LENGTH =
  1000;


// ==========================================
// CALCUL DE LA MÉDIANE
// ==========================================

export function median(values) {


  if (
    values.length === 0
  ) {

    return 0;

  }


  // Copie et tri

  const sorted =
    [...values].sort(

      (a, b) =>
        a - b

    );


  const middle =
    Math.floor(
      sorted.length / 2
    );


  // Nombre impair

  if (
    sorted.length % 2 !== 0
  ) {

    return sorted[middle];

  }


  // Nombre pair

  return (

    sorted[middle - 1]
    +
    sorted[middle]

  ) / 2;

}


// ==========================================
// ESTIMATION DE LA POSE
// ==========================================
//
// `video` doit exposer videoWidth / videoHeight
// (l'élément <video> de la caméra).

export function estimatePose(marker, video) {


  // ========================================
  // CENTRE DU MARQUEUR
  // ========================================

  let centerX = 0;

  let centerY = 0;


  marker.corners.forEach(

    corner => {

      centerX +=
        corner.x;

      centerY +=
        corner.y;

    }

  );


  centerX /=
    marker.corners.length;


  centerY /=
    marker.corners.length;


  // ========================================
  // LARGEUR APPARENTE
  // ========================================

  const p0 =
    marker.corners[0];

  const p1 =
    marker.corners[1];

  const p2 =
    marker.corners[2];

  const p3 =
    marker.corners[3];


  const width1 =
    Math.hypot(

      p1.x - p0.x,

      p1.y - p0.y

    );


  const width2 =
    Math.hypot(

      p2.x - p3.x,

      p2.y - p3.y

    );


  const apparentWidth =

    (
      width1
      +
      width2
    ) / 2;


  // ========================================
  // DISTANCE Z
  // ========================================

  const Z =

    (
      FOCAL_LENGTH
      *
      MARKER_SIZE
    )
    /
    apparentWidth;


  // ========================================
  // CENTRE IMAGE
  // ========================================

  const imageCenterX =

    video.videoWidth / 2;


  const imageCenterY =

    video.videoHeight / 2;


  // ========================================
  // POSITION X
  // ========================================

  const X =

    (
      centerX
      -
      imageCenterX
    )
    *
    Z
    /
    FOCAL_LENGTH;


  // ========================================
  // POSITION Y
  // ========================================

  const Y =

    (
      centerY
      -
      imageCenterY
    )
    *
    Z
    /
    FOCAL_LENGTH;


  return {

    X,
    Y,
    Z

  };

}
