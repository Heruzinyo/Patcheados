---
# Indicador de Destaque
featured: # Bool (Opcional | Deve ser aprovado | Padrão = false)
# Lista de Círculos
circles:
  - # Slug (Obrigatório | Mínimo 1 autor ou círculo)
# Lista de Autores
authors:
  - # Slug (Obrigatório | Mínimo 1 autor ou círculo)
# Nome do Patch
title: "" # String (Opcional)
# Tipo de Nome
title_type: # Slug | Internal (Obrigatório caso title seja usado)
# Lista de Distribuidoras
publishers:
  - "" # String (Opcional)
# Lista de Plataformas
platforms:
  - # Slug (Obrigatório)
# Indicador de Lost Source
lost_source: # Bool (Opcional | Padrão = false)
# Indicador de Lost Media
lost_media: # Bool (Opcional | Padrão = false)
# Indicador de Oficial
official: # Bool (Opcional | Padrão = false)
# Indicador de MTL
mtl: # Bool (Opcional | Padrão = false)
# Indicador de Externo
external: # Bool (Opcional | Padrão = false)
# Data de Lançamento
date: # AAAA-MM-DD (Opcional)
# Status do Projeto
status: # Slug | statuses.yaml (Obrigatório)
# Idioma de Origem
origin: # Slug | languages.yaml (Obrigatório)
# Indicador de Legendas
subs: # Slug | coverage.yaml (Obrigatório)
# Indicador de Gráficos
graphics: # Slug | coverage.yaml (Obrigatório)
# Indicador de Dublagem
dub: # Slug | coverage.yaml (Obrigatório)
# Lista de Créditos
credits:
  - author: # Slug (Obrigatório)
    roles:
      - role: # Slug | roles.yaml (Obrigatório)
        characters:
          - "" # String (Opcional)
  - circle: # Slug (Obrigatório)
    roles:
      - role: # Slug | roles.yaml (Obrigatório)
        characters:
          - "" # String (Opcional)
# Lista de Downloads
downloads:
  - platform: # Slug | platforms.yaml (Obrigatório)
    type: # Slug | types.yaml (Opcional)
    provider: "" # String (Obrigatório)
    variant: "" # String (Opcional)
    format: "" # String (Opcional)
    filesize: "" # String (Opcional)
    version: "" # String (Obrigatório)
    gameversion: "" # String (Obrigatório)
    region: # Slug | regions.yaml (Obrigatório)
    status: # Slug | statuses.yaml (Obrigatório)
    completion: # Número Decimal 0 a 100 (Obrigatório)
    date: # AAAA-MM-DD (Obrigatório)
    url: "" # String (Obrigatório)
    sha256: "" # String (Opcional)
    install: # Slug | installs.yaml | remarkHtml (Opcional | Não pode coexistir com install_custom)
    install_custom:
      - "" # String | remarkHtml (Opcional | Não pode coexistir com install)
    archive: # Bool (Opcional | Padrão = false)
# Lista de Recursos
links:
  - label: "" # String (Opcional)
    url: "" # String (Obrigatório caso label seja usado)
# Licença
license: # Slug | licenses.yaml (Opcional | Não pode coexistir com license_custom)
license_custom:
  - "" # String / remarkHtml (Opcional | Não pode coexistir com license)
# Lista de Progresso
progress:
  - label: "" # String (Opcional)
    value: # Número Decimal 0 a 100 (Obrigatório caso label seja usado)
# Lista de Prints
screenshots:
  - "" # String (Opcional)
---

<!-- Descrição (Opcional) -->
