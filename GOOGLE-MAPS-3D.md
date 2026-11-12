# Missão Brasil — integração Google 3D

## O que foi preparado

- O jogo principal e suas 10 missões permanecem preservados.
- A página `/google-3d.html` é uma prova técnica separada para validar o Google Photorealistic 3D Tiles.
- O visualizador usa CesiumJS e mantém os créditos/atribuições exigidos pelo Google.
- O teste permite voar para coordenadas diferentes para verificar a cobertura 3D.

## Configuração no Netlify

No painel do site Missão Brasil, adicione a variável de ambiente:

- Nome: `VITE_GOOGLE_MAPS_API_KEY`
- Valor: chave de API criada no Google Cloud.

No Google Cloud, vincule uma conta de faturamento e habilite a **Map Tiles API**. Restrinja a chave por HTTP referrer ao domínio de produção e ao domínio de deploy/preview que será usado nos testes. Não publique a chave em commits do GitHub.

Depois, faça um novo deploy e abra `/google-3d.html`.

## Planejamento das missões existentes

As 10 missões atuais continuam definidas em `jogo.js`, com origem, destino, tempo, transporte e horário. Não altere coordenadas ou a ordem das missões sem validar o roteiro com o responsável pelo jogo. Há descrições que precisam ser conferidas contra as coordenadas antes de transformar o roteiro em uma campanha geográfica definitiva.

## Próxima etapa após validar a cobertura

1. Confirmar em quais cidades do roteiro o Google entrega malha fotorrealista 3D.
2. Confirmar com a Google Maps Platform se o uso pretendido como cenário de jogo está coberto pelo contrato/licença aplicável.
3. Integrar a cena 3D ao jogo e adicionar modelos próprios de personagem e veículos.
4. Construir movimento, colisão, câmera de terceira pessoa, missões e interação como sistemas próprios, sem extrair geometria, ruas ou modelos das imagens do Google.

## Limites importantes

Google Photorealistic 3D Tiles é o cenário visual; não fornece personagem, carro controlável, física, colisão ou lógica de missão. Os modelos 3D sobrepostos devem ser originais e não podem ser extraídos, traçados ou derivados das malhas/imagens do Google. O Google exige atribuição visível. O serviço também tem cobrança por uso e restrições específicas; confira os termos da Map Tiles API antes de lançar o jogo comercialmente.
