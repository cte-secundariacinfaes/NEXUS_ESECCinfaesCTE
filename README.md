# 🏫 Nexus ESECCinfãesCTE

**Sistema de avaliação, autoavaliação e controlo de presenças** para o Curso Profissional de Eletrónica, Automação e Computadores (EAC) da ES/3 Prof. Dr. Flávio F. Pinto Resende.

Desenvolvido por **Avelino A. Colaço** — Diretor de Curso EAC.

---

## Visão Geral

O Nexus é uma plataforma web que funciona inteiramente no browser — sem instalação, sem servidor, sem base de dados. Os dados são armazenados no Google Sheets via Apps Script. O sistema é composto por dois ficheiros HTML independentes (Professor e Aluno) que comunicam através de um Google Sheets partilhado.

```
Professor.html  ──📡 Publicar──→  Google Sheets (folha "Configuração")
                                        ↑  ↓
Aluno.html      ──🔄 Carregar───→  Google Sheets (lê config + escreve dados)
```

---

## Funcionalidades

### 🗳️ Avaliação de Pares
- Grupos com membros, critérios dinâmicos (1–5★ → 0–20 valores)
- Avaliação individual por membro do grupo
- Comentários anónimos
- Ranking automático com médias ponderadas
- Sorteio de ordem de apresentação

### ✍️ Autoavaliação Multi-Disciplina
- Múltiplas disciplinas/UFCDs em simultâneo na mesma turma
- Vetores configuráveis com pesos e 4 características cada
- Aluno escolhe qual disciplina preencher
- Badges ✅/⬜ mostram progresso por dispositivo
- Ecrã de sucesso pós-submissão com opções: repetir, outra disciplina, ou início

### 📍 Presenças de Estágio (GPS)
- Até 20 alunos com código de acesso individual
- Locais com coordenadas GPS e raio configurável
- Verificação automática de posição via Haversine
- Horário global e por local (entrada/saída, tolerâncias)
- Pontualidade automática: ✅ Presente / ⚠️ Falta de pontualidade / ❌ Falta
- Pausas (almoço, lanche, intervalo) com cronómetro, subtraídas das horas
- Feedback diário (descrição + avaliação 0–10)
- Relatórios por aluno com impressão e CSV

### 📝 Presenças em Aulas Práticas
- Sessões de aula com disciplina, módulo, sumário, horário e tolerâncias
- Alunos com código + palavra-passe individual
- Marcação automática de pontualidade
- Pausas e feedback por sessão
- QR code por sessão ativa (projetável na sala)
- Dashboard em tempo real (auto-refresh 30s)
- Relatórios filtrável por aluno/disciplina

### 🏫 Gestão Multi-Turma
- Múltiplas turmas no mesmo browser (localStorage isolado por prefixo)
- Cada turma com o seu Google Sheets independente
- Alternância instantânea via dropdown
- Importar/exportar backups por turma
- Recuperação total via 📥 Importar do Sheets

### ⊞ Perfboard Designer
- Projetar ligações em placas PCB pré-perfuradas (5 tamanhos ELEGOO) e breadboards (half/full)
- 10 ferramentas: fio, resistência, condensador, LED, díodo, CI, header, jumper, etiqueta, biblioteca
- Biblioteca com 15+ componentes pré-definidos (DIP-8/14/16/28, Arduino Nano, ESP32, módulo relé, etc.)
- Criador de componentes personalizados (nome, tamanho, pinos, cor)
- Ferramenta Borracha (⌫) — apagar componentes e limpar furos órfãos com um clique
- Limpeza automática de furos ao apagar componentes (Delete, ✕, Borracha)
- Deteção automática de nets e alertas de conflito (curto-circuito)
- Vista frente + verso (lado do cobre espelhado)
- Drag-and-drop e edição inline de etiquetas
- Imagem de fundo (overlay de esquema elétrico)
- Guardar no browser (localStorage) ou como ficheiro `.perfboard.json`
- Imprimir esquema A4 com tabela de ligações, BOM e espaço para notas
- 100% offline — não precisa de Google Sheets


### 🔑 Login Centralizado

- Autenticação via Google Sheets Mestre (nº aluno + password)
- Sessão de 7 dias no browser (localStorage)
- Auto-configuração do Sheets URL, nome, e códigos de acesso
- Nº de aluno incluído em todos os registos (votos, autoavaliação, presenças)
- Fallback para acesso direto sem login (retrocompatível)
- Preparado para terminais RFID (ESP32 + leitor de cartões)

---

## Ficheiros

| Ficheiro | Descrição | Tamanho |
|----------|-----------|---------|
| `index.html` | Landing page com links para Professor, Aluno e Perfboard | 9K |
| `Nexus_ESECCinfaesCTE_Professor.html` | Área do professor — gestão, configuração, relatórios | 390K |
| `Nexus_ESECCinfaesCTE_Aluno.html` | Área dos alunos — votar, autoavaliar, marcar presenças | 366K |
| `Nexus_ESECCinfaesCTE_Perfboard.html` | Perfboard Designer — projetar PCBs e breadboards | 90K |
| `Nexus_ESECCinfaesCTE_Manual.html` | Manual de utilização com sidebar navegável | 40K |
| `Nexus_ESECCinfaesCTE_Code.gs` | Google Apps Script — backend turma (23 ações) | 40K |
| `Nexus_ESECCinfaesCTE_Code_Mestre.gs` | Google Apps Script — backend mestre (8 ações: login, gestão, RFID) | 11K |

---

## Instalação

### 1. GitHub Pages (5 minutos)

1. Cria um repositório **público** no GitHub
2. Faz upload dos 6 ficheiros + este README
3. Vai a **Settings → Pages → Deploy from branch → main / root → Save**
4. Aguarda 1–2 minutos — o URL fica disponível em `https://teuuser.github.io/nexus-eseccinfaescte/`

### 2. Google Sheets (5 minutos)

1. Cria um Google Sheets novo
2. Vai a **Extensões → Apps Script**
3. Apaga o código existente, cola o conteúdo de `Nexus_ESECCinfaesCTE_Code.gs`
4. Clica 💾 para guardar
5. **Implementar → Nova implementação → Aplicação Web**
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
6. Clica **Implementar** e copia o URL gerado

### 3. Ligar ao sistema (2 minutos)

1. Abre o `Professor.html` via GitHub Pages
2. Vai a **⚙️ Gerir → Google Sheets** → cola o URL do Apps Script → **🔌 Testar**
3. Configura turma, alunos, locais, sessões
4. Clica **📡 Publicar**


### 5. Sheets Mestre — Login Centralizado (opcional, 5 minutos)

1. Cria um Google Sheets novo (separado do de turma)
2. Vai a **Extensões → Apps Script** → cola `Nexus_ESECCinfaesCTE_Code_Mestre.gs`
3. **Implementar → Nova implementação → Aplicação Web** (mesmas opções)
4. Na folha "Utilizadores", adiciona os alunos:

| Tipo | ID | Nome | Password (hash) | Turma | Sheets URL | Código Estágio | Código Aulas | Pwd Aulas | Ativo |
|---|---|---|---|---|---|---|---|---|---|
| aluno | 12045 | David Cardoso | h_... | 3.ºB EAC | https://script... | 1234 | 1234 | abc | Sim |
| prof | avelino | Avelino Colaço | h_... | 3.ºB | https://script... | | | | Sim |

5. No `index.html`, edita `HARDCODED_MESTRE_URL = '...'` com o URL do Apps Script
6. Commit — pronto, todos os alunos acedem via nº + password

### 4. Distribuir aos alunos

Cada aluno precisa (uma única vez):
- **Link do Aluno.html** — URL do GitHub Pages
- **URL do Apps Script** — para ligar ao Sheets

O aluno abre o link, cola o URL na primeira vez, e fica guardado permanentemente.

---

## Arquitetura

### Fluxo de dados

```
┌─────────────┐     POST (JSON)      ┌──────────────────┐
│  Professor   │ ──────────────────→  │  Google Apps      │
│  .html       │ ←────────────────── │  Script (Code.gs) │
└─────────────┘     JSON response     └────────┬─────────┘
                                               │
┌─────────────┐     POST (JSON)                │ read/write
│  Aluno       │ ──────────────────→           │
│  .html       │ ←──────────────────  ┌────────▼─────────┐
└─────────────┘     JSON response     │  Google Sheets    │
                                      │  (13+ folhas)     │
┌─────────────┐                       └──────────────────┘
│  Perfboard   │  (100% offline — localStorage apenas)
│  .html       │
└─────────────┘
```

### Armazenamento local

- **localStorage** — configuração, registos locais, autenticação (prefixado por turma via `t_{id}_`)
- **sessionStorage** — autenticação do professor (segura, por sessão)
- **Google Sheets** — dados persistentes (votos, presenças, autoavaliações, configuração publicada)

### Folhas do Google Sheets

| Folha | Criada por | Conteúdo |
|-------|-----------|----------|
| Configuração | Professor (📡 Publicar) | JSON completo — lido pelo Aluno.html |
| Votos | Alunos (Pares) | Avaliações com critérios dinâmicos |
| Votos Individuais | Alunos (Pares) | Avaliação por membro |
| Avaliação Professor | Professor | Notas do professor por grupo |
| Resumo Pares | Professor | Médias calculadas |
| Resumo Professor | Professor | Ranking com pesos |
| Sorteio | Professor | Ordem de apresentação |
| AA_\<DISC\> | Alunos | Um tab por disciplina/UFCD |
| Presenças Estágio | Alunos (GPS) | Entrada/saída com coordenadas e pontualidade |
| Feedback Estágio | Alunos | Descrição e avaliação diária |
| Presenças Aulas | Alunos | Presença com atraso e feedback |
| Registo | Sistema | Log interno de todas as ações |

---

## Utilização

### Professor

| Ação | Como |
|------|------|
| Configurar pares | ⚙️ Gerir → card "Configuração de Pares" |
| Configurar autoavaliação | ⚙️ Gerir → ✍️ Autoavaliação → configurar → 💾 Guardar Disciplina |
| Configurar estágio | ⚙️ Gerir → 📍 Presenças → Alunos + Locais |
| Configurar aulas | ⚙️ Gerir → 📝 Aulas → Alunos + Sessões |
| Publicar para alunos | ⚙️ Gerir → 📡 Publicar |
| Recuperar após limpar cache | ⚙️ Gerir → 📥 Importar do Sheets |
| Nova turma | ⚙️ Gerir → 🔄 Nova Turma |
| Exportar template reutilizável | ⚙️ Gerir → 💾 Exportar Template Completo |
| Ver relatórios | 📍 Presenças / 📝 Aulas → separador Relatórios |

### Aluno

| Ação | Como |
|------|------|
| Avaliar pares | 🗳️ Pares → selecionar grupo → avaliar → submeter |
| Autoavaliar | ✍️ Autoavaliação → escolher disciplina → preencher → submeter |
| Marcar presença estágio | 📍 Presenças → código 4 dígitos → ▶ Entrada / ⏹ Saída |
| Marcar presença aula | 📝 Aulas → código + senha → ✋ Marcar Presença |

---

## Segurança

- **Senhas** — armazenadas como hash djb2 (nunca em texto claro no localStorage ou Sheets)
- **Autenticação professor** — 3 senhas independentes (admin, resultados, professor) com sessão por sessionStorage
- **Autenticação aluno** — código + senha individual com expiração diária
- **Dados** — Google Sheets como backend (acesso controlado pelo Google)
- **Repositório público** — seguro porque os ficheiros HTML são apenas a interface, os dados estão no Sheets

---

## Atualizar o sistema

1. Descarrega os ficheiros atualizados
2. No repositório GitHub: **Add file → Upload files** → arrasta os ficheiros novos
3. **Commit changes** — o GitHub Pages atualiza em 1–2 minutos

### Atualizar o Apps Script

1. Abre o Sheets → **Extensões → Apps Script**
2. Substitui todo o código pelo novo `Code.gs`
3. **Implementar → Gerir implementações → 🗑️ Apagar** a antiga
4. **Implementar → Nova implementação** (mesmo processo da instalação)
5. Cola o **novo URL** no Professor se mudou

> ⚠️ **Importante:** Editar a implementação existente não funciona (cache do Google). Tem de ser sempre **apagar + nova implementação**.

---

## Mudar de turma / Ano letivo

### Opção A — Template reutilizável
1. Exportar: ⚙️ Gerir → 💾 Exportar Template Completo (guarda locais, critérios, horários)
2. Em setembro: abrir Professor → 📂 Importar Template → configurar novos alunos → 📡 Publicar

### Opção B — Reset direto
- **🔄 Nova Turma (mesmo Sheets)** — apaga alunos/dados, mantém estrutura e Sheets
- **🆕 Nova Turma + Novo Sheets** — separação total entre anos letivos

Ambos exportam backup automático antes de apagar.

---

## Funcionalidades técnicas

- **Offline** — banner automático de rede; dados guardados localmente, enviados quando a rede volta
- **Auto-refresh** — configuração do aluno atualiza a cada 5 min; dashboards a cada 30s
- **Cache** — aluno usa cache local com TTL de 5 min (abertura instantânea)
- **Multi-turma** — localStorage isolado por turma via prefixo `t_{id}_`
- **QR por sessão** — cada sessão de aula aberta gera QR projetável
- **Modais estilizados** — ações destrutivas usam modais custom em vez de `confirm()` nativo
- **Acessibilidade** — atributos `aria-label`, `role` nas áreas principais
- **Sanitização** — `escHtml()` em inputs de utilizador no innerHTML
- **Impressão** — relatórios com cabeçalho formal da escola e do professor

---

## Resolução de Problemas

| Problema | Solução |
|----------|---------|
| GitHub Pages 404 | Settings → Pages → main / root |
| "Ação desconhecida" no Sheets | Apagar implementação → Nova implementação |
| Aluno não carrega config | Professor deve 📡 Publicar primeiro |
| "App não verificada" | Avançado → Ir para (nome do projeto) |
| Dados desaparecem após limpar cache | ⚙️ Gerir → 📥 Importar do Sheets |
| GPS sem precisão | Ativar GPS nas definições do telemóvel |
| Sessão de aula não aparece | Verificar que a sessão está "aberta" no Professor |
| Senha não funciona | As senhas default são: `eac2025`, `stats2025`, `prof2025` |

---

## Licença

Projeto desenvolvido para uso interno da ES/3 Prof. Dr. Flávio F. Pinto Resende — Curso Profissional EAC.

---

<p align="center">
  <strong>Nexus ESECCinfãesCTE</strong><br>
  ES/3 Prof. Dr. Flávio F. Pinto Resende · Curso EAC<br>
  Desenvolvido por Avelino A. Colaço
</p>
