import * as maplibregl from './node_modules/maplibre-gl/dist/maplibre-gl.mjs';

const MISSOES = [
  {id:1,nome:"A Fuga da Cidade",origem:[-43.93,-19.72],destino:[-43.95,-19.74],tempoLimite:300,transporte:"carro",horario:"dia",dica:"Siga pela estrada!"},
  {id:2,nome:"Operação Praia",origem:[-43.95,-19.74],destino:[-43.98,-19.80],tempoLimite:420,transporte:"carro",horario:"dia",dica:"Vá até a costa!"},
  {id:3,nome:"Entrega Secreta",origem:[-43.93,-19.72],destino:[-44.05,-19.65],tempoLimite:360,transporte:"carro",horario:"tarde",dica:"Estrada longa!"},
  {id:4,nome:"Zona de Risco",origem:[-44.05,-19.65],destino:[-44.10,-19.70],tempoLimite:240,transporte:"pe",horario:"tarde",dica:"Vá a pé!"},
  {id:5,nome:"Resgate Aéreo",origem:[-43.93,-19.72],destino:[-44.20,-19.50],tempoLimite:300,transporte:"aviao",horario:"dia",dica:"Pegue o avião!"},
  {id:6,nome:"Cidade Alta",origem:[-43.93,-19.72],destino:[-43.90,-19.68],tempoLimite:180,transporte:"carro",horario:"noite",dica:"Suba a rua!"},
  {id:7,nome:"Estrada da Costa",origem:[-43.90,-19.68],destino:[-44.00,-19.85],tempoLimite:480,transporte:"carro",horario:"tarde",dica:"Siga a costa!"},
  {id:8,nome:"Entrada Secreta",origem:[-44.00,-19.85],destino:[-44.15,-19.80],tempoLimite:300,transporte:"pe",horario:"noite",dica:"Só a pé!"},
  {id:9,nome:"Fuga Noturna",origem:[-44.15,-19.80],destino:[-43.80,-19.60],tempoLimite:600,transporte:"aviao",horario:"noite",dica:"Avião obrigatório!"},
  {id:10,nome:"Missão Final",origem:[-43.80,-19.60],destino:[-43.93,-19.72],tempoLimite:420,transporte:"carro",horario:"dia",dica:"Volte à base!"}
];

let mapa = null;
let faseAtual = 0;
let tempoRestante = 300;
let contadorInterval = null;
let transporteAtual = "carro";
let marcadorJogador = null;
let marcadorDestino = null;
let marcadoresItens = [];
let itensColetados = [];
let posicaoJogador = null;
let destinoMovimento = null;
let animacaoMovimento = null;
let jogoAtivo = false;
let pontosTotais = 0;
let missoesConcluidas = [];
let somAtivo = true;
let audioContext = null;
let ultimoAcompanhamentoCamera = 0;

const VELOCIDADES = { pe: 7, carro: 30, aviao: 110 };
const RAIO_COLETA = 85;
const RAIO_CONCLUSAO = 180;

document.addEventListener("DOMContentLoaded", () => {
  const barra = document.getElementById("barra-carga");
  const telaCarregamento = document.getElementById("tela-carregamento");
  const telaInicio = document.getElementById("tela-inicio");
  let carga = 0;
  const intervalo = setInterval(() => {
    carga = Math.min(100, carga + 10);
    if (barra) barra.style.width = carga + "%";
    if (carga >= 100) {
      clearInterval(intervalo);
      setTimeout(() => {
        telaCarregamento?.classList.add("escondido");
        telaInicio?.classList.remove("escondido");
        atualizarEstatisticas();
      }, 350);
    }
  }, 80);
});

function esconderTodasTelas() {
  document.querySelectorAll(".tela-tela").forEach(tela => tela.classList.add("escondido"));
}

function iniciarJogo() {
  esconderTodasTelas();
  document.getElementById("tela-jogo").classList.remove("escondido");
  faseAtual = 0;
  pontosTotais = 0;
  missoesConcluidas = [];
  itensColetados = [];
  inicializarMapa();
  carregarFase(faseAtual);
  montarListaFases();
  atualizarEstatisticas();
  setTimeout(() => mapa?.resize(), 80);
}

function carregarProgresso() {
  esconderTodasTelas();
  document.getElementById("tela-jogo").classList.remove("escondido");
  try {
    const salvo = localStorage.getItem("progresso-jogo");
    if (salvo) {
      const dados = JSON.parse(salvo);
      pontosTotais = Number(dados.pontos) || 0;
      missoesConcluidas = Array.isArray(dados.concluidas) ? dados.concluidas.filter(n => Number.isInteger(n) && n >= 0 && n < MISSOES.length) : [];
      faseAtual = Number.isInteger(dados.fase) && dados.fase >= 0 && dados.fase < MISSOES.length ? dados.fase : 0;
    } else {
      faseAtual = 0;
      pontosTotais = 0;
      missoesConcluidas = [];
    }
  } catch (erro) {
    console.warn("Não foi possível ler o progresso salvo:", erro);
    faseAtual = 0;
    pontosTotais = 0;
    missoesConcluidas = [];
  }
  inicializarMapa();
  carregarFase(faseAtual);
  montarListaFases();
  atualizarEstatisticas();
  setTimeout(() => mapa?.resize(), 80);
}

function mostrarInstrucoes() {
  document.getElementById("tela-inicio").classList.add("escondido");
  document.getElementById("tela-instrucoes").classList.remove("escondido");
}

function fecharInstrucoes() {
  document.getElementById("tela-instrucoes").classList.add("escondido");
  document.getElementById("tela-inicio").classList.remove("escondido");
}

function inicializarMapa() {
  if (mapa) {
    mapa.resize();
    ajustarMapa();
    return;
  }

  mapa = new maplibregl.Map({
    container: "mapa",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: MISSOES[faseAtual].origem,
    zoom: 15.5,
    pitch: 65,
    bearing: -18,
    maxPitch: 85,
    minZoom: 4,
    maxZoom: 20,
    canvasContextAttributes: { antialias: true }
  });

  mapa.dragRotate.enable();
  mapa.touchZoomRotate.enableRotation();
  mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  mapa.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-right");

  mapa.on("load", () => {
    ativarEdificios3D();
    try {
      mapa.setFog({ color: "rgb(220, 230, 240)", "high-color": "rgb(30, 70, 120)", "space-color": "rgb(5, 8, 18)", "horizon-blend": 0.08 });
    } catch (_) {}
    ajustarMapa();
  });

  mapa.on("click", moverJogador);
  mapa.on("error", evento => console.warn("Aviso do mapa:", evento?.error?.message || evento));
}

function ativarEdificios3D() {
  if (!mapa || mapa.getLayer("missao-brasil-edificios-3d")) return;
  const estilo = mapa.getStyle();
  const fontes = estilo.sources || {};
  const fonte = Object.entries(fontes).find(([id, dados]) =>
    dados.type === "vector" && (id === "openmaptiles" || /openfreemap|openmaptiles/i.test(dados.url || ""))
  );
  if (!fonte) {
    console.warn("A fonte vetorial do mapa não disponibilizou a camada de edifícios.");
    return;
  }

  const [sourceId] = fonte;
  const camadaPredios = (estilo.layers || []).find(layer =>
    layer["source-layer"] === "building" && layer.source === sourceId
  );
  if (!camadaPredios) {
    console.warn("A camada de edifícios não foi encontrada no estilo cartográfico.");
    return;
  }

  const primeiraCamadaTexto = (estilo.layers || []).find(layer => layer.type === "symbol")?.id;
  try {
    mapa.addLayer({
      id: "missao-brasil-edificios-3d",
      type: "fill-extrusion",
      source: sourceId,
      "source-layer": "building",
      minzoom: 14,
      filter: ["any", [">", ["to-number", ["get", "render_height"], 0], 0], [">", ["to-number", ["get", "height"], 0], 0]],
      paint: {
        "fill-extrusion-color": [
          "interpolate", ["linear"], ["to-number", ["get", "render_height"], 10],
          0, "#9c9b98", 25, "#c5b9a5", 80, "#8d9eae"
        ],
        "fill-extrusion-height": ["max", ["to-number", ["get", "render_height"], 0], ["to-number", ["get", "height"], 0], 4],
        "fill-extrusion-base": ["max", ["to-number", ["get", "render_min_height"], 0], ["to-number", ["get", "min_height"], 0]],
        "fill-extrusion-opacity": 0.94,
        "fill-extrusion-vertical-gradient": true
      }
    }, primeiraCamadaTexto);
  } catch (erro) {
    console.error("Não foi possível ativar os prédios 3D:", erro);
  }
}

function ajustarMapa() {
  if (!mapa || !mapa.isStyleLoaded()) return;
  const missao = MISSOES[faseAtual];
  mapa.flyTo({ center: missao.origem, zoom: 15.5, pitch: 65, bearing: -18, speed: 0.8, essential: true });
  colocarMarcadores(missao.origem, missao.destino);
}

function interpolarCoordenada(inicio, fim, proporcao) {
  return [
    inicio[0] + (fim[0] - inicio[0]) * proporcao,
    inicio[1] + (fim[1] - inicio[1]) * proporcao
  ];
}

function criarMarcadorItem(coordenada, indice) {
  const elemento = document.createElement("div");
  elemento.className = "marcador-caixa-coleta";
  elemento.textContent = "📦";
  elemento.title = "Caixa de suprimentos";
  elemento.style.cssText = "font-size:27px;cursor:pointer;filter:drop-shadow(0 2px 4px #000);";
  const marcador = new maplibregl.Marker({ element: elemento, anchor: "bottom" })
    .setLngLat(coordenada).addTo(mapa);
  marcadoresItens.push({ marcador, coordenada, indice, coletado: false });
}

function colocarMarcadores(origem, destino) {
  if (!mapa || !mapa.isStyleLoaded()) return;
  marcadorJogador?.remove();
  marcadorDestino?.remove();
  marcadoresItens.forEach(item => item.marcador.remove());
  marcadoresItens = [];
  posicaoJogador = [...origem];
  destinoMovimento = null;
  marcadorJogador = new maplibregl.Marker({ color: "#39ff14" }).setLngLat(origem).addTo(mapa);
  marcadorDestino = new maplibregl.Marker({ color: "#e50914" }).setLngLat(destino).addTo(mapa);

  [0.25, 0.5, 0.75].forEach((parte, indice) => {
    if (!itensColetados.includes(indice)) {
      criarMarcadorItem(interpolarCoordenada(origem, destino, parte), indice);
    }
  });
  atualizarInventario();
  atualizarProgresso();
}

function carregarFase(indice) {
  faseAtual = indice;
  const missao = MISSOES[faseAtual];
  pararMovimento();
  clearInterval(contadorInterval);
  tempoRestante = missao.tempoLimite;
  transporteAtual = missao.transporte;
  itensColetados = [];
  document.getElementById("nome-missao").textContent = "MISSÃO " + (faseAtual + 1) + " — " + missao.nome;
  document.getElementById("numero-fase").textContent = "1." + (faseAtual + 1);
  document.getElementById("status-missao").textContent = "📍 " + missao.dica + " Clique no mapa para se deslocar.";
  document.getElementById("icone-tempo").textContent = missao.horario === "noite" ? "🌙" : missao.horario === "tarde" ? "🌇" : "☀️";
  atualizarContador();
  atualizarBotoesTransporte();
  jogoAtivo = true;
  contadorInterval = setInterval(() => {
    if (!jogoAtivo) return;
    tempoRestante = Math.max(0, tempoRestante - 1);
    atualizarContador();
    if (tempoRestante <= 0) mostrarFalha("⏰ O tempo acabou! Tente novamente.");
  }, 1000);
  if (mapa?.isStyleLoaded()) ajustarMapa();
  salvarProgresso();
}

function atualizarContador() {
  const minutos = Math.floor(tempoRestante / 60);
  const segundos = tempoRestante % 60;
  document.getElementById("contador-tempo").textContent =
    String(minutos).padStart(2, "0") + ":" + String(segundos).padStart(2, "0");
}

function mudarTransporte(tipo) {
  if (!VELOCIDADES[tipo]) return;
  transporteAtual = tipo;
  atualizarBotoesTransporte();
  const nomes = { pe: "a pé", carro: "de carro", aviao: "de avião" };
  document.getElementById("status-missao").textContent = "🚦 Transporte selecionado: " + nomes[tipo] + ". Clique no mapa para seguir.";
}

function atualizarBotoesTransporte() {
  ["pe", "carro", "aviao"].forEach(tipo => {
    document.getElementById("btn-" + tipo)?.classList.toggle("ativo", tipo === transporteAtual);
  });
}

function moverJogador(evento) {
  if (!jogoAtivo || !marcadorJogador || !evento?.lngLat) return;
  iniciarDeslocamento([evento.lngLat.lng, evento.lngLat.lat]);
}

function iniciarDeslocamento(destino) {
  if (!jogoAtivo || !posicaoJogador) return;
  destinoMovimento = destino;
  if (animacaoMovimento) cancelAnimationFrame(animacaoMovimento);
  let instanteAnterior = 0;

  const animar = instante => {
    if (!jogoAtivo || !destinoMovimento) return;
    if (!instanteAnterior) instanteAnterior = instante;
    const delta = Math.min((instante - instanteAnterior) / 1000, 0.08);
    instanteAnterior = instante;

    const distancia = new maplibregl.LngLat(...posicaoJogador)
      .distanceTo(new maplibregl.LngLat(...destinoMovimento));

    if (distancia < 4) {
      posicaoJogador = [...destinoMovimento];
      marcadorJogador.setLngLat(posicaoJogador);
      destinoMovimento = null;
      atualizarProgresso();
      verificarChegada();
      return;
    }

    const metros = VELOCIDADES[transporteAtual] * delta;
    const fracao = Math.min(1, metros / distancia);
    posicaoJogador = interpolarCoordenada(posicaoJogador, destinoMovimento, fracao);
    marcadorJogador.setLngLat(posicaoJogador);

    if (instante - ultimoAcompanhamentoCamera > 180) {
      mapa?.setCenter(posicaoJogador);
      ultimoAcompanhamentoCamera = instante;
    }

    coletarItensProximos();
    atualizarProgresso();
    verificarChegada();
    if (jogoAtivo && destinoMovimento) animacaoMovimento = requestAnimationFrame(animar);
  };

  animacaoMovimento = requestAnimationFrame(animar);
  document.getElementById("status-missao").textContent = "🧭 Em deslocamento " + (transporteAtual === "pe" ? "a pé" : transporteAtual === "carro" ? "de carro" : "de avião") + "...";
}

function pararMovimento() {
  if (animacaoMovimento) cancelAnimationFrame(animacaoMovimento);
  animacaoMovimento = null;
  destinoMovimento = null;
}

function verificarChegada() {
  if (!jogoAtivo || !posicaoJogador) return;
  const destino = MISSOES[faseAtual].destino;
  const distancia = new maplibregl.LngLat(...posicaoJogador).distanceTo(new maplibregl.LngLat(...destino));
  if (distancia <= RAIO_CONCLUSAO) {
    missaoConcluida();
  } else {
    document.getElementById("status-missao").textContent = "📍 Faltam " + formatarDistancia(distancia) + " para o objetivo.";
  }
}

function atualizarProgresso() {
  if (!posicaoJogador) return;
  const missao = MISSOES[faseAtual];
  const total = new maplibregl.LngLat(...missao.origem).distanceTo(new maplibregl.LngLat(...missao.destino));
  const restante = new maplibregl.LngLat(...posicaoJogador).distanceTo(new maplibregl.LngLat(...missao.destino));
  const progresso = total > 0 ? Math.max(0, Math.min(100, (1 - restante / total) * 100)) : 0;
  document.getElementById("barra-progresso").style.width = progresso + "%";
  document.getElementById("pontos-atuais").textContent = pontosTotais;
  const radar = document.getElementById("radar-risco");
  if (radar) radar.classList.toggle("ativo", restante < 700);
  const textoRadar = document.querySelector(".radar-texto");
  if (textoRadar) textoRadar.textContent = "📡 " + formatarDistancia(restante);
}

function formatarDistancia(metros) {
  return metros >= 1000 ? (metros / 1000).toFixed(1).replace(".", ",") + " km" : Math.round(metros) + " m";
}

function coletarItensProximos() {
  if (!posicaoJogador) return;
  marcadoresItens.forEach(item => {
    if (item.coletado) return;
    const distancia = new maplibregl.LngLat(...posicaoJogador).distanceTo(new maplibregl.LngLat(...item.coordenada));
    if (distancia <= RAIO_COLETA) {
      item.coletado = true;
      item.marcador.remove();
      itensColetados.push(item.indice);
      pontosTotais += 25;
      atualizarInventario();
      atualizarEstatisticas();
      tocarSom(880, 0.12);
      document.getElementById("status-missao").textContent = "📦 Suprimentos coletados! +25 pontos.";
      salvarProgresso();
    }
  });
}

function atualizarInventario() {
  const lista = document.getElementById("lista-itens");
  if (lista) lista.textContent = itensColetados.length ? itensColetados.map(() => "📦").join(" ") : "Nenhum item coletado";
}

function missaoConcluida() {
  if (!jogoAtivo) return;
  jogoAtivo = false;
  pararMovimento();
  clearInterval(contadorInterval);
  if (!missoesConcluidas.includes(faseAtual)) {
    missoesConcluidas.push(faseAtual);
    pontosTotais += 100;
  }
  salvarProgresso();
  esconderTodasTelas();
  document.getElementById("tela-sucesso").classList.remove("escondido");
  const ultima = faseAtual >= MISSOES.length - 1;
  document.getElementById("mensagem-resultado").textContent = ultima
    ? "🏆 PARABÉNS! Você concluiu todas as 10 missões!"
    : "✅ Missão " + (faseAtual + 1) + " concluída! Prepare-se para a próxima operação.";
  document.getElementById("pontos-ganhos").textContent = "+ " + (100 + itensColetados.length * 25);
  document.getElementById("tempo-restante-ganho").textContent = atualizarTempoResultado(tempoRestante);
  document.getElementById("itens-ganhos").textContent = itensColetados.length;
  document.getElementById("avaliacao").textContent = tempoRestante > 120 ? "★★★" : tempoRestante > 45 ? "★★☆" : "★☆☆";
  document.querySelector("#tela-sucesso button:first-child").style.display = ultima ? "none" : "block";
  atualizarEstatisticas();
  tocarSom(660, 0.22);
}

function atualizarTempoResultado(segundos) {
  return Math.floor(segundos / 60) + "m " + (segundos % 60) + "s";
}

function mostrarFalha(mensagem) {
  jogoAtivo = false;
  pararMovimento();
  clearInterval(contadorInterval);
  esconderTodasTelas();
  document.getElementById("mensagem-falha").textContent = mensagem;
  document.getElementById("tela-falha").classList.remove("escondido");
}

function repetirMissao() {
  esconderTodasTelas();
  document.getElementById("tela-jogo").classList.remove("escondido");
  carregarFase(faseAtual);
  montarListaFases();
  setTimeout(() => mapa?.resize(), 80);
}

function proximaMissao() {
  esconderTodasTelas();
  document.getElementById("tela-jogo").classList.remove("escondido");
  faseAtual = Math.min(faseAtual + 1, MISSOES.length - 1);
  carregarFase(faseAtual);
  montarListaFases();
  setTimeout(() => mapa?.resize(), 80);
}

function selecionarFase(indice) {
  if (!Number.isInteger(indice) || indice < 0 || indice >= MISSOES.length || !jogoAtivo) return;
  carregarFase(indice);
  montarListaFases();
}

function voltarInicio() {
  jogoAtivo = false;
  pararMovimento();
  clearInterval(contadorInterval);
  esconderTodasTelas();
  document.getElementById("tela-inicio").classList.remove("escondido");
  atualizarEstatisticas();
}

function montarListaFases() {
  const lista = document.getElementById("lista-fases");
  if (!lista) return;
  lista.innerHTML = "";
  MISSOES.forEach((missao, indice) => {
    const elemento = document.createElement("button");
    elemento.type = "button";
    elemento.className = "fase-item" +
      (missoesConcluidas.includes(indice) ? " concluida" : "") +
      (indice === faseAtual ? " atual" : "");
    elemento.textContent = (missoesConcluidas.includes(indice) ? "✅ " : "⬜ ") + (indice + 1) + ". " + missao.nome;
    elemento.setAttribute("aria-label", "Selecionar missão " + (indice + 1) + ": " + missao.nome);
    elemento.addEventListener("click", () => selecionarFase(indice));
    lista.appendChild(elemento);
  });
}

function atualizarEstatisticas() {
  const pontos = document.getElementById("total-pontos");
  const concluidas = document.getElementById("missoes-concluidas");
  if (pontos) pontos.textContent = pontosTotais;
  if (concluidas) concluidas.textContent = missoesConcluidas.length;
  const pontosAtuais = document.getElementById("pontos-atuais");
  if (pontosAtuais) pontosAtuais.textContent = pontosTotais;
}

function salvarProgresso() {
  try {
    localStorage.setItem("progresso-jogo", JSON.stringify({
      pontos: pontosTotais,
      concluidas: missoesConcluidas,
      fase: faseAtual
    }));
  } catch (erro) {
    console.warn("O navegador não permitiu salvar o progresso local:", erro);
  }
}

function alternarSom() {
  somAtivo = !somAtivo;
  const botao = document.getElementById("btn-som");
  if (botao) {
    botao.textContent = somAtivo ? "🔊" : "🔇";
    botao.setAttribute("aria-label", somAtivo ? "Desativar som" : "Ativar som");
  }
  if (somAtivo) tocarSom(520, 0.1);
}

function tocarSom(frequencia, duracao) {
  if (!somAtivo) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audioContext ||= new AudioCtx();
    if (audioContext.state === "suspended") audioContext.resume();
    const oscilador = audioContext.createOscillator();
    const volume = audioContext.createGain();
    oscilador.type = "sine";
    oscilador.frequency.value = frequencia;
    volume.gain.setValueAtTime(0.0001, audioContext.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duracao);
    oscilador.connect(volume);
    volume.connect(audioContext.destination);
    oscilador.start();
    oscilador.stop(audioContext.currentTime + duracao + 0.02);
  } catch (erro) {
    console.warn("Áudio indisponível neste navegador:", erro);
  }
}

function moverComTeclado(evento) {
  if (!jogoAtivo || !posicaoJogador || !document.getElementById("tela-jogo") || document.getElementById("tela-jogo").classList.contains("escondido")) return;
  const tecla = evento.key.toLowerCase();
  const direcoes = {
    w: [0, 1], arrowup: [0, 1],
    s: [0, -1], arrowdown: [0, -1],
    a: [-1, 0], arrowleft: [-1, 0],
    d: [1, 0], arrowright: [1, 0]
  };
  const direcao = direcoes[tecla];
  if (!direcao) return;
  evento.preventDefault();
  const latitude = posicaoJogador[1];
  const metros = transporteAtual === "aviao" ? 900 : transporteAtual === "carro" ? 350 : 90;
  const deltaLat = (metros / 111320) * direcao[1];
  const deltaLng = (metros / (111320 * Math.max(0.2, Math.cos(latitude * Math.PI / 180)))) * direcao[0];
  iniciarDeslocamento([posicaoJogador[0] + deltaLng, latitude + deltaLat]);
}

document.addEventListener("keydown", moverComTeclado);

Object.assign(window, {
  iniciarJogo,
  carregarProgresso,
  mostrarInstrucoes,
  fecharInstrucoes,
  mudarTransporte,
  alternarSom,
  repetirMissao,
  proximaMissao,
  voltarInicio
});
