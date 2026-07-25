// ==========================================
// DÉTECTION ARUCO
// ==========================================
//
// S'appuie sur la librairie globale `AR`
// fournie par js-aruco2 (cv.js + aruco.js,
// chargés en <script> classiques dans index.html).

// ==========================================
// DÉTECTEUR ARUCO
// ==========================================

const detector =
  new AR.Detector({

    dictionaryName:
      "ARUCO"

  });


// ==========================================
// DÉTECTION DES MARQUEURS DANS UNE IMAGE
// ==========================================

export function detectMarkers(imageData) {

  let markers = [];


  try {


    markers =

      detector.detect(

        imageData

      );


  }

  catch (error) {


    console.error(

      "Erreur détection :",

      error

    );

  }


  return markers;

}


// ==========================================
// RECHERCHE D'UN MARQUEUR PAR SON ID
// ==========================================

export function findMarkerById(markers, id) {

  return markers.find(

    marker =>
      marker.id === id

  );

}


// ==========================================
// INDEXATION DES MARQUEURS DÉTECTÉS PAR ID
// ==========================================
//
// Pratique quand on suit plusieurs marqueurs :
// évite de refaire un .find() par marqueur configuré
// à chaque frame.

export function indexMarkersById(markers) {

  const byId =
    new Map();

  for (

    const marker
    of
    markers

  ) {

    byId.set(
      marker.id,
      marker
    );

  }

  return byId;

}


// ==========================================
// DESSIN DU CONTOUR D'UN MARQUEUR
// ==========================================
//
// Pas de texte ici : le canvas est retourné en
// miroir (scaleX(-1) en CSS) pour l'effet selfie,
// ce qui rendrait tout label illisible. Le nom du
// marqueur est déjà affiché dans le panneau HUD.
//
// `color` doit correspondre à l'état du marqueur
// (mesure / verrouillé), pour rester visuellement
// cohérent avec l'anneau de progression du panneau.

export function drawMarker(context, marker, color) {


  context.strokeStyle =
    color;


  context.lineWidth =
    5;


  context.beginPath();


  for (

    let i = 0;

    i <
    marker.corners.length;

    i++

  ) {


    const corner =

      marker.corners[i];


    if (i === 0) {


      context.moveTo(

        corner.x,

        corner.y

      );


    }

    else {


      context.lineTo(

        corner.x,

        corner.y

      );

    }

  }


  context.closePath();


  context.stroke();

}
