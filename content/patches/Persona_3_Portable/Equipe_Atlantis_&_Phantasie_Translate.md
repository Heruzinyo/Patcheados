---
game: "Persona_3_Portable"
circle:
  - "Equipe_Atlantis"
  - "Phantasie_Translate"
platforms:
  - "PC"
  - "Sony PlayStation Portable"
status: "Pausado"
origin: "Inglês"
subs: true
graphics: partial
dub: false
credits:
  "Direção":
    - "em.I"
    - "Hinrong"
  "Edição Gráfica":
    - "Hinrong"
    - "Jau"
    - "Yuki-sensei"
    - "Zeros7"
  "Modding":
    - "Ahtheerr"
    - "em.I"
    - "Hinrong"
    - "PHSticks"
    - "Zeros7"
  "Revisão":
    - "em.I"
    - "GustavoEmiya"
    - "Hinrong"
    - "Jvjfe"
    - "PedroGdP"
  "Testes":
    - "JamesEdw"
    - "Kall"
    - "Lorde_Guigas"
    - "Nathan_Weiss_Belmont"
    - "Panamericano"
    - "porcao1214"
  "Tradução":
    - "Ahtheerr"
    - "ANFenix2005"
    - "em.I"
    - "GustavoEmiya"
    - "Hinrong"
    - "Justine"
    - "Jvjfe"
    - "Kami"
    - "lpedrao"
    - "Lursga"
    - "Nevaska"
    - "PedroGdP"
    - "rafilks"
    - "Rivers"
    - "Sorinha_Phantasie"
download:
  - platform: "PC"
    provider: "GitHub"
    format: "zip"
    version: "BETA V2"
    gameversion: "1.01"
    region: "GLOBAL"
    completion: "86%"
    release: "23/02/2026"
    url: "https://github.com/Hinrong/P3P-Traduzido/releases/tag/03012026"
    sha256: "8a226d033de8c5a8e8d60405cc2fe122102756d70d4775f7547a2f7376f2816e"
  - platform: "PC"
    provider: "GitHub"
    variant: "Instalador"
    format: "Instalador"
    version: "BETA V2"
    gameversion: "1.01"
    region: "GLOBAL"
    completion: "86%"
    release: "23/02/2026"
    url: "https://github.com/Ahtheerr/P3P-Instalador-Tradu-o/releases/tag/Instalador"
    sha256: "50669603497f769dbf394de39b1025b0e5a7ced89fe9d0ffeebce5808d172dd1"
  - platform: "Sony PlayStation Portable"
    provider: "Google Drive"
    variant: "NORMAL"
    format: "xdelta"
    version: "BETA V2"
    gameversion: "1.0"
    region: "USA"
    completion: "86%"
    release: "23/02/2026"
    url: "https://drive.google.com/file/d/1G0b9rDGpG_S4TH1-4FMHWcSXSZhQ0UK8/view?usp=drive_link"
    sha256: "4803d99c632f480057e1194e6ece275c00333d4d1d19023ae8f57dc48d36d84a"
  - platform: "Sony PlayStation Portable"
    provider: "Google Drive"
    variant: "UNDUB"
    format: "xdelta"
    version: "BETA V2"
    gameversion: "1.0"
    region: "USA"
    completion: "86%"
    release: "23/02/2026"
    url: "https://drive.google.com/file/d/1FCxo_QCweBz4hd1-Go9wWF3x8s1kmrdb/view?usp=drive_link"
    sha256: "0c22fea8d3d2323489ae7570d00b6a72135b090f55f8376501a9ba960cc6a99e"
resource:
  - name: "Repositório"
    provider: "GitHub"
    url: "https://github.com/Hinrong/P3P-Traduzido"
install:
  - platform: "PC"
    tutorial: generic_pc
  - platform: "PC"
    tutorial: generic_installer
  - platform: "Sony PlayStation Portable"
    tutorial: generic_xdelta
progress:
  - label: "Tradução"
    value: "99%"
  - label: "Revisão"
    value: "50%"
  - label: "Gráficos (PSP)"
    value: "100%"
  - label: "Gráficos (PC)"
    value: "95%"
---

Tradução de Persona 3 Portable feita pela Equipe Atlantis em parceria com Phantasie Translate. 

No **PSP** temos duas versões: **NORMAL** e **UNDUB**. A 'Normal' possui áudio em inglês e a 'Undub' possui áudio em japonês, escolha a desejada.

**Observação:** Para que a tradução funcione corretamente no Linux (ou Steam Deck), é necessário adicionar esse parâmetro de inicialização: `WINEDLLOVERRIDES="dinput8=n,b" %command%`