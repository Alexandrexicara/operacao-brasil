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

let mapa, faseAtual=0, tempoRestante=300, contadorInterval, transporteAtual="carro";
let marcadorJogador, marcadorDestino, jogoAtivo=false;
let pontosTotais=0, missoesConcluidas=[];

document.addEventListener('DOMContentLoaded',()=>{
  let carga=0;
  let barra = document.getElementById('barra-carga');
  let telaCarreg = document.getElementById('tela-carregamento');
  let telaInicio = document.getElementById('tela-inicio');
  const intervaloCarga = setInterval(()=>{
    carga+=10; if(carga>100)carga=100;
    if(barra) barra.style.width = carga+'%';
    if(carga>=100){
      clearInterval(intervaloCarga);
      setTimeout(()=>{
        if(telaCarreg) telaCarreg.classList.add('escondido');
        if(telaInicio) telaInicio.classList.remove('escondido');
      },600);
    }
  },120);
});

function esconderTodasTelas(){
  document.querySelectorAll('.tela-tela').forEach(t=>t.classList.add('escondido'));
}

function iniciarJogo(){
  esconderTodasTelas();
  document.getElementById('tela-jogo').classList.remove('escondido');
  faseAtual=0;
  pontosTotais=0;
  missoesConcluidas=[];
  carregarFase(faseAtual);
  if(!mapa) inicializarMapa();
  else ajustarMapa();
  montarListaFases();
}

function carregarProgresso(){
  esconderTodasTelas();
  document.getElementById('tela-jogo').classList.remove('escondido');
  let salvo = localStorage.getItem('progresso-jogo');
  if(salvo){
    let d = JSON.parse(salvo);
    pontosTotais = d.pontos || 0;
    missoesConcluidas = d.concluidas || [];
    faseAtual = d.fase || 0;
  }
  carregarFase(faseAtual);
  if(!mapa) inicializarMapa();
  else ajustarMapa();
  montarListaFases();
}

function mostrarInstrucoes(){
  document.getElementById('tela-inicio').classList.add('escondido');
  document.getElementById('tela-instrucoes').classList.remove('escondido');
}

function fecharInstrucoes(){
  document.getElementById('tela-instrucoes').classList.add('escondido');
  document.getElementById('tela-inicio').classList.remove('escondido');
}

function inicializarMapa(){
  mapa = new maplibregl.Map({
    container:'mapa',
    style:'https://tiles.openfreemap.org/styles/liberty',
    center:[-43.93,-19.72],
    zoom:15,
    pitch:65,
    maxPitch:85
  });
  mapa.dragRotate.enable();
  mapa.touchZoomRotate.enableRotation();
  mapa.addControl(new maplibregl.NavigationControl(),'top-right');
  mapa.on('load', ajustarMapa);
  mapa.on('click', moverJogador);
}

function ajustarMapa(){
  if(!mapa) return;
  const m = MISSOES[faseAtual];
  mapa.flyTo({center:m.origem,zoom:15,pitch:65});
  colocarMarcadores(m.origem, m.destino);
}

function colocarMarcadores(origem, destino){
  if(marcadorJogador) marcadorJogador.remove();
  if(marcadorDestino) marcadorDestino.remove();
  marcadorJogador = new maplibregl.Marker({color:'#39ff14'}).setLngLat(origem).addTo(mapa);
  marcadorDestino = new maplibregl.Marker({color:'#e50914'}).setLngLat(destino).addTo(mapa);
}

function carregarFase(i){
  faseAtual = i;
  const m = MISSOES[i];
  document.getElementById('nome-missao').textContent = (i+1)+' — '+m.nome;
  document.getElementById('status-missao').textContent = '📍 '+m.dica;
  tempoRestante = m.tempoLimite;
  atualizarContador();
  if(contadorInterval) clearInterval(contadorInterval);
  contadorInterval = setInterval(()=>{
    tempoRestante--;
    atualizarContador();
    if(tempoRestante <= 0){
      clearInterval(contadorInterval);
      mostrarFalha('⏰ Tempo esgotado! Tente de novo!');
    }
  }, 1000);
  transporteAtual = m.transporte;
  atualizarBotoesTransporte();
  jogoAtivo = true;
  salvarProgresso();
}

function atualizarContador(){
  let m = Math.floor(tempoRestante/60);
  let s = tempoRestante % 60;
  document.getElementById('contador-tempo').textContent = 
    (m<10?'0':'') + m + ':' + (s<10?'0':'') + s;
}

function mudarTransporte(t){
  transporteAtual = t;
  atualizarBotoesTransporte();
}

function atualizarBotoesTransporte(){
  let botoes = document.querySelectorAll('.btn-transporte');
  let nomes = ['pe','carro','aviao'];
  botoes.forEach((b,i)=>{
    b.classList.toggle('ativo', nomes[i] === transporteAtual);
  });
}

function moverJogador(evento){
  if(!jogoAtivo || !marcadorJogador) return;

  const posicao = [evento.lngLat.lng, evento.lngLat.lat];
  const missao = MISSOES[faseAtual];
  marcadorJogador.setLngLat(posicao);

  const distanciaTotal = new maplibregl.LngLat(...missao.origem)
    .distanceTo(new maplibregl.LngLat(...missao.destino));
  const distanciaRestante = new maplibregl.LngLat(...posicao)
    .distanceTo(new maplibregl.LngLat(...missao.destino));
  const progresso = Math.max(0, Math.min(100, (1 - distanciaRestante / distanciaTotal) * 100));
  document.getElementById('barra-progresso').style.width = progresso+'%';

  if(distanciaRestante <= 300){
    missaoConcluida();
  } else {
    document.getElementById('status-missao').textContent =
      '📍 Continue até o marcador vermelho!';
  }
}

function missaoConcluida(){
  clearInterval(contadorInterval);
  jogoAtivo = false;
  if(!missoesConcluidas.includes(faseAtual)){
    missoesConcluidas.push(faseAtual);
    pontosTotais += 100;
  }
  salvarProgresso();
  esconderTodasTelas();
  document.getElementById('tela-sucesso').classList.remove('escondido');
  if(faseAtual >= MISSOES.length - 1){
    document.getElementById('mensagem-resultado').textContent = 
      '🏆 PARABÉNS! Você concluiu TODAS as 10 missões!';
    document.querySelector('#tela-sucesso button:first-child').style.display = 'none';
  } else {
    document.getElementById('mensagem-resultado').textContent = 
      '✅ Missão '+(faseAtual+1)+' concluída! Pronto para a próxima?';
    document.querySelector('#tela-sucesso button:first-child').style.display = 'block';
  }
  atualizarEstatisticas();
}

function mostrarFalha(msg){
  jogoAtivo = false;
  clearInterval(contadorInterval);
  esconderTodasTelas();
  document.getElementById('mensagem-falha').textContent = msg;
  document.getElementById('tela-falha').classList.remove('escondido');
}

function repetirMissao(){
  esconderTodasTelas();
  document.getElementById('tela-jogo').classList.remove('escondido');
  carregarFase(faseAtual);
  ajustarMapa();
}

function proximaMissao(){
  esconderTodasTelas();
  document.getElementById('tela-jogo').classList.remove('escondido');
  faseAtual++;
  if(faseAtual >= MISSOES.length) faseAtual = 0;
  carregarFase(faseAtual);
  ajustarMapa();
  montarListaFases();
}

function voltarInicio(){
  esconderTodasTelas();
  document.getElementById('tela-inicio').classList.remove('escondido');
  atualizarEstatisticas();
}

function montarListaFases(){
  const lista = document.getElementById('lista-fases');
  if(!lista) return;
  lista.innerHTML = '';
  MISSOES.forEach((m,i)=>{
    const el = document.createElement('div');
    el.className = 'fase-item';
    if(missoesConcluidas.includes(i)) el.style.opacity = '0.6';
    if(i === faseAtual) el.style.border = '2px solid #39ff14';
    el.textContent = (missoesConcluidas.includes(i)?'✅':'⬜')+' '+(i+1)+'. '+m.nome;
    lista.appendChild(el);
  });
}

function atualizarEstatisticas(){
  document.getElementById('total-pontos').textContent = pontosTotais;
  document.getElementById('missoes-concluidas').textContent = missoesConcluidas.length;
}

function salvarProgresso(){
  localStorage.setItem('progresso-jogo', JSON.stringify({
    pontos: pontosTotais,
    concluidas: missoesConcluidas,
    fase: faseAtual
  }));
}
