const statusEl = document.getElementById("status-google");
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function status(mensagem) {
  if (statusEl) statusEl.textContent = mensagem;
}

function carregarCesium() {
  return new Promise((resolve, reject) => {
    if (window.Cesium) return resolve(window.Cesium);
    const script = document.createElement("script");
    script.src = "https://cesium.com/downloads/cesiumjs/releases/1.105/Build/Cesium/Cesium.js";
    script.onload = () => window.Cesium ? resolve(window.Cesium) : reject(new Error("CesiumJS não inicializou."));
    script.onerror = () => reject(new Error("Não foi possível carregar o renderizador 3D."));
    document.head.appendChild(script);
  });
}

async function iniciar() {
  if (!apiKey) {
    status("Falta configurar VITE_GOOGLE_MAPS_API_KEY nas variáveis de ambiente do Netlify. Ative a Map Tiles API e o faturamento no Google Cloud.");
    return;
  }

  try {
    status("Carregando renderizador 3D...");
    const Cesium = await carregarCesium();
    const viewer = new Cesium.Viewer("google-3d", {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: true,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      imageryProvider: false,
      requestRenderMode: false
    });

    viewer.scene.globe.show = false;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;

    status("Conectando ao mapa fotorrealista do Google...");
    const tileset = await Cesium.Cesium3DTileset.fromUrl(
      "https://tile.googleapis.com/v1/3dtiles/root.json?key=" + encodeURIComponent(apiKey),
      { showCreditsOnScreen: true }
    );
    viewer.scene.primitives.add(tileset);

    const inicio = Cesium.Cartesian3.fromDegrees(-43.93, -19.72, 1800);
    await viewer.camera.flyTo({
      destination: inicio,
      orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-35), roll: 0 },
      duration: 2
    });
    status("Google 3D carregado. Verifique se há cobertura fotorrealista no local escolhido.");

    document.getElementById("ir-local").addEventListener("click", () => {
      const partes = document.getElementById("coordenadas").value.split(",").map(v => Number(v.trim()));
      if (partes.length !== 2 || !partes.every(Number.isFinite) || Math.abs(partes[0]) > 90 || Math.abs(partes[1]) > 180) {
        status("Coordenadas inválidas. Use latitude, longitude. Exemplo: -19.72, -43.93");
        return;
      }
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(partes[1], partes[0], 1800),
        orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-35), roll: 0 },
        duration: 2
      });
      status("Movendo a câmera. A cobertura 3D depende da região.");
    });

    document.getElementById("voltar-inicio").addEventListener("click", () => {
      viewer.camera.flyTo({
        destination: inicio,
        orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-35), roll: 0 },
        duration: 2
      });
    });
    window.addEventListener("resize", () => viewer.resize());
  } catch (erro) {
    console.error(erro);
    status("Falha ao abrir o Google 3D: " + (erro?.message || "verifique a chave, faturamento e a ativação da Map Tiles API."));
  }
}

iniciar();