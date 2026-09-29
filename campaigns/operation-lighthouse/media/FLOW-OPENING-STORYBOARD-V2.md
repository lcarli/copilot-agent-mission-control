# Operation Lighthouse — storyboard e guia de produção no Google Flow

> Historical Portuguese V2 prototype. A later English-only plan is referenced
> as `FLOW-OPENING-FROM-SCRATCH.md`, but that file is not included in this
> checkout. Video production is deferred. Keep the English-only direction;
> do not reuse this document's Portuguese audio script for the new project.

Estado: **pré-produção da versão 2**  
Idioma de operação: **português brasileiro**  
Idioma dos prompts visuais: **inglês**  
Formato final: **60 segundos, 16:9, 1920×1080, 24 fps**

Este documento descreve como planejar e gerar uma nova abertura para
Operation Lighthouse usando imagens de referência, storyboard visual, frames
iniciais e finais, áudio nativo do Flow e pós-produção separada.

A versão já montada é um protótipo e deve ser preservada. Não sobrescreva os
arquivos existentes enquanto a versão 2 não estiver aprovada.

---

## 1. Objetivo criativo

A abertura deve apresentar Port Azure como uma cidade costeira real e habitada,
ameaçada por uma tempestade crescente. O conflito não é destruição; é a
dificuldade de tomar decisões confiáveis quando rotas fecham, serviços oscilam
e relatos se contradizem.

O filme deve comunicar:

- urgência sem pânico;
- pessoas capazes, não vítimas passivas;
- tecnologia como apoio, nunca como autoridade autônoma;
- evidência, coordenação e aprovação humana;
- continuidade clara entre cidade, campo e Mission Control;
- o farol como símbolo de orientação, não de vitória antecipada.

### Arco de 60 segundos

1. **Port Azure percebe a tempestade.**
2. **Uma rota deixa de ser confiável.**
3. **A comunidade se prepara.**
4. **Informações chegam ao Mission Control.**
5. **Evidências entram em conflito.**
6. **Pessoas verificam e decidem juntas.**
7. **O farol permanece aceso e a missão começa.**
8. **Título composto localmente durante 4 segundos.**

---

## 2. Regras que não podem mudar

- Sete cenas geradas, cada uma com **exatamente 8 segundos**.
- Um único plano contínuo por cena, sem cortes internos.
- Encerramento local de **4 segundos**, usando o último quadro da cena 7.
- Aparência de filmagem real, sem animação, CGI ou estética de videogame.
- Mesmo anoitecer azul-acinzentado e mesma tempestade em todas as cenas.
- Luz prática âmbar como contraste recorrente.
- Pessoas adultas fictícias e comportamento civil seguro.
- Nenhuma organização, marca, uniforme ou veículo real identificável.
- Nenhum texto importante gerado dentro da imagem.
- Sem violência, ferimentos, pânico, ruínas ou espetáculo de desastre.
- Uma ação física principal por clipe.
- Movimento de câmera diferente quando a narrativa pedir; não repetir
  `push-in` em todas as cenas.
- Sempre gerar **uma única saída**.
- Nunca aceitar custo acima do mostrado e autorizado antes da geração.

---

## 3. Estratégia para evitar refações

Não começar pelos vídeos. A ordem obrigatória é:

1. Criar o projeto no Flow.
2. Informar ao chat as regras globais.
3. Carregar as referências dos personagens já existentes.
4. Criar e aprovar imagens-mestre dos ambientes.
5. Criar e aprovar imagens-mestre de props e figurinos.
6. Pedir um storyboard visual com 14 quadros:
   primeiro e último quadro de cada uma das sete cenas.
7. Corrigir composição e continuidade no storyboard.
8. Gerar primeiro a cena 6, que combina personagens, diálogo e movimento.
9. Se a cena 6 provar que as referências funcionam, gerar as demais,
   uma por vez.
10. Revisar imagem, movimento e áudio de cada cena antes da próxima.
11. Montar vídeo, narração, diálogos, ambiência, Foley e música localmente.

### Regra de parada

Se o Flow fizer uma pergunta, apresentar escolhas, mudar o modelo, mostrar um
custo inesperado ou não reconhecer uma referência, **não responder por
suposição**. Copie a pergunta e as opções exatamente como aparecem e traga para
esta conversa.

---

## 4. Controle de créditos

Saldo informado: **1.000 créditos**.  
Custo observado por vídeo de 8 segundos: **12 créditos**.

| Etapa | Limite inicial |
| --- | ---: |
| Planejamento textual | 0 |
| Imagens-mestre e storyboard visual | Confirmar no Flow; não ultrapassar 120 sem nova decisão |
| Sete vídeos aprováveis | 84 |
| Uma contingência por cena | 84 |
| Prova adicional de áudio/diálogo | 12 |
| Reserva não comprometida | Pelo menos 700 |

O objetivo não é gastar a reserva. Ela existe para alterações editoriais reais,
não para gerar variações automáticas.

Antes de qualquer geração:

- confirmar modelo;
- confirmar duração;
- confirmar proporção;
- confirmar quantidade igual a 1;
- anotar o custo exibido;
- cancelar se o Flow criar variantes extras automaticamente.

---

## 5. Arquivos de referência disponíveis

Carregar estas imagens no projeto do Flow:

| Identificador de trabalho | Arquivo |
| --- | --- |
| `REF-COMMANDER` | `assets\OL-COMMANDER-AVATAR-001-presentation.png` |
| `REF-MAYA` | `assets\OL-MAYA-AVATAR-001-presentation.png` |
| `REF-JULES` | `assets\OL-JULES-AVATAR-001-presentation.png` |

Essas imagens definem rosto, idade aparente, cabelo, figurino, paleta e postura.
Não pedir ao Flow para reinterpretar etnia, idade ou aparência.

### Regra obrigatória de vinculação no chat

Escrever apenas o nome de um arquivo no prompt não garante que o Flow use o
ativo. Sempre digitar `@` no chat e **selecionar a imagem na lista de referências
da interface**, de modo que ela apareça como uma menção vinculada.

Nos blocos deste documento, tokens como `{{@MAYA_CHEN}}` e
`{{@MISSION_CONTROL}}` são placeholders. **Cada ocorrência** deve virar uma
menção vinculada, mesmo quando a mesma referência aparece várias vezes no
prompt ou em uma construção possessiva.

| Placeholder | Referência a selecionar com `@` |
| --- | --- |
| `{{@PORT_AZURE_HARBOR}}` | imagem-mestre do porto e da cidade |
| `{{@LIGHTHOUSE}}` | imagem-mestre do farol |
| `{{@MISSION_CONTROL}}` | imagem-mestre da sala |
| `{{@SHELTER}}` | imagem-mestre do abrigo |
| `{{@FIELD_CORRIDOR}}` | imagem-mestre da rua e infraestrutura |
| `{{@MISSION_COMMANDER}}` | personagem Mission Commander |
| `{{@MAYA_CHEN}}` | personagem Maya Chen |
| `{{@JULES_MARTIN}}` | personagem Jules Martin |
| `{{@SCENE_N_FIRST_FRAME}}` | primeiro quadro aprovado da cena N |
| `{{@SCENE_N_FINAL_FRAME}}` | último quadro aprovado da cena N |

Depois de colar o texto:

1. localizar cada token `{{@...}}`;
2. apagar somente aquele token;
3. digitar `@`;
4. selecionar a imagem correspondente na interface;
5. confirmar visualmente que a menção ficou vinculada;
6. repetir isso para **todas as ocorrências**, inclusive nomes repetidos;
7. só então enviar o prompt.

Não enviar um prompt se a referência aparecer apenas como texto comum.

O mapa `OL-CITY-MAP-001-presentation.png` pode orientar a geografia geral, mas
**não deve ser usado como referência de estilo**, pois é uma ilustração aérea e
o vídeo precisa ser fotográfico.

---

## 6. Primeira mensagem para o chat do Flow

Copiar este bloco antes de gerar qualquer mídia:

```text
We are planning a new 60-second live-action cinematic opening for the
fictional coastal city of Port Azure and the Operation Lighthouse
emergency-response experience.

Act as a pre-production and visual-continuity assistant first.
Do not generate any video until I explicitly write: GENERATE SCENE [NUMBER].

The final structure is seven separate 8-second clips followed by a
4-second title composition created outside Flow.

Before any video generation, we will:
1. establish reusable character and environment references;
2. create a visual storyboard with a first and final frame for every scene;
3. review continuity, composition, weather, wardrobe and audio;
4. generate exactly one video output at a time.

Global visual rules:
- photorealistic live-action footage filmed on real locations;
- contemporary fictional Atlantic coastal city;
- the same stormy blue-hour evening in every scene;
- restrained slate-blue exterior light and warm amber practical light;
- physically believable rain, wind, water, clothing and materials;
- calm civilian emergency response, never military;
- no generated titles, captions, readable signage, logos or watermarks;
- no panic, injuries, destruction spectacle, weapons or unsafe behavior;
- no animation, CGI, miniature, plastic or video-game appearance;
- no rapid cuts, flashing lights or excessive camera shake;
- preserve useful lower-frame space for captions added later.

Global continuity rules:
- preserve the exact identity and wardrobe of every referenced character;
- preserve the same lighthouse architecture, city materials and weather;
- use only one clear physical action in each 8-second clip;
- treat every approved image as canonical;
- never replace a referenced character with a similar-looking person;
- never invent visible production equipment.

Audio rules:
- generate natural location ambience and specified Foley;
- generate dialogue only when an exact quoted line is provided;
- spoken dialogue must be Brazilian Portuguese with natural pronunciation;
- no additional voices, narration, music, announcements or radio chatter;
- do not create subtitles or visible dialogue text.

First, confirm which model and workflow in my current Flow interface support:
- reusable image ingredients or references;
- image-to-video;
- first and last frames;
- native synchronized audio and dialogue;
- exactly one 8-second 16:9 output.

Do not generate anything yet. Reply only with the compatible options and any
limitations I must know before creating the reference images.
```

### Se o Flow tentar gerar imediatamente

Copiar:

```text
Stop. This is a planning step only. Do not generate an image or video.
Confirm the available reference, storyboard, first-frame, last-frame and
native-audio controls in the current interface.
```

---

## 7. Bíblia visual

### 7.1 Identidade de Port Azure

Port Azure deve parecer uma cidade atlântica fictícia construída ao longo de
séculos, não uma metrópole futurista:

- porto protegido por quebra-mares baixos de pedra;
- edifícios de alvenaria clara com dois a quatro andares;
- telhados de ardósia escura;
- ruas estreitas e piso molhado;
- instalações municipais discretas;
- postes e luminárias âmbar;
- interiores funcionais de madeira, metal pintado e vidro;
- nenhum arranha-céu dominante;
- nenhuma arquitetura de ficção científica.

### 7.2 Farol canônico

- torre cilíndrica de alvenaria branca;
- base de pedra;
- sala da lanterna escura;
- quebra-mar baixo de pedra;
- feixe branco quente;
- textura envelhecida e escala humana real;
- sem casas anexas extravagantes;
- sem penhasco fantástico;
- sem tripé, câmera ou pessoa no primeiro plano.

### 7.3 Mission Control canônico

- sala municipal adaptada, não centro militar;
- paredes carvão;
- mesa central de madeira;
- janelas grandes com chuva e porto ao fundo;
- luminárias de mesa âmbar;
- monitores convencionais e discretos;
- mapas e documentos sem texto legível;
- poucos indicadores vermelhos, nunca dominantes;
- cabos, pastas e materiais de uso real;
- nenhuma interface holográfica.

### 7.4 Personagens canônicos

**Mission Commander**

- usar `REF-COMMANDER`;
- mulher madura;
- cabelo escuro com mechas grisalhas;
- jaqueta impermeável azul-marinho;
- camisa operacional carvão;
- expressão serena e responsável;
- autoridade civil, nunca militar.

**Maya Chen**

- usar `REF-MAYA`;
- mulher adulta;
- cabelo escuro preso;
- jaqueta impermeável azul-petróleo e carvão;
- rádio discreto;
- expressão analítica e atenta;
- movimentos precisos, sem pose heroica.

**Jules Martin**

- usar `REF-JULES`;
- homem adulto negro;
- cabelo curto e barba aparada;
- jaqueta impermeável laranja e cinza;
- rádio discreto;
- presença calma de coordenador de campo;
- sem marcas ou insígnias reais.

---

## 8. Imagens-mestre a criar antes do storyboard

Gerar uma imagem por vez. Salvar o arquivo aprovado antes de continuar.

### 8.1 Porto e cidade

```text
Generate exactly ONE 16:9 photorealistic reference image, not a video.

Create the canonical wide environmental reference for the fictional Atlantic
coastal city of Port Azure at blue hour as a severe storm approaches.

A sheltered working harbor is surrounded by weathered two-to-four-storey
masonry buildings with pale rendered facades and dark slate roofs. Narrow wet
streets descend toward a stone quay. Small civilian boats are safely moored.
Warm amber streetlights reflect naturally on wet stone. Dark slate-blue clouds
and light rain create tension without disaster spectacle.

In the middle distance, include the canonical lighthouse: a full-scale white
cylindrical masonry tower with a dark slate lantern room on a low stone
breakwater. Its warm-white beacon is visible but not overexposed.

Natural 35mm photographic perspective, realistic scale, restrained contrast,
believable Atlantic weather and ordinary contemporary architecture. This image
will be reused as a continuity reference for multiple live-action video shots.

No people in the foreground, no readable signs, no logos, no text, no military
vehicles, no skyscrapers, no futuristic architecture, no holograms, no CGI,
no miniature look, no fantasy cliffs, no flooding, no destruction, no visible
camera equipment or tripod.
```

Salvar como:

```text
OL-OPENING-V2-REF-PORT-AZURE-HARBOR.png
```

### 8.2 Farol

```text
Generate exactly ONE 16:9 photorealistic reference image, not a video.

Create the canonical close environmental reference for Port Azure's lighthouse
during the same stormy blue-hour evening as the approved harbor reference.

Match the exact city palette and weather. Show a full-scale white cylindrical
masonry lighthouse with subtly weathered stone, a dark slate lantern room and
a warm-white beacon, standing on a low stone breakwater. The sea is active but
not dangerous, with small realistic waves and light rain. A few warm harbor
windows are visible far behind it.

Natural 50mm perspective from a safe shore-side viewpoint. Clean, balanced
composition with open space around the tower. This image must become the
canonical lighthouse reference for every later storyboard frame and video.

No people, boats crossing the foreground, tripods, cameras, filming equipment,
signage, text, logos, dramatic lightning, laser-like beam, fantasy architecture,
ruins, flooding, CGI, miniature or plastic appearance.
```

Salvar como:

```text
OL-OPENING-V2-REF-LIGHTHOUSE.png
```

### 8.3 Mission Control

```text
Generate exactly ONE 16:9 photorealistic reference image, not a video.

Create the canonical empty Port Azure municipal Mission Control room during the
same stormy blue-hour evening.

This is a modest converted municipal operations room, not a military command
center: charcoal walls, one large wooden coordination table, practical amber
desk lamps, rain-streaked windows overlooking the dim harbor, several ordinary
computer monitors, paper folders, a radio and a physical city map angled on the
table. Monitor and document content must remain abstract and unreadable.

Use natural eye-level 35mm perspective. Preserve realistic office proportions,
subtle wear, practical cable management and enough open walking space around
the table. Slate-blue exterior light and warm amber interior light must match
the Port Azure harbor reference.

No people, generated text, readable maps, logos, holograms, giant video walls,
science-fiction interfaces, military insignia, weapons, glossy showroom design,
CGI or video-game appearance.
```

Salvar como:

```text
OL-OPENING-V2-REF-MISSION-CONTROL.png
```

### 8.4 Abrigo comunitário

```text
Generate exactly ONE 16:9 photorealistic reference image, not a video.

Create the canonical Port Azure community shelter during the same stormy
blue-hour evening.

A modest multipurpose municipal room has plain warm-gray walls, wooden tables,
ordinary stackable chairs, warm practical ceiling lamps and rain-streaked
windows showing the dim slate-blue exterior. Neatly arranged emergency supplies
include folded charcoal and rust-colored blankets, sealed unmarked cardboard
boxes, bottled water without labels and a small battery radio.

Natural eye-level 35mm perspective, realistic materials and restrained
documentary lighting. The room is prepared and calm, never crowded or chaotic.

No people, posters, calendars, readable labels, logos, branded packaging,
military equipment, hospital imagery, panic, damage, CGI or illustration.
```

Salvar como:

```text
OL-OPENING-V2-REF-SHELTER.png
```

### 8.5 Rua, barreira e instalação elétrica

```text
Generate exactly ONE 16:9 photorealistic continuity reference image, not a
video.

Create a Port Azure municipal field-location reference during the same stormy
blue-hour evening. Show a wet masonry street near a modest stone bridge, an
already-positioned plain road barrier and, farther along the same municipal
service corridor, a closed gray utility enclosure behind a locked safety
boundary.

Use pale rendered facades, dark slate roofs, wet asphalt, warm amber street and
maintenance lamps, visible rain and realistic reflections. Keep all routes and
safety boundaries physically believable.

No people, readable road signs, numbers, logos, company markings, open
electrical panels, exposed live components, sparks, damaged bridge, flooding,
accident, rescue spectacle, CGI or futuristic infrastructure.
```

Salvar como:

```text
OL-OPENING-V2-REF-FIELD-CORRIDOR.png
```

---

## 9. Aprovação das imagens-mestre

Não aprovar uma referência apenas porque ela parece bonita.

Verificar:

- proporção e escala arquitetônica;
- desenho do farol;
- continuidade de chuva e horário;
- paleta azul-ardósia e âmbar;
- ausência de texto e marcas;
- ausência de elementos futuristas;
- segurança operacional;
- espaço para pessoas e movimento nas cenas;
- ausência de equipamento de filmagem;
- coerência com os três retratos canônicos.

Se uma imagem falhar, corrigir somente essa referência. Não iniciar o
storyboard visual com referências inconsistentes.

---

## 10. Pedido do storyboard visual

Depois de carregar as cinco imagens-mestre e os três personagens, copiar:

```text
Create a VISUAL STORYBOARD only. Do not generate video yet.

Use the explicitly linked references {{@PORT_AZURE_HARBOR}},
{{@LIGHTHOUSE}}, {{@MISSION_CONTROL}}, {{@SHELTER}},
{{@FIELD_CORRIDOR}}, {{@MISSION_COMMANDER}}, {{@MAYA_CHEN}} and
{{@JULES_MARTIN}} as canonical.

Every @ reference in this prompt must be selected from the Flow chat reference
menu. A filename written as plain text is not an acceptable substitute.

Create exactly fourteen cinematic storyboard frames in 16:9:
- Scene 1 first frame and final frame;
- Scene 2 first frame and final frame;
- Scene 3 first frame and final frame;
- Scene 4 first frame and final frame;
- Scene 5 first frame and final frame;
- Scene 6 first frame and final frame;
- Scene 7 first frame and final frame.

Every frame belongs to the same stormy blue-hour evening. Preserve exact
character identity, wardrobe, city materials, lighthouse architecture,
weather direction and lighting continuity.

Storyboard plan:

Scene 1 — Harbor awareness:
First frame: wide Port Azure harbor, wet quay in the foreground, lighthouse
visible in the middle distance, storm approaching.
Final frame: the composition settles closer to the inland street entrance,
with one round amber streetlight prominent and the harbor still readable.

Scene 2 — Route restriction:
First frame: match the round amber streetlight from Scene 1 above a wet street
near the bridge. {{@JULES_MARTIN}} and a second municipal worker stand safely
behind an existing road barrier.
Final frame: {{@JULES_MARTIN}} raises his radio near his face while the other
worker points toward a safe diversion route; the barrier remains closed and
visible.

Scene 3 — Community preparation:
First frame: match Jules's radio with a small battery radio being placed on a
wooden shelter table.
Final frame: two adult volunteers complete one hand-to-hand transfer of a
folded blanket beside an unmarked supply box.

Scene 4 — Evidence arrives:
First frame: match the rectangular blanket and box shapes with
{{@MAYA_CHEN}} carrying a plain charcoal folder through the
{{@MISSION_CONTROL}} doorway.
Final frame: Maya places the closed folder on the wooden coordination table;
{{@MISSION_COMMANDER}} is visible beyond it.

Scene 5 — Conflicting evidence:
First frame: close oblique overhead view of the same folder opening beside an
abstract physical city map with no readable text.
Final frame: two different hands place two conflicting neutral-colored route
markers near the same location, then stop without making a decision.

Scene 6 — Human verification:
First frame: widen from the same table and markers to reveal {{@MAYA_CHEN}} and
{{@MISSION_COMMANDER}} facing each other.
Final frame: after {{@MISSION_COMMANDER}} speaks, both look toward the
rain-streaked window where a soft lighthouse sweep is reflected.

Scene 7 — The lighthouse remains:
First frame: match the reflected sweep with the real canonical lighthouse beam
crossing damp air.
Final frame: perfectly stable, balanced lighthouse composition with open
negative space for a title added later.

Camera variety:
- Scene 1: restrained lateral aerial glide, 28mm;
- Scene 2: locked eye-level medium-wide frame, 40mm;
- Scene 3: short lateral slider movement, 35mm;
- Scene 4: over-the-shoulder tracking move behind Maya, 35mm;
- Scene 5: stationary high oblique detail shot with one controlled focus shift,
  50mm;
- Scene 6: subtle 20-degree arc around the table, 50mm;
- Scene 7: completely stationary shore-side composition, 50mm.

Do not embed panel labels, captions, titles or any readable text inside the
images. Do not invent new principal characters. Do not alter the approved
references. Do not generate video.
```

---

## 11. Checklist do storyboard visual

Analisar os 14 quadros antes de aprovar:

### Continuidade

- Maya, Jules e Mission Commander mantêm exatamente o mesmo rosto.
- Cabelo, jaqueta, rádio e cores não mudam.
- O farol tem o mesmo corpo, lanterna e quebra-mar.
- Chuva, direção do vento e horário não reiniciam entre cenas.
- Mission Control não muda de tamanho ou arquitetura.
- Objetos usados em match cuts ocupam regiões compatíveis do quadro.

### Composição

- Cada quadro possui um sujeito principal claro.
- O primeiro e o último quadro contam uma ação possível em 8 segundos.
- A câmera não precisa percorrer distância excessiva.
- A quinta parte inferior permanece utilizável para legendas.
- Nenhum rosto ou objeto importante será coberto por legenda.

### Segurança e realismo

- Barreiras já estão posicionadas.
- Ninguém toca componentes elétricos.
- Não há veículo avançando sobre trabalhadores.
- Não há multidão em pânico.
- Não há equipamento de filmagem visível.
- Não há texto, logotipo ou interface falsa legível.

### Áudio

- Som ambiente corresponde ao local.
- Só existem três falas diegéticas em todo o filme.
- Nenhuma fala compete com a narração.
- Não há música gerada pelo Flow; a trilha será controlada na pós-produção.

---

## 12. Escolha da ferramenta de geração por cena

O Flow informou que **Interpolação / First and Last Frame** não aceita
simultaneamente referências de personagem. Portanto, não tentar forçar os dois
mecanismos no mesmo pedido.

Uma tentativa posterior com **Reference-to-Video** foi bloqueada pelos filtros
de segurança do Flow. A produção seguiu com sucesso usando Interpolação em todas
as cenas, porque os personagens e ambientes já estavam incorporados nos quadros
aprovados do storyboard.

| Cena | Ferramenta | Prioridade |
| --- | --- | --- |
| 1 | Interpolação / First and Last Frame | geografia e movimento entre os quadros |
| 2 | Interpolação / First and Last Frame | identidade de Jules incorporada nos quadros |
| 3 | Interpolação / First and Last Frame | continuidade do rádio e da transferência |
| 4 | Interpolação / First and Last Frame | identidades incorporadas nos quadros |
| 5 | Interpolação / First and Last Frame | continuidade exata da pasta, mapa e marcadores |
| 6 | Interpolação / First and Last Frame | identidades e posições incorporadas nos quadros |
| 7 | Interpolação / First and Last Frame | câmera imóvel, farol e feixe |

### Regra de prioridade

- Usar **First and Last Frame** como fluxo comprovado para esta produção.
- Em First and Last Frame, toda a identidade visual necessária deve estar
  incorporada nos próprios quadros.
- Não tentar contornar um bloqueio de segurança usando descrições alternativas,
  outras contas ou repetição automática.
- Se Reference-to-Video voltar a ser considerado, tratar como teste separado,
  não como requisito da produção.
- Os prompts das cenas abaixo preservam a direção narrativa; no Flow, fornecer
  somente os dois frames permitidos pela ferramenta e omitir menções adicionais
  que a interface não aceite.

---

## 13. Roteiro de áudio

### 13.1 Narração externa

A narração deve ser gravada ou sintetizada como uma única performance, para
preservar identidade vocal. Não pedir ao Flow para narrar separadamente cada
cena.

| Tempo | Texto |
| --- | --- |
| 00:00.8–00:07.4 | Port Azure conhece tempestades. Mas, nesta noite, o perigo não vem apenas do mar. |
| 00:08.4–00:11.2 | Rotas se fecham. Serviços oscilam. |
| 00:16.5–00:23.4 | Enquanto a chuva avança, equipes e moradores transformam preparação em proteção. |
| 00:24.4–00:27.8 | Relatos chegam incompletos. Alguns se contradizem. |
| 00:32.4–00:39.5 | No Mission Control, cada sinal precisa virar evidência; cada evidência, uma decisão explicável. |
| 00:40.4–00:44.1 | Especialistas trabalham juntos. Ferramentas ajudam, mas pessoas assumem a responsabilidade. |
| 00:48.5–00:55.8 | Recuperar uma cidade é corrigir o rumo quando os fatos mudam. A tempestade está chegando. O farol permanece aceso. Sua missão começa agora. |

Direção:

- português brasileiro natural;
- aproximadamente 125 palavras por minuto;
- voz madura, íntima e documental;
- urgência contida;
- sem voz de anúncio, trailer ou assistente virtual;
- pausas reais entre ideias;
- enfatizar “evidência”, “pessoas”, “fatos” e “missão”.

### 13.2 Falas geradas dentro do Flow

| Cena | Tempo local aproximado | Pessoa | Fala exata |
| --- | --- | --- | --- |
| 2 | 00:04.0–00:06.8 | Jules | “Rota costeira bloqueada. Desvio em verificação.” |
| 4 | 00:04.3–00:06.7 | Maya | “Recebido. Ainda precisamos confirmar.” |
| 6 | 00:04.5–00:06.2 | Mission Commander | “Verifiquem antes de agir.” |

Não permitir improvisação, nomes adicionais, resposta de outra pessoa ou voz
de rádio inteligível.

### 13.3 Ambiência e Foley

| Cena | Ambiência | Foley principal |
| --- | --- | --- |
| 1 | chuva leve, mar protegido, vento, cabos de barcos | água contra pedra |
| 2 | chuva no asfalto, vento urbano discreto | rádio, tecido impermeável, barreira |
| 3 | chuva abafada nas janelas, sala ocupada ao fundo | caixa, tecido e rádio pousado |
| 4 | sala operacional baixa, chuva no vidro | passos, porta, pasta na mesa |
| 5 | room tone, chuva distante | papel, marcadores sobre mapa |
| 6 | room tone silencioso, chuva e equipamento discreto | mão sobre madeira, roupa |
| 7 | mar aberto moderado, chuva e vento | onda nas pedras, mecanismo distante do farol |

### 13.4 Música em pós-produção

- trilha original, sem material de terceiros;
- textura grave e contida;
- sem percussão de trailer;
- começar quase imperceptível;
- adicionar pulso discreto ao entrar no Mission Control;
- reduzir sob as três falas;
- crescer moderadamente na cena 7;
- sustentar o último acorde durante o título;
- alvo de entrega para reprodução on-line: aproximadamente `-14 LUFS`,
  true peak igual ou inferior a `-1 dBTP`;
- manter diálogo claramente acima de música e ambiência.

---

## 14. Prompts completos dos sete vídeos

Só usar estes prompts depois da aprovação das referências e do storyboard.

### Cena 1 — Harbor awareness

Referências prioritárias:

1. `{{@SCENE_1_FIRST_FRAME}}`
2. `{{@SCENE_1_FINAL_FRAME}}`

Modo: **Interpolação / First and Last Frame**.

```text
GENERATE SCENE 1.

Generate exactly ONE 8-second 16:9 live-action video with native synchronized
location audio. One continuous shot, no cuts and no alternate output.

Use {{@SCENE_1_FIRST_FRAME}} as the first frame and
{{@SCENE_1_FINAL_FRAME}} as the last frame. Treat everything visible in these
two frames as canonical, including harbor architecture, weather, palette,
lighthouse design and object placement.

A restrained wide establishing view of Port Azure during stormy blue hour.
The camera performs a slow lateral aerial glide of only a few metres above a
wet stone quay using a natural 28mm perspective. Small boats remain safely
moored. Light rain crosses the slate-blue harbor. Warm amber streetlights
reflect on the stone. The canonical lighthouse remains visible in the middle
distance.

Begin precisely on {{@SCENE_1_FIRST_FRAME}}. During the shot, move laterally
toward the inland street entrance. End precisely on
{{@SCENE_1_FINAL_FRAME}}, with one round amber streetlight prominent while
{{@PORT_AZURE_HARBOR}} and {{@LIGHTHOUSE}} remain readable.

Audio: natural light rain, restrained wind, mooring lines and small waves
against stone. No speech, narration, announcements or music.

Photorealistic real-camera footage, physically believable water and weather,
ordinary contemporary Atlantic architecture and restrained cinematic contrast.

No generated text, signage, logos, watermarks, people near danger, dramatic
lightning, flooding, destruction, flying debris, fast drone movement, orbit,
zoom, camera shake, CGI, animation, miniature or video-game appearance.
```

### Cena 2 — Route restriction

Referências prioritárias:

1. `{{@JULES_MARTIN}}`
2. `{{@FIELD_CORRIDOR}}`
3. o quadro aprovado da cena 2 que melhor representa a composição final

Modo: **Reference-to-Video**. Não anexar first/last frames como interpolação.

```text
GENERATE SCENE 2.

Generate exactly ONE 8-second 16:9 live-action video with native synchronized
audio. One continuous shot, no cuts and no alternate output.

Use the explicitly linked {{@JULES_MARTIN}}, {{@FIELD_CORRIDOR}} and the
approved Scene 2 composition reference as canonical. Preserve
{{@JULES_MARTIN}}'s exact face, hair, beard, orange-and-gray waterproof jacket
and radio.

A locked eye-level medium-wide 40mm composition beside the modest masonry
bridge during the same stormy blue-hour evening. Jules and one adult municipal
worker remain safely behind an already-positioned road barrier. No vehicle
approaches them.

Maintain the approved composition throughout the shot. {{@JULES_MARTIN}} checks
the closed route, raises his radio once and says naturally in Brazilian
Portuguese: "Rota costeira bloqueada. Desvio em verificação." The second worker
makes one restrained gesture toward the safe diversion. End with both workers
and the closed barrier still clearly visible.

Audio: visible rain on asphalt, restrained wind, waterproof fabric and Jules's
single clearly synchronized line. No reply, narration, music, siren, horn or
additional radio speech.

No camera movement. No generated text, readable signs, numbers, logos,
watermarks, moving bus, collision risk, panic, unsafe conduct, deformed hands,
extra people, identity change, CGI, animation or video-game appearance.
```

### Cena 3 — Community preparation

Referências prioritárias:

1. `{{@SCENE_3_FIRST_FRAME}}`
2. `{{@SCENE_3_FINAL_FRAME}}`

Modo: **Interpolação / First and Last Frame**.

```text
GENERATE SCENE 3.

Generate exactly ONE 8-second 16:9 live-action video with native synchronized
location audio. One continuous shot, no cuts and no alternate output.

Use {{@SCENE_3_FIRST_FRAME}} as the first frame and
{{@SCENE_3_FINAL_FRAME}} as the last frame. Treat the shelter, volunteers,
radio, table, supplies, lighting and wardrobe visible in these frames as
canonical.

Begin precisely on {{@SCENE_3_FIRST_FRAME}}, with a small battery radio being
placed on the wooden table. The camera makes a short, slow lateral slider move
using a natural 35mm perspective. One volunteer lifts a single folded
rust-colored blanket and completes one hand-to-hand transfer to the other
volunteer beside an unmarked cardboard box. End precisely on
{{@SCENE_3_FINAL_FRAME}}.

Audio: muffled rain against windows, quiet room tone, radio placed on wood,
cardboard and natural fabric movement. No intelligible radio message, dialogue,
narration, announcements or music.

Warm practical ceiling lamps, realistic skin and hands, natural cotton and
cardboard textures, calm purposeful expressions.

No generated text, labels, logos, branded supplies, crowd, panic, hospital
scene, additional limbs, fused hands, dropped objects, camera push-in, orbit,
zoom, shake, CGI, animation or plastic appearance.
```

### Cena 4 — Evidence arrives

Referências prioritárias:

1. `{{@MAYA_CHEN}}`
2. `{{@MISSION_COMMANDER}}`
3. `{{@MISSION_CONTROL}}`

Modo: **Reference-to-Video**. Não anexar first/last frames como interpolação.

```text
GENERATE SCENE 4.

Generate exactly ONE 8-second 16:9 live-action video with native synchronized
audio. One continuous shot, no cuts and no alternate output.

Use the explicitly linked {{@MAYA_CHEN}}, {{@MISSION_COMMANDER}} and
{{@MISSION_CONTROL}} as canonical references. Preserve {{@MAYA_CHEN}}'s exact
face, tied dark hair, blue-green-and-charcoal waterproof jacket and radio.
Preserve {{@MISSION_COMMANDER}}'s exact face, hair, age and navy waterproof
jacket.

Begin behind and slightly beside {{@MAYA_CHEN}} as she enters through the open
doorway carrying one plain charcoal folder. Use a restrained over-the-shoulder
tracking move with natural 35mm perspective. She crosses only a few steps toward
the wooden coordination table. {{@MISSION_COMMANDER}} is visible beyond the
table and remains identical to {{@MISSION_COMMANDER}}.

{{@MAYA_CHEN}} places the closed folder on the table and says naturally in
Brazilian Portuguese: "Recebido. Ainda precisamos confirmar." End with
{{@MAYA_CHEN}}'s hand leaving the folder while {{@MISSION_COMMANDER}} remains
visible beyond the table.

Audio: quiet operations-room ambience, rain on windows, three or four natural
footsteps, door movement, folder touching wood and Maya's single synchronized
line. No reply, narration, music, alarms or intelligible background speech.

No generated text, readable screens, logos, holograms, science-fiction control
deck, military uniforms, identity changes, additional principal characters,
long walk, push-in, orbit, rapid camera movement, CGI or animation.
```

### Cena 5 — Conflicting evidence

Referências prioritárias:

1. `{{@SCENE_5_FIRST_FRAME}}`
2. `{{@SCENE_5_FINAL_FRAME}}`

Modo: **Interpolação / First and Last Frame**.

```text
GENERATE SCENE 5.

Generate exactly ONE 8-second 16:9 live-action video with native synchronized
location audio. One continuous shot, no cuts and no alternate output.

Use {{@SCENE_5_FIRST_FRAME}} as the first frame and
{{@SCENE_5_FINAL_FRAME}} as the last frame. Treat the folder, physical map,
markers, hands, wooden table and room lighting visible in these frames as
canonical.

A stationary high oblique detail composition with a natural 50mm perspective.
The folder opens beside an abstract physical city map with no readable words,
numbers or symbols. One hand places a slate-blue route marker near a location.
A different hand places a restrained amber marker beside it, creating a clear
visual contradiction. Both hands stop. Nobody removes either marker and no
decision is made.

Use one controlled focus shift from the folder edge to the two conflicting
markers. The camera position itself remains completely stationary. End
precisely on {{@SCENE_5_FINAL_FRAME}}.

Audio: quiet room tone, distant rain, paper movement and two small marker
contacts on the table. No dialogue, narration, music, alert tone or interface
sound.

No readable map text, labels, logos, glowing UI, holograms, red-versus-green
color-only meaning, extra hands, distorted fingers, changing table material,
camera push-in, pan, orbit, zoom, shake, CGI or animation.
```

### Cena 6 — Human verification

Gerar esta cena primeiro como prova técnica.

Referências prioritárias:

1. `{{@MISSION_COMMANDER}}`
2. `{{@MAYA_CHEN}}`
3. `{{@MISSION_CONTROL}}`

Modo: **Reference-to-Video**. Não usar interpolação; priorizar as três
referências de identidade e ambiente.

```text
GENERATE SCENE 6.

Generate exactly ONE 8-second 16:9 live-action video with native synchronized
audio. One continuous shot, no cuts and no alternate output.

Use the explicitly linked {{@MISSION_COMMANDER}}, {{@MAYA_CHEN}} and
{{@MISSION_CONTROL}} as canonical references. Preserve
{{@MISSION_COMMANDER}}'s and {{@MAYA_CHEN}}'s exact faces, ages, hair, wardrobe
and relative height.

Begin with {{@MAYA_CHEN}} and {{@MISSION_COMMANDER}} facing one another across
the wooden coordination table, with two different route markers visible between
them. Use a restrained 20-degree camera arc over the entire shot with a natural
50mm perspective, never moving closer to their faces.

{{@MISSION_COMMANDER}} studies the markers, looks directly at
{{@MAYA_CHEN}} and says calmly in Brazilian Portuguese: "Verifiquem antes de
agir." {{@MAYA_CHEN}} gives one small acknowledging nod. Both then turn their
attention toward the rain-streaked window, where a soft lighthouse sweep is
reflected. End with both characters and the reflected light visible in the same
continuous composition.

Audio: quiet operations-room ambience, rain on glass, subtle clothing movement,
one hand touching wood and {{@MISSION_COMMANDER}}'s single synchronized line.
No reply, narration, music, alarm, radio chatter or background conversation.

No authoritarian delivery, celebration, military framing, pointing order,
generated text, readable screens, logos, identity drift, face replacement,
extra fingers, exaggerated nod, camera push-in, full orbit, zoom, shake, CGI or
animation.
```

### Cena 7 — The lighthouse remains

Referências prioritárias:

1. `{{@SCENE_7_FIRST_FRAME}}`
2. `{{@SCENE_7_FINAL_FRAME}}`

Modo: **Interpolação / First and Last Frame**.

```text
GENERATE SCENE 7.

Generate exactly ONE 8-second 16:9 live-action video with native synchronized
location audio. One continuous shot, no cuts and no alternate output.

Use {{@SCENE_7_FIRST_FRAME}} as the first frame and
{{@SCENE_7_FINAL_FRAME}} as the last frame. Treat the lighthouse tower, lantern
room, breakwater, coastline, weather and harbor lights visible in these frames
as canonical.

Begin precisely on {{@SCENE_7_FIRST_FRAME}} as the warm-white beacon crosses
the damp air. Use a natural 50mm shore-side composition. The camera remains
perfectly stationary for all eight seconds. Light rain falls, realistic small
waves meet the rocks and the beacon makes one slow restrained sweep.

End precisely on {{@SCENE_7_FINAL_FRAME}} and hold its clean balanced
composition with open negative space for a title added outside Flow. The storm
is still approaching; this is resilience, not victory.

Audio: natural rain, moderate sea, wind and a very subtle distant lighthouse
mechanism. No dialogue, narration, music, horn or alarm.

No people, vehicles, boats crossing the foreground, tripods, cameras, filming
equipment, generated text, signage, logos, full-frame flash, laser-like beam,
dramatic lightning, fantasy tower, cliff, flooding, camera movement, zoom,
shake, CGI, animation, miniature or plastic appearance.
```

---

## 15. Ordem de geração

Gerar nesta ordem:

1. Cena 6 — maior risco de identidade, atuação e diálogo.
2. Cena 2 — Jules, chuva e fala curta.
3. Cena 4 — Maya, caminhada, pasta e fala curta.
4. Cena 5 — mãos, props e foco.
5. Cena 3 — interação física entre pessoas.
6. Cena 1 — estabelecimento geográfico.
7. Cena 7 — fechamento e quadro para título.

Essa não é a ordem da montagem; é a ordem de redução de risco. Se a cena 6 não
mantiver os personagens, interromper e corrigir as referências antes de gastar
créditos nas demais.

---

## 16. Revisão obrigatória depois de cada vídeo

Assistir o clipe inteiro com áudio e verificar:

- duração exata;
- proporção e resolução;
- presença de apenas um plano;
- identidade facial durante todos os 8 segundos;
- mãos e objetos durante todo o movimento;
- fala exata, sotaque, sincronização labial e ausência de falas extras;
- ausência de texto, marcas e símbolos inventados;
- continuidade de roupa, chuva, luz e direção;
- movimento de câmera solicitado;
- quadro inicial e final;
- ruídos, música ou vozes não solicitadas;
- segurança física;
- possibilidade de usar o áudio na mixagem.

Registrar:

| Cena | Arquivo | Custo | Imagem | Movimento | Áudio | Continuidade | Decisão |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| 1 |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |

Decisões válidas:

- `APROVADA`;
- `APROVADA COM TRATAMENTO LOCAL`;
- `REJEITADA — AGUARDANDO NOVA AUTORIZAÇÃO`.

Uma rejeição não autoriza automaticamente outra geração.

### Montagem V2 produzida

A primeira montagem completa da versão 2 foi gerada em 26/09/2026:

```text
campaigns\operation-lighthouse\media\assets\OL-OPENING-V2-preview-pt-BR.mp4
```

| Propriedade | Valor |
| --- | --- |
| Duração | 60,000 segundos |
| Vídeo | H.264, 1920×1080, 24 fps |
| Áudio | AAC estéreo, 48 kHz, 60,000 segundos |
| Tamanho | 46.138.444 bytes |
| SHA-256 | `39f6f5546cf2a104d2ed049f3c031ad7c963fa0e8f181bf52fb1d9a2b511478d` |
| Loudness medido | aproximadamente -14,38 LUFS |
| True peak medido | aproximadamente -0,82 dBTP |

A mixagem inclui:

- a nova narração V2 com `pt-BR-Luana:MAI-Voice-2`;
- os áudios nativos das sete cenas, incluindo as falas produzidas pelo Flow;
- ambiência e Foley dos clipes;
- trilha instrumental original;
- compressão sidechain para abrir espaço à narração;
- título local durante os quatro segundos finais.

A nova síntese de narração foi explicitamente autorizada e executada uma única
vez, com custo estimado de aproximadamente US$ 0,02:

| Arquivo | Bytes | SHA-256 |
| --- | ---: | --- |
| `OL-OPENING-V2-narration-pt-BR-luana-mai2.wav` | 4.907.180 | `8fbb4b2de7e62ed8c0626a9c1104b6f279d4e49ff32f09da8cbb898eb5aa8f4e` |

Os sete clipes-fonte foram decodificados integralmente e têm 8 segundos,
1280×720, 24 fps e áudio AAC estéreo a 48 kHz:

| Cena | Arquivo recebido | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| 1 | `Cena 1.mp4` | 5.711.067 | `33009f3c6812067d771036095706fefca04bd3d35f53d36a97f4c2637c5facf8` |
| 2 | `Cena 2.mp4` | 4.401.776 | `d27451828aded350ee3ade85e531847b1691a26a3d8b0ceb86b2a809b945b7b3` |
| 3 | `Cena 3.mp4` | 3.136.894 | `5efc8188719cf60a5d95bda4484b3502a62af8c7f29af49a9f469e4735b37f2b` |
| 4 | `Cena 4.mp4` | 2.821.844 | `5373345eb6d79baac856936a3f7bab15958830d1602b492e2981a2441f7ba131` |
| 5 | `Cena 5.mp4` | 3.431.462 | `0fd5121979865d723b44cb7d0e68ed907ffb2b7c770a206a15ea6a3175e924ac` |
| 6 | `Cena 6.mp4` | 2.793.170 | `d82a0a444a77878fae234969704818ac6018a3ed222c3e368e86d5212396a327` |
| 7 | `Cena 7.mp4` | 3.063.195 | `29a48add52cd521e8d969648462020e6de30c1a330aec33f70da1aa351d2ff3b` |

A amostragem visual de início, meio e fim confirmou a ordem narrativa e boa
continuidade geral. A montagem ainda é uma **prévia editorial**: é necessário
ouvir integralmente as falas nativas das cenas 2, 4 e 6 para confirmar texto,
pronúncia, sincronização e ausência de vozes extras antes de promovê-la a master.

---

## 17. Mensagem para corrigir o storyboard, não o vídeo

Usar antes de qualquer geração:

```text
Revise only the visual storyboard frame identified below. Do not generate video
and do not alter any approved frame.

Frame to revise:
[SCENE NUMBER — FIRST OR FINAL FRAME]

Observed problem:
[DESCRIBE THE EXACT VISIBLE PROBLEM]

Required correction:
[DESCRIBE ONE MEASURABLE CHANGE]

Preserve exactly:
- approved character identity and wardrobe;
- approved environment architecture;
- stormy blue-hour lighting;
- camera height and lens;
- all unrelated composition choices.

Generate exactly one corrected storyboard frame.
```

---

## 18. Mensagem para uma refação excepcional

Usar somente após decisão explícita:

```text
Regenerate exactly ONE 8-second video for Scene [NUMBER].

The previous result was rejected only for this reason:
[ONE PRIMARY FAILURE]

Correct that failure while preserving:
- the approved reference images;
- the approved first and final storyboard frames;
- character identity and wardrobe;
- environment, lighting, weather and palette;
- the original camera plan;
- the exact physical action;
- the exact approved dialogue and audio constraints.

Do not introduce a new composition, character, prop, camera move or additional
dialogue. Generate one output only.
```

---

## 19. Encerramento local

De `00:56` a `01:00`:

- congelar ou manter o último quadro estável da cena 7;
- escurecer discretamente a imagem;
- compor texto fora do Flow;
- título: **Operation Lighthouse**;
- subtítulo: **Sua missão começa agora**;
- sustentar chuva, mar e acorde final;
- terminar com saída suave para preto;
- não pedir ao modelo para desenhar o título.

---

## 20. Entregáveis da versão 2

### Pré-produção

- cinco imagens-mestre de ambiente;
- três referências canônicas de personagem;
- 14 quadros de storyboard;
- roteiro de narração aprovado;
- três falas aprovadas;
- plano de áudio;
- planilha de continuidade e créditos.

### Produção

- sete MP4 originais de 8 segundos;
- áudios nativos preservados;
- frames inicial e final salvos;
- registro do modelo e custo de cada geração.

### Pós-produção

- narração única;
- diálogo selecionado dos clipes;
- ambiência e Foley;
- trilha original;
- mixagem com ducking;
- legendas pt-BR sincronizadas;
- master de 60 segundos;
- variante com movimento reduzido;
- revisão editorial antes de substituir o ativo oficial.

---

## 21. Fontes e fundamentos

- Google Cloud — Ultimate prompting guide for Veo 3.1:
  <https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1>
- Google DeepMind — How to create effective prompts with Veo:
  <https://deepmind.google/models/veo/prompt-guide/>
- Google Flow Help — modelos e recursos suportados:
  <https://support.google.com/flow/answer/16352836?hl=en>
- Google Flow Help — edição e construção de cenas:
  <https://support.google.com/labs/answer/16935718?hl=en>
- Google Cloud — geração usando primeiro e último frames:
  <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-first-and-last-frames>
- Google One — gerenciamento de créditos de IA:
  <https://support.google.com/googleone/answer/16287445?hl=en>
- EBU R128:
  <https://tech.ebu.ch/docs/r/r128s4.pdf>

Práticas como character sheets, environment bibles e shot lists são adaptações
de métodos tradicionais de pré-produção ao mecanismo oficial de referências e
ingredients do Flow. Elas reduzem variação, mas não garantem identidade perfeita;
por isso o storyboard visual e a revisão cena a cena continuam obrigatórios.
