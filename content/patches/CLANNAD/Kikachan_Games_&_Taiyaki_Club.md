---
game: "CLANNAD"
circle:
  - "Kikachan_Games"
  - "Taiyaki_Club"
platforms:
  - "PC"
  - "Android"
status: "Concluído"
origin: "Inglẽs"
subs: true
graphics: true
dub: false
credits:
  "Edição de Vídeo":
    - "Hinrong"
  "Edição Gráfica":
    - "Fujoneko"
    - "Hinrong"
    - "Manolo-chan"
  "Modding":
    - "0Mateus"
    - "Hinrong"
  "Port":
    - "0Mateus"
  "Testes":
    - "Manolo-chan"
download:
  - platform: "PC"
    provider: "Google Drive"
    format: "Instalador"
    version: "1.0.1"
    gameversion: "Steam"
    region: "GLOBAL"
    completion: "100%"
    release: "08/08/2025"
    url: "https://drive.google.com/file/d/1Gq1l3oMOkv_NEsa7s6SSUmQ2YBxOC7Yo/view?usp=drive_link"
    sha256: "95e53002f83ab955df29d3b464ca7d08357193fe26a976c3e9198edf02530fbb"
  - platform: "PC"
    provider: "Google Drive"
    variant: "Apenas o Arquivo de Bugfix v1.0.1"
    format: "txt"
    version: "1.0.1"
    gameversion: "Steam"
    region: "GLOBAL"
    completion: "100%"
    release: "08/08/2025"
    url: "https://drive.google.com/file/d/1XOhP1eV6EbjluQxVgZWFUSpSJYpLGhRZ/view?usp=drive_link"
    sha256: "4b1b13a83df378b9945ed2e6383085b4ea21a813462178fa433f5b2deb01f9ce"
  - platform: "Android"
    provider: "Google Drive"
    format: "APK"
    version: "2.0"
    gameversion: "Full Voice"
    region: "Japan"
    completion: "100%"
    release: "07/08/2025"
    url: "https://drive.google.com/file/d/1GcBl2RpfvtyV_auCx_DiTKNoTxfLx7q5/view"
    sha256: "e47d7d7854d7d7574c50435129c09bf08abf12b466ee747da32e8e12000b310a"
resource:
  - name: "Post de Anúncio"
    provider: "Site"
    url: "https://taiyakiclub.wordpress.com/2025/02/01/clannad-no-android-e-na-steam/"
  - name: "Post de Lançamento"
    provider: "Site"
    url: "https://taiyakiclub.wordpress.com/2025/08/07/patch-de-traducao-para-clannad-da-steam-lancado/"
  - name: "Site"
    provider: "Site"
    url: "https://taiyakiclub.wordpress.com/clannad-android-steam/"
install:
  - platform: "PC"
    tutorial: generic_installer
  - platform: "Android"
    tutorial: 
      - "Baixe o jogo no seu celular. A única versão compatível para o Android é a versão \"Full Voice\" lançada em 2008!"
      - "Após baixar o jogo, baixe e extraia o patch de tradução da Zero Force dentro do seu jogo. Aceite substituir tudo."
      - "Extraia o arquivo .rar do patch."
      - "Instale o \"rlvm.apk\" fornecido na pasta do jogo, ele é o emulador do RealLive, a engine de CLANNAD."
      - "Depois de instalar o Rlvm, abra o aplicativo e clique em \"Ok\" quando aparecer a tela com o Gamedata marcado. Depois disso, feche o aplicativo."
      - "Execute o Rlvm denovo e selecione a pasta do seu jogo, onde estão todos os arquivos e dê \"OK\". Agora é só jogar e se divertir!"
license:
  - "Uso Comercial: Proibido"
progress:
  - label: "Gráficos"
    value: "100%"
  - label: "Port"
    value: "100%"
screenshots:
  - "image.webp"
  - "20250805193336_1.webp"
  - "20250805193600_1.webp"
  - "20250805193528_1.webp"
  - "20250805193734_1.webp"
---

Port da tradução de **Zero Force Translations**, com permissão deles.

Para conseguir exibir todos os acentos corretamente, tivemos que fazer uma fonte especial para o jogo, que é a TaiyakiDejaVu. Nosso instalador instala a fonte automaticamente para você, mas em caso de erro, você pode instalá-la manualmente pela pasta do jogo. Certifique-se de selecioná-la dentro do jogo para poder exibir os acentos corretamente.

Em algumas partes do jogo (na página de Save ou da Dangopedia), vocês verão alguns caracteres bugados, que infelizmente, não possuem correção, mas que não afetam a gameplay de vocês.

Infelizmente, na produção do patch, a função de conquistas e da Dangopedia ficam bugadas e não conseguimos fazê-las funcionar junto com a tradução, então elas ficaram bugadas. Porém, fizemos um Dangopedia especial fora do jogo. Você pode encontrá-lo na pasta do seu jogo pós-instalação. Ao ver um termo “colorido”, basta abrir a pasta Dangopedia e clicar no executável para saber mais sobre a palavra ou expressão.

O nosso patch de tradução inutiliza jogos salvos anteriormente por outras versões do jogo. Infelizmente, se você já tinha uma bateria de jogos salvos  anteriormente, estes serão inutilizados para a nossa nova versão traduzida, fazendo o carregamento destes resultar no travamento do jogo. Não tem outra solução pra isso: vai ter que começar tudo de novo.

No entanto, se ainda assim ele não carregar seus novos jogos salvos, pode ser que o arquivo de salvamento esteja corrompido, seja por estar aberto em outro programa ou por salvamento incorreto/abrupto. No máximo, você pode tentar desinstalar o jogo (sem apagar os jogos salvos) e instalá-lo novamente (aplicando a tradução, posteriormente), ou então executar o jogo em modo de compatibilidade, para tentar carregar o jogo, mas esses métodos são apenas em último caso.