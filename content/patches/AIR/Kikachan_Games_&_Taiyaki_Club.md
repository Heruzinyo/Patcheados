---
game: "AIR"
circle:
  - "Kikachan_Games"
  - "Taiyaki_Club"
platforms:
  - "PC"
  - "Android"
  - "Sony PlayStation Portable"
status: "Concluído"
origin: "Inglês"
subs: true
graphics: true
dub: false
credits:
  "Agradecimentos Especiais":
    - "Ceuipsolon"
    - name: "Converting_Minds_VNX"
      circle: true
    - name: "Taiyaki_Club"
      circle: true
  "Controle de Qualidade":
    - "Hinrong"
  "Direção":
    - "Manolo-chan"
  "Edição Gráfica":
    - "0Mateus"
    - "Ceuipsolon"
    - "Div-lu"
    - "Manolo-chan"
  "Modding":
    - "0Mateus"
    - "Hinrong"
  "Programação":
    - "Manolo-chan"
  "Revisão":
    - "0Mateus" 
    - "Hinrong"
  "Tradução":
    - "Div-lu"
    - "Manolo-chan"
download:
  - platform: "PC"
    provider: "GitHub"
    variant: "AA"
    format: "Instalador"
    version: "1.0"
    gameversion: "All Ages Edition"
    region: "Japan"
    completion: "100%"
    release: "01/01/2025"
    url: "https://github.com/kikachangames/air/releases/download/v1.0/Air-PC-AA.exe"
    sha256: "1ec1a8425030a00b4b503bc233fff2a1195e9f8b286389dc53977d0802ca29e4"
  - platform: "PC"
    provider: "GitHub"
    variant: "18+"
    format: "Instalador"
    version: "1.0"
    gameversion: "First Press Limited Edition"
    region: "Japan"
    completion: "100%"
    release: "01/01/2025"
    url: "https://github.com/kikachangames/air/releases/download/v1.0/Air-PC-18+.exe"
    sha256: "6438d2f71b87107a92a2e4d7975fe5e7b8d041d5b1525ad8a1374c2ad673f69f"
  - platform: "Android"
    provider: "GitHub"
    variant: "AA"
    format: "APK"
    version: "1.2"
    gameversion: "All Ages Edition"
    region: "Japan"
    completion: "100%"
    release: "31/05/2025"
    url: "https://github.com/kikachangames/air/releases/download/v1.0/AIR-Android-AA.zip"
    sha256: "c2e5f82c7ee5cb95c6507c02b9eada62362ca372aa45af63072ca1d016a204f9"
  - platform: "Android"
    provider: "GitHub"
    variant: "18+"
    format: "APK"
    version: "1.2"
    gameversion: "First Press Limited Edition"
    region: "Japan"
    completion: "100%"
    release: "31/05/2025"
    url: "https://github.com/kikachangames/air/releases/download/v1.0/AIR-Android-18+.zip"
    sha256: "6eb81765f8847c9508f17d05a74dc87c5415aa7c39c51fcf1018948648deee98"
  - platform: "Sony PlayStation Portable"
    provider: "GitHub"
    format: "xdelta"
    version: "1.1"
    gameversion: "1.0"
    region: "Japan"
    completion: "100%"
    release: "11/10/2025"
    url: "https://github.com/kikachangames/AIR-PSP-PT-BR/releases/download/v.1.1/AIR-PSP-PT-BR-1.1.zip"
    sha256: "7ba8928263a8108b0196511d42024f426e352ff41f5b82726db3585927bbac54"
resource:
  - name: "Guia de Rotas"
    provider: "Site"
    url: "https://kikachangames.github.io/air/guia/guia.html"
  - name: "Repositório (PC)"
    provider: "GitHub"
    url: "https://github.com/kikachangames/air"
  - name: "Repositório (PSP)"
    provider: "GitHub"
    url: "https://github.com/kikachangames/AIR-PSP-PT-BR"
  - name: "Site"
    provider: "Site"
    url: "https://kikachangames.github.io/air/"
install:
  - platform: "PC"
    tutorial: generic_installer
  - platform: "Android"
    tutorial:
      - "Extraia os arquivos do patch na pasta onde está a cópia de AIR e substitua os arquivos se solicitado."
      - "Instale o \"rlvm.apk\" fornecido na pasta do patch. Esse é o emulador do RealLive, a engine de AIR (Se já tiver o RLVM instalado pode pular para a parte 4)."
      - "Vá nas configurações de Aplicativo no Android e dê permissão para o rlvm acessar as pastas."
      - "Execute o RLVM, selecione a pasta do jogo (onde estão todos os arquivos) e dê \"OK\"."
      - "Agora é só jogar e se divertir!"
  - platform: "Sony PlayStation Portable"
    tutorial: generic_xdelta
license:
  - "Uso Comercial: Proibido"
progress:
  - label: "Arco Dream - Rota Comum"
    value: "100%"
  - label: "Arco Dream - Rota da Misuzu"
    value: "100%"
  - label: "Arco Dream - Rota da Kano"
    value: "100%"
  - label: "Arco Dream - Rota da Minagi"
    value: "100%"
  - label: "Arco Summer"
    value: "100%"
  - label: "Arco Air"
    value: "100%"
screenshots:
  - "air01.jpg"
  - "air02.jpg"
  - "air03.jpg"
  - "air04.jpg"
  - "air05.jpg"
  - "air06.jpg"
  - "air07.jpg"
  - "air08.jpg"
  - "air09.jpg"
  - "air10.jpg"
  - "psp01.jpg"
  - "psp02.jpg"
  - "psp03.jpg"
---

![Capa Customizada](/games/AIR/Kikachan_Games_&_Taiyaki_Club/coverpsp.jpg)

Você precisará de uma cópia do jogo (versão PC Standard Edition Fully voiced patched) para aplicar o patch.

Nossa tradução é baseada na da Gao Gao Translations, mas também fez uso de alguns elementos da tl da Winter Confetti.

**Bugs Conhecidos:**
- Arco DREAM (19/07): Nesse dia têm 3 linhas de diálogo sem áudio. Elas não foram gravadas por questões de censura. Optamos por manter ainda assim a parte com o texto.
- Arco SUMMER: Mesma situação citada acima.
- Não há suporte para reprodução de vídeo através do RLVM, mas você pode ver a versão legendada da opening na pasta "MOV"

**Agradecimentos:** [Gao Gao Translations](https://gaogaotranslation.wordpress.com/), [Key/Visual Arts/PROTOTYPE](https://key.visualarts.gr.jp/), [Marco Calautti](https://github.com/marco-calautti/DeltaPatcher/), [patr0805](https://patr0805.wordpress.com/2020/02/13/air-psp-first-release/) e [Winter Confetti](https://winter-confetti.blogspot.com/).