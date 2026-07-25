// ==========================================
// CAMÉRA
// ==========================================

// ==========================================
// DÉMARRAGE CAMÉRA
// ==========================================

export async function startCamera(video, statusElement) {


  try {


    const stream =

      await navigator.mediaDevices
        .getUserMedia({

          video: {

            facingMode: {

              ideal:
                "environment"

            }

          },

          audio: false

        });


    video.srcObject =
      stream;


    console.log(

      "Caméra démarrée"

    );


  }

  catch (error) {


    console.error(

      "Erreur caméra :",

      error

    );


    statusElement.style.display =

      "block";


    statusElement.innerText =

      "Impossible d'accéder à la caméra";

  }

}
