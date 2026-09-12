# Patcheados

O **Patcheados** é um projeto dedicado a catalogar e preservar traduções brasileiras feitas por fãs para jogos. Este projeto é mantido pela comunidade e todos são bem-vindos para contribuir.

Todo esse projeto é fortemente inspirado no [FGI](https://github.com/FurryGamesIndex/games).

O HTML e o CSS foram feitos inteiramente por mim. Todo o código em TypeScript foi feito por inteligência artificial e é de baixa qualidade. Se alguém quiser refazer esse código do zero, eu ficaria extremamente agradecido.

---

## Contribuição

- Para pedir a adição ou alteração de um jogo, patch, autor ou círculo, abra uma issue [aqui](https://github.com/Heruzinyo/Patcheados/issues/new/choose).
- Para adicionar ou alterar conteúdo por conta própria, consulte o guia na [wiki](https://github.com/heruzinyo/Patcheados/wiki).

---

## Versões

### v2.0
- Reescrita completa do projeto em Astro, com pesquisa via SQL.
- Sistema de pesquisa simplificado.
- Reestruturação dos diretórios do projeto.
- Nova interface, com mais identidade visual.
- URLs fixas para patches (substituindo o uso de query strings).
- Créditos adicionados na página de Círculos.
- Ícones para os jogos.
- Nova aba de Destaques.
- Diversas adições, remoções e alterações nos arquivos Markdown.

### v1.0
- Lançamento inicial, feito com Hugo e Pagefind.

---

## Planejado

- [ ] Refazer logo do site.
- [ ] Reescrever o TypeScript sem usar IA.
- [ ] (Considerado) Idiomas para autores.
- [ ] (Considerado) Adicionar notas de atualização.
- [ ] (Considerado) Manter versões antigas.
- [ ] (Considerado) Suporte a variações do português.
- [ ] (Considerado) Página de recrutamento para projetos.
- [ ] (Considerado) Analytics simples sem invadir a privacidade do usuário.
- [ ] (Considerado) Preservar patches no Internet Archive (com permissão dos criadores).
- [ ] (Considerado) Instaladores locais para patches (Exemplo: aplicador de xdelta).
- [ ] (Considerado) API JSON dos patches para serviços externos.

---

## Rodar Localmente


Clone o repositório:

```bash
git clone https://github.com/Heruzinyo/Patcheados
cd Patcheados
```

(Ou, se preferir não usar git, baixe o código diretamente pelo GitHub.)

Esse projeto requer **Node.js 24 ou superior**. Recomendo usar o [fnm](https://github.com/schniz/fnm) para instalar e gerenciar a versão correta (ou qualquer outro método de sua preferência):

> **Nix/NixOS:** se você usa Nix, pode rodar `nix develop` para entrar automaticamente em um ambiente com a versão correta do Node, e ir direto para `npm install`.

```bash
fnm install
fnm use
```

Instale as dependências:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O site estará disponível em `http://localhost:4321` (porta padrão do Astro).

Para gerar a versão de produção:

```bash
npm run build
```

Para pré-visualizar a build de produção localmente:

```bash
npm run preview
```

---

## Licença

As informações deste site estão licenciadas sob a licença [CC-BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-br).

O código-fonte está licenciado sob a [GPLv3](https://www.gnu.org/licenses/gpl-3.0.html).

Conteúdos relacionados a jogos e patches (como imagens, capturas de tela, nomes e arquivos distribuídos) pertencem aos seus respectivos criadores e autores originais. Esses materiais são utilizados apenas para fins informativos, de documentação e divulgação, sem qualquer finalidade comercial. Caso algum autor ou responsável pelo conteúdo se sinta prejudicado, o material poderá ser removido mediante solicitação.
