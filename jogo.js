let Cesium=null;
function carregarCesium(){return new Promise((resolve,reject)=>{
if(window.Cesium){Cesium=window.Cesium;resolve(Cesium);return;}
if(!document.querySelector('link[data-cesium-css]')){const css=document.createElement('link');css.rel='stylesheet';css.href='https://cesium.com/downloads/cesiumjs/releases/1.123/Build/Cesium/Widgets/widgets.css';css.dataset.cesiumCss='true';document.head.appendChild(css);}
const script=document.createElement('script');script.src='https://cesium.com/downloads/cesiumjs/releases/1.123/Build/Cesium/Cesium.js';
script.onload=()=>{Cesium=window.Cesium;Cesium?resolve(Cesium):reject(new Error('CesiumJS não inicializou.'));};
script.onerror=()=>reject(new Error('Não foi possível carregar o motor 3D.'));document.head.appendChild(script);});}

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

let mapa=null,handlerMapa=null,entidadeJogador=null,entidadeDestino=null,entidadesItens=[],entidadesPredios=[],carregandoPredios=false;
let faseAtual = 0;
let tempoRestante = 300;
let contadorInterval = null;
let transporteAtual = "carro";
let itensColetados = [];
let posicaoJogador = null;
let destinoMovimento = null;
let animacaoMovimento = null;
let jogoAtivo = false;
let pontosTotais = 0;
let pontosNoInicioFase = 0;
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
  setTimeout(()=>{if(mapa&&!mapa.isDestroyed())mapa.resize();},150);
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
  setTimeout(()=>{if(mapa&&!mapa.isDestroyed())mapa.resize();},150);
}

function mostrarInstrucoes() {
  document.getElementById("tela-inicio").classList.add("escondido");
  document.getElementById("tela-instrucoes").classList.remove("escondido");
}

function fecharInstrucoes() {
  document.getElementById("tela-instrucoes").classList.add("escondido");
  document.getElementById("tela-inicio").classList.remove("escondido");
}

async function inicializarMapa(){
if(mapa&&!mapa.isDestroyed()){mapa.resize();ajustarMapa();return;}
const status=document.getElementById("status-missao");
try{
if(status)status.textContent="🌍 Preparando o mundo 3D aberto...";
const M=await carregarCesium();
mapa=new M.Viewer("mapa",{animation:false,timeline:false,baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,fullscreenButton:true,infoBox:false,selectionIndicator:false,terrainProvider:new M.EllipsoidTerrainProvider(),imageryProvider:new M.UrlTemplateImageryProvider({url:"https://tile.openstreetmap.org/{z}/{x}/{y}.png",credit:"© OpenStreetMap contributors"}),requestRenderMode:false});
mapa.scene.globe.depthTestAgainstTerrain=false;mapa.scene.screenSpaceCameraController.minimumZoomDistance=35;mapa.scene.screenSpaceCameraController.maximumZoomDistance=250000;mapa.scene.globe.enableLighting=true;
handlerMapa=new M.ScreenSpaceEventHandler(mapa.scene.canvas);
handlerMapa.setInputAction(e=>{if(!jogoAtivo)return;const cart=mapa.camera.pickEllipsoid(e.position,mapa.scene.globe.ellipsoid);if(!cart)return;const c=M.Cartographic.fromCartesian(cart);iniciarDeslocamento([M.Math.toDegrees(c.longitude),M.Math.toDegrees(c.latitude)]);},M.ScreenSpaceEventType.LEFT_CLICK);
const missao=MISSOES[faseAtual];await mapa.camera.flyTo({destination:M.Cartesian3.fromDegrees(missao.origem[0],missao.origem[1],1800),orientation:{heading:0,pitch:M.Math.toRadians(-48),roll:0},duration:1.2});
colocarMarcadores(missao.origem,missao.destino);carregarPrediosOSM(missao.origem);
if(status)status.textContent="🌎 Mapa 3D aberto carregado. Clique no mapa ou use WASD para se deslocar.";
}catch(erro){console.error("Falha ao iniciar CesiumJS:",erro);if(status)status.textContent="⚠️ Não foi possível carregar o mapa 3D. Verifique a conexão e recarregue.";}
}
function carregarPrediosOSM(centro){
if(!mapa||!Cesium||carregandoPredios)return;carregandoPredios=true;entidadesPredios.forEach(e=>mapa.entities.remove(e));entidadesPredios=[];
const q='[out:json][timeout:18];(way["building"](around:1100,'+centro[1]+','+centro[0]+'););out tags geom;';
fetch("https://overpass-api.de/api/interpreter",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:"data="+encodeURIComponent(q),signal:AbortSignal.timeout(20000)})
.then(r=>{if(!r.ok)throw new Error("Servidor OSM indisponível");return r.json();}).then(d=>{
(d.elements||[]).forEach(item=>{if(!item.geometry||item.geometry.length<4)return;const coords=[];item.geometry.forEach(p=>coords.push(p.lon,p.lat));const tags=item.tags||{};const h=Number.parseFloat(String(tags.height||"").replace(",","."))||(Number.parseFloat(tags["building:levels"])||2.5)*3;
entidadesPredios.push(mapa.entities.add({name:tags.name||"Edificação OpenStreetMap",polygon:{hierarchy:Cesium.Cartesian3.fromDegreesArray(coords),height:0,extrudedHeight:Math.max(4,Math.min(h,120)),material:Cesium.Color.fromCssColorString("#b7b2a8").withAlpha(.88),outline:true,outlineColor:Cesium.Color.fromCssColorString("#343b43")}}));});mapa.scene.requestRender();
}).catch(e=>console.warn("Prédios OSM indisponíveis nesta área:",e)).finally(()=>{carregandoPredios=false;});
}
function ajustarMapa(){if(!mapa||mapa.isDestroyed())return;const m=MISSOES[faseAtual];mapa.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(m.origem[0],m.origem[1],1500),orientation:{heading:0,pitch:Cesium.Math.toRadians(-48),roll:0},duration:1});colocarMarcadores(m.origem,m.destino);carregarPrediosOSM(m.origem);}
function distanciaMetros(a,b){const r=Math.PI/180,dl=(b[1]-a[1])*r,dg=(b[0]-a[0])*r,l1=a[1]*r,l2=b[1]*r,h=Math.sin(dl/2)**2+Math.cos(l1)*Math.cos(l2)*Math.sin(dg/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
function moverCameraParaJogador(){if(!mapa||!posicaoJogador)return;mapa.camera.setView({destination:Cesium.Cartesian3.fromDegrees(posicaoJogador[0],posicaoJogador[1],900),orientation:{heading:mapa.camera.heading,pitch:Cesium.Math.toRadians(-48),roll:0}});}
function interpolarCoordenada(inicio, fim, proporcao) {
  return [
    inicio[0] + (fim[0] - inicio[0]) * proporcao,
    inicio[1] + (fim[1] - inicio[1]) * proporcao
  ];
}

function criarMarcadorItem(coordenada,indice){const e=mapa.entities.add({name:"Suprimentos",position:Cesium.Cartesian3.fromDegrees(coordenada[0],coordenada[1],12),point:{pixelSize:15,color:Cesium.Color.YELLOW,outlineColor:Cesium.Color.BLACK,outlineWidth:3},label:{text:"📦",font:"22px sans-serif",pixelOffset:new Cesium.Cartesian2(0,-22),disableDepthTestDistance:Number.POSITIVE_INFINITY}});entidadesItens.push({entidade:e,coordenada,indice,coletado:false});}
function colocarMarcadores(origem,destino){if(!mapa||!Cesium)return;if(entidadeJogador)mapa.entities.remove(entidadeJogador);if(entidadeDestino)mapa.entities.remove(entidadeDestino);entidadesItens.forEach(i=>mapa.entities.remove(i.entidade));entidadesItens=[];posicaoJogador=[...origem];destinoMovimento=null;
entidadeJogador=mapa.entities.add({name:"Jogador",position:Cesium.Cartesian3.fromDegrees(origem[0],origem[1],8),point:{pixelSize:17,color:Cesium.Color.LIME,outlineColor:Cesium.Color.BLACK,outlineWidth:3},label:{text:"JOGADOR",font:"bold 12px sans-serif",fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(0,-25),disableDepthTestDistance:Number.POSITIVE_INFINITY}});
entidadeDestino=mapa.entities.add({name:"Destino da missão",position:Cesium.Cartesian3.fromDegrees(destino[0],destino[1],10),point:{pixelSize:18,color:Cesium.Color.RED,outlineColor:Cesium.Color.WHITE,outlineWidth:3},label:{text:"DESTINO",font:"bold 13px sans-serif",fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(0,-26),disableDepthTestDistance:Number.POSITIVE_INFINITY}});
[.25,.5,.75].forEach((p,i)=>{if(!itensColetados.includes(i))criarMarcadorItem(interpolarCoordenada(origem,destino,p),i);});atualizarInventario();atualizarProgresso();}
function carregarFase(indice) {
  faseAtual = indice;
  const missao = MISSOES[faseAtual];
  pararMovimento();
  clearInterval(contadorInterval);
  tempoRestante = missao.tempoLimite;
  transporteAtual = missao.transporte;
  itensColetados = [];
  pontosNoInicioFase = pontosTotais;
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
  if(mapa&&!mapa.isDestroyed())ajustarMapa();
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

    const distancia = distanciaMetros(posicaoJogador,destinoMovimento);

    if (distancia < 4) {
      posicaoJogador = [...destinoMovimento];
      if(entidadeJogador)entidadeJogador.position=Cesium.Cartesian3.fromDegrees(posicaoJogador[0],posicaoJogador[1],8);
      destinoMovimento = null;
      atualizarProgresso();
      verificarChegada();
      return;
    }

    const metros = VELOCIDADES[transporteAtual] * delta;
    const fracao = Math.min(1, metros / distancia);
    posicaoJogador = interpolarCoordenada(posicaoJogador, destinoMovimento, fracao);
    if(entidadeJogador)entidadeJogador.position=Cesium.Cartesian3.fromDegrees(posicaoJogador[0],posicaoJogador[1],8);

    if(instante-ultimoAcompanhamentoCamera>650){moverCameraParaJogador();ultimoAcompanhamentoCamera=instante;}

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
  const distancia = distanciaMetros(posicaoJogador,destino);
  if (distancia <= RAIO_CONCLUSAO) {
    missaoConcluida();
  } else {
    document.getElementById("status-missao").textContent = "📍 Faltam " + formatarDistancia(distancia) + " para o objetivo.";
  }
}

function atualizarProgresso() {
  if (!posicaoJogador) return;
  const missao = MISSOES[faseAtual];
  const total = distanciaMetros(missao.origem,missao.destino);
  const restante = distanciaMetros(posicaoJogador,missao.destino);
  const progresso = total > 0 ? Math.max(0, Math.min(100, (1 - restante / total) * 100)) : 0;
  document.getElementById("barra-progresso").style.width = progresso + "%";
  document.getElementById("pontos-atuais").textContent = pontosTotais;
  const radar = document.getElementById("radar-risco");
  if (radar) radar.classList.toggle("ativo", restante < 700);
  const textoRadar = document.querySelector(".radar-texto");
  if (textoRadar) textoRadar.textContent = "🎯 " + formatarDistancia(restante);
}

function formatarDistancia(metros) {
  return metros >= 1000 ? (metros / 1000).toFixed(1).replace(".", ",") + " km" : Math.round(metros) + " m";
}

function coletarItensProximos() {
  if (!posicaoJogador) return;
  marcadoresItens.forEach(item => {
    if (item.coletado) return;
    const distancia = distanciaMetros(posicaoJogador,item.coordenada);
    if (distancia <= RAIO_COLETA) {
      item.coletado = true;
      if(item.entidade)mapa?.entities.remove(item.entidade);
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
  document.getElementById("pontos-ganhos").textContent = "+ " + Math.max(0, pontosTotais - pontosNoInicioFase);
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
  setTimeout(()=>{if(mapa&&!mapa.isDestroyed())mapa.resize();},150);
}

function proximaMissao() {
  esconderTodasTelas();
  document.getElementById("tela-jogo").classList.remove("escondido");
  faseAtual = Math.min(faseAtual + 1, MISSOES.length - 1);
  carregarFase(faseAtual);
  montarListaFases();
  setTimeout(()=>{if(mapa&&!mapa.isDestroyed())mapa.resize();},150);
}

function selecionarFase(indice) {
  if (!Number.isInteger(indice) || indice < 0 || indice >= MISSOES.length || !jogoAtivo) return;
  if (indice > 0 && !missoesConcluidas.includes(indice - 1)) {
    document.getElementById("status-missao").textContent = "🔒 Conclua a missão anterior para liberar esta operação.";
    return;
  }
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
    const bloqueada = indice > 0 && !missoesConcluidas.includes(indice - 1);
    elemento.disabled = bloqueada;
    elemento.className = "fase-item" +
      (missoesConcluidas.includes(indice) ? " concluida" : "") +
      (indice === faseAtual ? " atual" : "") +
      (bloqueada ? " bloqueada" : "");
    elemento.textContent = (missoesConcluidas.includes(indice) ? "✅ " : bloqueada ? "🔒 " : "⬜ ") + (indice + 1) + ". " + missao.nome;
    elemento.setAttribute("aria-label", (bloqueada ? "Missão bloqueada " : "Selecionar missão ") + (indice + 1) + ": " + missao.nome);
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
