# 🏫 Nexus ESECCinfãesCTE

**Sistema de avaliação, presenças e ferramentas técnicas** para o Curso Profissional de Eletrónica, Automação e Computadores (EAC) da ES/3 Prof. Dr. Flávio F. Pinto Resende.

Desenvolvido por **Avelino A. Colaço** — Diretor de Curso EAC.

---

## Visão Geral

O Nexus é uma plataforma web que funciona inteiramente no browser — sem instalação, sem servidor, sem base de dados. Os dados são armazenados no Google Sheets via Apps Script. O acesso é feito via login centralizado no `index.html`, que autentica contra um Sheets Mestre e redireciona automaticamente para a área do Professor ou do Aluno.

```
index.html (login)
  │
  ├→ Sheets Mestre (Code_Mestre.gs) — utilizadores, turmas, autenticação
  │
  ├→ Professor.html → 📡 Publicar → Sheets Turma (Code.gs)
  ├→ Aluno.html → auto-config → Sheets Turma
  └→ ESP32 RFID → Mestre → Sheets Turma

Ferramentas (100% offline):
  ├→ Perfboard Designer
  ├→ Esquemas de Ligação
  └→ Manuais dedicados
```

---

## Funcionalidades

### 🔑 Login Centralizado
- Autenticação contra Sheets Mestre com sessão de 7 dias
- URL da turma resolvido automaticamente (folha "Turmas")
- Gestão de utilizadores pelo professor (adicionar, lote, toggle, alterar senha)
- Recuperação de senha para alunos e professores

### 🔒 Segurança (4 Níveis)
- Token secreto em todos os pedidos
- Sheets privado (Partilhar → Restrito)
- Rate limit no login (5 tentativas / 15 min)
- Filtro por tipo de utilizador (whitelist de ações para alunos)

### 🗳️ Avaliação de Pares
- Grupos com membros, critérios dinâmicos (1–5★ → 0–20 valores)
- Avaliação individual por membro do grupo
- Comentários anónimos, ranking automático
- Sorteio de ordem de apresentação

### 📋 Tomada de Conhecimento
- Estado por UFCD: inativa / conhecimento / autoavaliação / ambas
- Links Google Drive para planificações e documentos por UFCD
- Critérios de avaliação expansíveis
- Assinatura digital táctil (dedo no telemóvel, rato no PC)
- Registo no Sheets com timestamp e assinatura

### ✍️ Autoavaliação Multi-UFCD
- Campo Nº UFCD separado — tab nomeado `AA_UFCD{nº}`
- Vetores configuráveis com pesos e características
- Justificação opcional por característica
- Resubmissão atualiza linha existente (não duplica)
- Flag de submissão por UFCD (independente)
- Export/import de critérios em JSON (só vetores, sem ID)
- Timeout 25s com feedback claro

### 📍 Presenças de Estágio (GPS)
- Locais com coordenadas GPS e raio configurável
- Verificação automática de posição (Haversine)
- Pontualidade automática com tolerâncias
- Pausas com cronómetro, feedback diário
- Relatórios por aluno com impressão e CSV

### 📝 Aulas Práticas
- Sessões com disciplina, módulo, sumário, horário e tolerâncias
- QR code por sessão ativa (projetável na sala)
- Dashboard em tempo real (auto-refresh 30s)
- Terminal ESP32 RFID para marcação por cartão

### 📅 Horário Semanal
- Definir horário flexível (qualquer hora/duração)
- Gerar sessões automáticas para a semana
- Exportar/importar como `.horario.json`

### 🏫 Gestão de Turmas
- Múltiplas turmas com localStorage isolado
- Folha "Turmas" no Sheets Mestre (URL por turma)
- Sincronização via botão 📡
- Importar/exportar backups por turma

### 📡 Terminal ESP32 RFID
- ESP32 + RC522 + OLED + Buzzer + LEDs (~12€)
- Modo "aula" (sessão aberta, pontualidade) e "estagio" (direto)
- Guia completo de montagem e firmware

### ⊞ Perfboard Designer
- Projetar ligações em placas PCB pré-perfuradas e breadboards
- 12 ferramentas, 15+ componentes na biblioteca, criador custom
- Vista frente + verso, nets automáticas, alertas de conflito
- Impressão A4 com tabela de ligações e BOM
- 100% offline

### 🔌 Esquemas de Ligação
- Diagramas de cablagem com pinagem MCU ↔ sensores
- 10 MCUs e 23 componentes na biblioteca, criador custom
- Propriedades do cabo (AWG, cor, comprimento, corrente)
- Validação de segurança e recomendações automáticas
- Impressão A4 landscape com tabela, BOM e avisos
- 100% offline

---

## Ficheiros

| Ficheiro | Descrição | Tamanho |
|---|---|---|
| `index.html` | Gateway de login + painel ferramentas | 27K |
| `Nexus_ESECCinfaesCTE_Professor.html` | Área do professor completa | 455K |
| `Nexus_ESECCinfaesCTE_Aluno.html` | Área dos alunos completa | 425K |
| `Nexus_ESECCinfaesCTE_Code.gs` | Apps Script turma (25 ações) | 51K |
| `Nexus_ESECCinfaesCTE_Code_Mestre.gs` | Apps Script mestre (11 ações) | 17K |
| `Nexus_ESECCinfaesCTE_Perfboard.html` | Perfboard Designer v2.4 | 123K |
| `Nexus_ESECCinfaesCTE_Esquemas.html` | Esquemas de Ligação v1.2 | 109K |
| `Nexus_ESECCinfaesCTE_ESP32_RFID.html` | Guia terminal RFID | 43K |
| `Nexus_ESECCinfaesCTE_Manual.html` | Manual principal (30 secções) | 46K |
| `Nexus_ESECCinfaesCTE_Manual_Perfboard.html` | Manual Perfboard (13 secções) | 34K |
| `Nexus_ESECCinfaesCTE_Manual_Esquemas.html` | Manual Esquemas (16 secções) | 45K |
| `Nexus_ESECCinfaesCTE_Guia_Perfboard.html` | Guia montagem física (12 secções) | 40K |
| `README.md` | Este ficheiro | — |

---

## Instalação

### 1. GitHub Pages

1. Cria um repositório **público** no GitHub
2. Faz upload de todos os ficheiros HTML + README
3. **Settings → Pages → main / root → Save**
4. URL: `https://teuuser.github.io/nome-repo/`

### 2. Sheets Mestre

1. Cria um Google Sheets ("Nexus Mestre")
2. Cria folha "Utilizadores" com 12 colunas: Tipo, ID, Nome, Password, Turma, Sheets URL, Código Estágio, Código Aulas, Pwd Aulas, Ativo, UID RFID, Criado Em
3. Adiciona o professor (tipo=prof, password em texto claro — converte automaticamente)
4. **Extensões → Apps Script** → cola `Code_Mestre.gs` → **Implementar** (App da Web, Eu, Qualquer pessoa)
5. Copia o URL → edita `HARDCODED_MESTRE_URL` no `index.html`

### 3. Sheets Turma (por turma)

1. Cria um Google Sheets ("Nexus 2ºB EAC")
2. **Extensões → Apps Script** → cola `Code.gs` → **Implementar**
3. No Professor → ⚙️ Configuração Avançada → cola URL → Guardar
4. Clica **📡** na turma para sincronizar com o Mestre

### 4. Adicionar alunos

No Professor → ⚙️ Gerir → 👥 Utilizadores → 📋 Adicionar em Lote:
```
nº ; nome
nº ; nome
```
Password = nº do aluno (pode alterar depois).

### 5. Distribuir aos alunos

Partilha o **link do index.html**. Os alunos fazem login com nº + password — tudo auto-configurado.

### 6. Terminal ESP32 RFID (opcional)

Ver guia completo em `Nexus_ESECCinfaesCTE_ESP32_RFID.html`.

---

## Arquitetura

```
┌─────────────┐                      ┌──────────────────┐
│  index.html  │ ── login ─────────→ │  Code_Mestre.gs  │
│  (gateway)   │ ←── session ─────── │  (Sheets Mestre) │
└──────┬───────┘                      └────────┬─────────┘
       │ redirect                              │ resolve URL
       ▼                                       ▼
┌─────────────┐     POST (JSON)      ┌──────────────────┐
│  Professor   │ ──────────────────→  │  Code.gs         │
│  .html       │ ←────────────────── │  (Sheets Turma)  │
└─────────────┘     JSON response     └────────┬─────────┘
                                               │
┌─────────────┐     POST (JSON)                │ read/write
│  Aluno       │ ──────────────────→           │
│  .html       │ ←──────────────────  ┌────────▼─────────┐
└─────────────┘     JSON response     │  Google Sheets    │
                                      │  (13+ folhas)     │
┌─────────────┐                       └──────────────────┘
│  ESP32 RFID  │ ── POST → Mestre → Code.gs turma
└─────────────┘

┌─────────────┐
│  Perfboard   │  (100% offline — localStorage)
│  Esquemas    │
└─────────────┘
```

### Folhas do Sheets Mestre

| Folha | Conteúdo |
|---|---|
| Utilizadores | 12 colunas: tipo, id, nome, password, turma, sheetsUrl, códigos, ativo, RFID |
| Turmas | Turma → SheetsURL → Ano Letivo |
| Log Acessos | Timestamp, ação, resultado |

### Folhas do Sheets Turma

| Folha | Criada por | Conteúdo |
|---|---|---|
| Configuração | Professor (📡 Publicar) | JSON config completa |
| Votos | Alunos | Avaliações de pares |
| Votos Individuais | Alunos | Avaliação por membro |
| Avaliação Professor | Professor | Notas do professor |
| Resumo Pares / Professor | Professor | Rankings |
| Sorteio | Professor | Ordem de apresentação |
| AA_UFCD{nº} | Alunos | Autoavaliação por UFCD |
| Tomada Conhecimento | Alunos | Assinaturas digitais |
| Presenças Estágio | Alunos | Entrada/saída com GPS |
| Presenças Aulas | Alunos | Presença com pontualidade |
| Feedback Estágio | Alunos | Descrição e avaliação diária |
| Registo | Sistema | Log interno |

---

## Senhas

| Senha | Quem | Acede a |
|---|---|---|
| **Login (index)** | Aluno: nº + password · Professor: id + password | Autenticação central |
| **👨‍🏫 Professor** | Só o professor | ⚙️ Gerir, 🎲 Sorteio, 📋 Avaliação, 📊 Resultados |
| **🎓 Alunos** | Alunos | Apenas 📊 Resultados dos pares |

- Passwords armazenadas como hash djb2 (auto-convert texto claro → hash no primeiro login)
- Professor pode alterar senha de aluno via 🔑 na tabela de utilizadores
- "Esqueci a senha" disponível no login e no modal admin

---

## Atualizar o sistema

### Ficheiros HTML
Upload no repositório GitHub → commit → esperar 1–2 min.

### Apps Script
**Gerir implementações → ✏️ → Nova versão → Implementar** (não criar nova implementação — muda o URL).

### Atualização v3.5 → v3.6 (migração de dados)
Após reimplementar `Code.gs` e atualizar `Professor.html` + `Aluno.html`, há uma migração one-shot para corrigir registos de presença antigos onde a coluna "Tipo" ficou gravada com `"aluno"`/`"prof"` em vez de `entrada`/`saida`/`pausa_inicio`/`pausa_fim`:

1. Abre o Sheets da turma → **Extensões → Apps Script**
2. Cria um ficheiro novo (File → +) chamado `Migracao_v36.gs`
3. Cola o conteúdo de `Nexus_ESECCinfaesCTE_Migracao_v36.gs`
4. **Faz backup do Sheets** (Ficheiro → Fazer uma cópia)
5. Executa `contarPresencasCorrompidas` para ver quantas linhas precisam de fix
6. Executa `migrarTipoPresencas` **UMA VEZ**
7. Apaga o ficheiro `Migracao_v36.gs` para evitar correr novamente

⚠️ **Importante:** os ficheiros `Code.gs`, `Professor.html` e `Aluno.html` da v3.6 devem ser implementados em conjunto — os contratos cruzados usam `_requesterTipo` (cliente envia, servidor lê). Implementar só um lado quebra a autenticação dos alunos.

---

## Resolução de Problemas

| Problema | Solução |
|---|---|
| GitHub Pages 404 | Settings → Pages → main / root |
| "Ação desconhecida" | Reimplementar: Gerir implementações → Nova versão |
| Aluno não carrega config | Professor deve 📡 Publicar primeiro |
| "Sistema não configurado" | Verificar HARDCODED_MESTRE_URL no index.html |
| Aluno pede URL manualmente | Verificar folha "Turmas" no Mestre (nome exato) |
| Login dá erro | Verificar Code_Mestre.gs reimplementado (versão com var, não const) |
| "App não verificada" | Avançado → Ir para (nome do projeto) |
| Dados desaparecem | ⚙️ Gerir → 📥 Importar do Sheets |

---

## Licença

Projeto desenvolvido para uso interno da ES/3 Prof. Dr. Flávio F. Pinto Resende — Curso Profissional EAC.

---

<p align="center">
  <strong>Nexus ESECCinfãesCTE v3.6</strong><br>
  ES/3 Prof. Dr. Flávio F. Pinto Resende · Curso EAC<br>
  Desenvolvido por Avelino A. Colaço
</p>
