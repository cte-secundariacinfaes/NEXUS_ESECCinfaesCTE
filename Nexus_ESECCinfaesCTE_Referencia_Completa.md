# Nexus ESECCinfãesCTE — Referência Completa do Projeto

**Versão:** 3.6  
**Data:** junho 2026  
**Autor:** Avelino A. Colaço  
**Escola:** ES/3 Prof. Dr. Flávio F. Pinto Resende — Cinfães  
**Curso:** Profissional de Técnico de Eletrónica, Automação e Computadores (EAC)  
**Repositório:** `https://cte-secundariacinfaes.github.io/NEXUS_ESECCinfaesCTE/`

---

# PARTE I — PLATAFORMA DE AVALIAÇÃO E PRESENÇAS

## 1. Arquitetura

```
index.html (login gateway)
  │
  ├→ Mestre (Code_Mestre.gs + Sheets Mestre)
  │   ├─ Folha "Utilizadores" (12 colunas)
  │   ├─ Folha "Turmas" (4 colunas)
  │   └─ Folha "Log Acessos"
  │
  ├→ Professor.html → 📡 Publicar → Google Sheets turma (Code.gs)
  ├→ Aluno.html → auto-config from session → Google Sheets turma
  └→ ESP32 RFID terminal → Mestre → rfidPresenca → turma Sheets

Ferramentas (100% offline):
  ├→ Perfboard Designer (Perfboard.html) — React 18
  ├→ Esquemas de Ligação (Esquemas.html) — React 18
  └→ Manuais dedicados (3 manuais + 1 guia)
```

## 2. Ficheiros do Sistema

| Ficheiro | Tamanho | Descrição | Deploy |
|---|---|---|---|
| `index.html` | 27K | Gateway login + painel ferramentas | GitHub Pages |
| `Nexus_ESECCinfaesCTE_Professor.html` | 449K | Área professor completa | GitHub Pages |
| `Nexus_ESECCinfaesCTE_Aluno.html` | 413K | Área aluno completa | GitHub Pages |
| `Nexus_ESECCinfaesCTE_Code.gs` | 47K | Apps Script turma (25 actions) | Apps Script turma |
| `Nexus_ESECCinfaesCTE_Code_Mestre.gs` | 19K | Apps Script mestre (11 actions) | Apps Script mestre |
| `Nexus_ESECCinfaesCTE_Migracao_v36.gs` | 6K | Script migração one-shot (correr 1x após v3.6) | Apps Script turma |
| `Nexus_ESECCinfaesCTE_ESP32_RFID.html` | 39K | Guia terminal RFID | GitHub Pages |
| `Nexus_ESECCinfaesCTE_Perfboard.html` | 123K | Perfboard Designer v2.4 | GitHub Pages |
| `Nexus_ESECCinfaesCTE_Esquemas.html` | 109K | Esquemas de Ligação v1.2 | GitHub Pages |
| `Nexus_ESECCinfaesCTE_Manual.html` | 76K | Manual principal (30 secções) | GitHub Pages |
| `Nexus_ESECCinfaesCTE_Manual_Perfboard.html` | 34K | Manual Perfboard (13 secções) | GitHub Pages |
| `Nexus_ESECCinfaesCTE_Manual_Esquemas.html` | 45K | Manual Esquemas (16 secções) | GitHub Pages |
| `Nexus_ESECCinfaesCTE_Guia_Perfboard.html` | 40K | Guia montagem física (12 secções) | GitHub Pages |
| `README.md` | 17K | Documentação repositório | GitHub |
| `perfboard-designer.jsx` | 91K | Fonte JSX Perfboard (~1321 linhas) | Repositório |
| `schematic-designer.jsx` | 84K | Fonte JSX Esquemas (~1143 linhas) | Repositório |

---

## 3. Módulos da Plataforma

### 3.1 Login Centralizado (Opção C)
- Sheets Mestre com folha "Utilizadores" (12 colunas)
- Sessão 7 dias em localStorage
- Aluno faz login → Mestre valida → devolve sheetsUrl → redirect auto-configurado
- `HARDCODED_MESTRE_URL` no index.html
- URL do Mestre persistido em localStorage no login
- Painel `?config` para configuração avançada
- Acesso direto (fallback) **removido** — login obrigatório
- "Esqueci a senha" no login: instruções diferenciadas para aluno e professor

### 3.2 Segurança (4 Níveis)
1. **Token secreto** `nexus_eac_2026_token` — em 6 ficheiros
2. **Sheets privado** — Partilhar → Restrito
3. **Rate limit** — 5 tentativas / 15min no login
4. **Role filter** — ALUNO_ACTIONS whitelist + `_requesterTipo`

### 3.3 Senhas (3 → 2)
- **👨‍🏫 Professor** — acesso total
- **🎓 Alunos** — apenas ver resultados dos pares
- `unlockAdmin()` desbloqueia 3 session keys em simultâneo
- Recuperação via modal admin (repõe para ID de login)
- Professor pode alterar senha de aluno via 🔑

### 3.4 Tomada de Conhecimento
- Estado por UFCD: `inativa` / `conhecimento` / `autoav` / `ambas`
- Links Google Drive por UFCD
- Critérios expansíveis + links clicáveis + checkbox + **assinatura digital táctil**
- Registo no Sheets: folha "Tomada Conhecimento" (9 colunas)

### 3.5 Autoavaliação
- Campo Nº UFCD separado → tab `AA_UFCD{nº}`
- Coluna "Justificações" — textarea opcional por característica (máx. 500 chars)
- **Resubmissão atualiza linha existente** (chave: Nome + Nº UFCD + Ano/Turma)
- Flag "já submetida" por UFCD (`Nome|sheetName`), não global
- Botão desativa durante envio + AbortController 25s + toast erro
- Export/Import critérios: só vetores (sem ID/disciplina/ano)
- "Guardar Rascunho" removido

### 3.6 Horário Semanal
- Horário flexível: qualquer hora/duração
- Gerar sessões automáticas (detecta duplicados)
- Export/import `.horario.json`
- Auto-publish ao toggle sessão (para RFID)

### 3.7 Gestão de Utilizadores
- Painel "👥 Utilizadores (Sheets Mestre)"
- Adicionar individual + lote (📋) + toggle + remover + 🔑 alterar senha
- "📥 Importar do Mestre" em Aulas e Presenças

### 3.8 Turmas no Mestre
- Folha "Turmas" (Turma, SheetsURL, AnoLetivo, CriadoEm)
- Login resolve URL pela turma → fallback user row
- Sincronização via 📡 no Professor
- URL manual oculto em "⚙️ Configuração Avançada"

### 3.9 Terminal ESP32 RFID
- ESP32 + RC522 + OLED SH1106 + Buzzer + LEDs (~12€)
- `TERMINAL_MODE` ("aula"/"estagio") + `TERMINAL_NAME`
- Modo "aula": lê sessão aberta, calcula pontualidade
- Modo "estagio": registo direto

---

## 4. Decisões Técnicas da Plataforma

### 4.1 HTML Standalone
- CSS+JS inline, zero dependências (exceto Google Fonts DM Sans)
- Comunicação via `fetch()` + `POST` JSON
- Estado local em `localStorage` (turma-prefixed via `getTurmaPrefix()`)

### 4.2 Rebuild Aluno
- Derivado do Professor com secções admin removidas
- 79+ null-guards + 21 emoji fixes + `node --check`

### 4.3 getURL() Flow
```
1. ls(KEY_URL)                              ← turma-prefixed
2. localStorage('nexus_session_sheets_url')  ← do login no index
3. getNexusSession().sheetsUrl               ← do objeto de sessão
4. getActiveTurma().sheetsUrl                ← da config de turma
5. HARDCODED_URL                             ← fallback
```

### 4.4 Login Flow (dispositivo novo)
```
index.html → HARDCODED_MESTRE_URL → fetch(login)
  → Mestre valida → devolve {sheetsUrl, nome, turma, códigos}
  → localStorage stores: nexus_session_sheets_url, nexus_session, nexus_mestre_url
  → redirect Aluno.html ou Professor.html
  → getURL() encontra URL → funciona sem pedir nada
```

---

## 5. Actions — Code.gs (25 Turma) + Code_Mestre.gs (11 Mestre)

### Code.gs — 25 Actions
| Action | Whitelist Aluno |
|---|---|
| vote, membervote | ✅ |
| profvote, profsummary | ❌ |
| draw, summary, clearvotes | ❌ |
| ping | ✅ |
| getvotes, getprofvotes | ❌ |
| autoavsubmit | ✅ |
| getautoav, listautoavsheets, clearautoav, deleteautoavsheet | ❌ |
| presencaregisto, getpresencas | ✅ |
| aularegisto, getaulasregistos | ✅ |
| aulafeedback, presencafeedback | ✅ |
| saveconfig | ❌ |
| getconfig | ✅ |
| rfidaularegisto | ❌ |
| tomaconhecimento | ✅ |

### Code_Mestre.gs — 11 Actions
login, ping, getusers, adduser, updateuser, removeuser, rfidlookup, rfidpresenca, getturmas, saveturma, removeturma

---

## 6. Sheets Mestre — Estrutura

### Folha "Utilizadores" (12 colunas)
| Col | Campo | Notas |
|---|---|---|
| A | Tipo | `prof` / `aluno` |
| B | ID | Nº aluno ou identificador |
| C | Nome | Nome completo |
| D | Password | Hash `h_xxxxx` ou texto claro (auto-convert) |
| E | Turma | Deve coincidir exatamente com folha Turmas |
| F | Sheets URL | Fallback se Turmas vazia |
| G | Código Estágio | 4 dígitos |
| H | Código Aulas | 4 dígitos |
| I | Pwd Aulas | Password aulas |
| J | Ativo | `Sim` / `Não` |
| K | UID RFID | Ex: `A3B2C1D4` |
| L | Criado Em | Timestamp |

### Folha "Turmas" (4 colunas)
Turma | SheetsURL | Ano Letivo | Criado Em

---

# PARTE II — FERRAMENTAS TÉCNICAS

## 7. Stack Técnico (Perfboard + Esquemas)

- **React 18** (CDN) + **Babel CLI** (precompilação JSX → JS)
- **Storage:** localStorage com auto-save 60s
- **Pipeline:** `JSX → sed (strip imports) → Babel → JS → HTML wrapper`
- **Padrões:** Modal top-level, keyboard ignora inputs, useCallback/useMemo, History (40 snapshots + redo), changedTouches, URL.revokeObjectURL

## 8. Perfboard Designer v2.4

**12 ferramentas:** Fio, Resistência, Condensador, LED, Díodo, Jumper, Barramento, CI/IC, Header, Etiqueta, Biblioteca, Borracha

**7 placas:** Perfboards 2×8/3×7/4×6/5×7/7×9 cm + Breadboards Half/Full + Criador custom

**15 componentes biblioteca:** DIP-8/14/16/28, Arduino Nano/UNO, ESP32 DevKit, Relé, 7805, Potenciómetro, Cristal, Botão 4pin, OLED I2C, SIP-6/8 + Criador custom

**Funcionalidades chave:** Dual frente+verso (espelhado), nets automáticas (Union-Find O(1)), alertas conflito, barramentos VCC/GND/SIG, drag-and-drop com bounds check, undo/redo (40 passos), impressão A4 (SVG + tabela + BOM), export SVG/PNG/JSON

## 9. Esquemas de Ligação v1.2

**10 MCUs:** Arduino Nano/UNO/Mega, ESP32/ESP8266, STM32, ATtiny85, RPi Pico, PLC, FPGA

**23 componentes:** DHT22, HC-SR04, BME280, MPU-6050, MAX30102, PN532, OLED I2C, LCD I2C, Relé, Servo, Motor DC, A4988, Buzzer, LED RGB, Teclado 4×4, NRF24L01, HC-05, SD Card, Fonte, 7805, Botão, Potenciómetro

**Funcionalidades chave:** 2 modos visualização (linhas Bezier / tags), propriedades cabo (AWG/cor/comprimento/tensão/corrente), validação segurança (corrente > capacidade, queda tensão), recomendações automáticas (pull-ups, flyback, alimentação separada), painel avisos, drag-and-drop, editor pinos, export/import JSON, impressão A4 landscape (SVG + tabela + BOM + avisos)

---

# PARTE III — UNIFORMIDADE E ESTILO

## 10. Uniformidade Estética

| Elemento | Padrão |
|---|---|
| Fonte | DM Sans (Google Fonts) |
| Código | JetBrains Mono |
| Cores | :root com --navy, --accent, --card, --muted, --border, --bg |
| Footer | Escola + autor em todos (exceto index) |
| Print CSS | @media print em todos |
| Manuais | Hero gradient + TOC grid + sec-num + print + footer |
| Index | Painéis colapsáveis uniformes (tools-btn-icon/text/arrow) |

---

# PARTE IV — HISTÓRICO

## 11. Bugs Corrigidos

### v3.4 (10 bugs)
1. unlockAdmin() recursão infinita → sessionStorage.setItem direto
2. _requesterTipo vs tipo → campo separado
3. Template literal escapado no QR → removido `\$`
4. tomaconhecimento não em ALUNO_ACTIONS → adicionado
5. ufcd não no appendRow → adicionado
6. SH_TURMAS not defined → constante adicionada
7. const em vez de var no Mestre → convertido
8. getURL() não lia session URL → verifica nexus_session_sheets_url
9. Mestre não enviava token à turma → adicionado token: API_TOKEN
10. Sessão aula não publicada → auto-publish ao toggle

### v3.6 (auditoria completa — 13 correções críticas)
1. **Bug `tipo` overwrite cross-file** — postToSheet sobrescrevia `payload.tipo` (entrada/saida/pausa) com 'aluno'/'prof'. Coluna "Tipo" das presenças corrompida. Fix: cliente envia `_requesterTipo`, servidor faz role check em `_requesterTipo`, `payload.tipo` fica disponível para os handlers (Code.gs L114, Professor postToSheet, Aluno postToSheet)
2. **Rate limit do login quebrado** — `appendRow` do log no Mestre tinha ordem trocada vs HDR_LOG; `checkRateLimit` lia row[4] como "Ação" mas estava lá `result.msg`. Fix: reordenar appendRow para coincidir com HDR_LOG
3. **Lock timeout 12s → 30s** em ambos os Apps Script (Referência v3.5 só foi aplicada parcialmente)
4. **`handleListAutoAvSheets` duplicada** — segunda definição sobrepunha a primeira com schema errado. Eliminada a duplicada
5. **Resubmissão autoavaliação duplicava** — `handleAutoAvSubmit` fazia `appendRow` sempre. Fix: update in-place por chave Nome + Nº UFCD + Ano/Turma
6. **CSS utilitário órfão** — classes `.text-center`, `.mt-*`, `.confirm-overlay`, `.confirm-box` indevidamente coladas em 4 templates de impressão (Professor x3, Aluno x3). Removido
7. **Funções duplicadas no Aluno** — `showSheetsSetup` e `setupConnect` definidas 2 vezes. Eliminada a primeira (mais incompleta)
8. **AbortController 25s** — adicionado a `postToSheet` e `_mestrePost` em Professor e Aluno (v3.5 fix #4 finalmente aplicado)
9. **OLED chip — "SSH1106" → "SH1106"** — chip "SSH1106" não existe (typo histórico). Corrigido em ESP32_RFID.html (8 sítios) e na Referência
10. **`TERMINAL_ID` dead code** — definido no firmware mas nunca enviado no JSON. Removido
11. **Modos de Operação ambíguos** — adicionada secção em ESP32_RFID.html a distinguir `currentMode` (Entrada/Saída/Registo, botão BOOT) de `TERMINAL_MODE` (aula/estagio, compile-time)
12. **Flag por UFCD usa `Nome|sheetName`** — não `Nome|disciplina` (v3.5 fix #8 finalmente alinhado)
13. **`hashPwd` SHA-256 dead code** — função async definida mas nunca usada (apenas `hashPwdSync` djb2 é usada). Removida em Professor e Aluno
14. **Outras melhorias agrupadas**:
    - `doGet` do Mestre anuncia agora as 11 actions (faltavam 3 de turmas)
    - `handleGetUsers` do Mestre comparação de turma case-insensitive
    - `String()` cast em `d.pwd.startsWith` (defensivo)
    - `nAluno` incluído nos retornos de `handleGetPresencas` e `handleGetAulasRegistos`
    - `<div>` footer → `<footer>` semântico em Professor, Aluno, ESP32_RFID
    - `index.html`: `@media print`, labels com `for=`, mini `escHtml()`, removido `href="#"`
    - `submitAutoAv` do Aluno: `finally` para reativar botão
    - `catch` do Code.gs usa `msg:` (consistente, em vez de `error:`)
    - `SH_AUTOAV` órfã removida do Code.gs

**Script de migração one-shot** (`Nexus_ESECCinfaesCTE_Migracao_v36.gs`) fornecido para corrigir dados antigos onde a coluna "Tipo" foi gravada com "aluno"/"prof".

### v3.5 (8 bugs)
1. Lock timeout 12s → 30s (concorrência)
2. Resubmissão duplicava → update in-place (chave: Nome + UFCD + Ano)
3. Botão submeter não desativava → disabled + finally
4. "A enviar..." eternamente → AbortController 25s + toast
5. "Guardar Rascunho" confuso → removido
6. Import alterava disciplina original → export só vetores
7. Sem campo justificação → textarea opcional + coluna "Justificações"
8. Uma submissão bloqueava todas → flag por UFCD (Nome|sheetName)

### Ferramentas — Perfboard (30+ bugs corrigidos)
Keyboard handler, drag holes cleanup, coord() >26 linhas, breadboard min 6, BOM custom, header bounds, IC pinos impressão, touchEnd changedTouches, URL.revokeObjectURL, modal top-level, save/export v3 format, dual view scale, rail vertical, confirmação limpar/mudar placa, nets O(1)

### Ferramentas — Esquemas (8 bugs corrigidos)
Drag undo só se moveu, touch+pinch zoom, pan não desseleciona, viewBox ResizeObserver, bloqueia fios duplicados, pinsR vazio, rename getScreenCTM, grid adaptativo

---

## 12. Pendentes / Futuro

### Ferramentas — Alta prioridade
1. Vista pinagem frontal/traseira em componentes do Esquemas
2. Exportar Esquema → Perfboard (bridge entre ferramentas)

### Ferramentas — Média prioridade
3. Zoom centrado no cursor (Perfboard)
4. BOM agrupado por label na impressão (Perfboard)
5. Atalhos numéricos para trocar ferramenta (Perfboard)

### Plataforma
_(nenhum bug pendente no momento — v3.6 fechou todos os críticos detectados pela auditoria)_

### Fora de scope (decisão consciente)
- **Coluna "Justificações" na autoavaliação** — mencionada nas v3.5 fix #7 mas nunca foi codificada. Decidido em v3.6 manter fora de scope (adicionar implicaria mudanças em Code.gs + Professor + Aluno UI). Se um dia for necessária, pode ser implementada incrementalmente.
- **Limpeza profunda do Aluno.html** — funções e markup admin existem mas estão atrás de placeholders vazios e proteção por password. Removê-los implicaria desviar o Aluno do Professor (mais difícil de manter sincronizado). v3.6 mantém o clone fiel.

---

# PARTE V — DEPLOY

## 13. Checklist de Deploy

### Sheets Mestre
1. ☐ Sheets criado com folha "Utilizadores" (12 colunas)
2. ☐ Professor adicionado (tipo=prof, password texto claro)
3. ☐ Code_Mestre.gs instalado (506 linhas, var)
4. ☐ Implementado como App da Web (Eu, Qualquer pessoa)
5. ☐ URL no `HARDCODED_MESTRE_URL` do index.html

### Sheets Turma (por turma)
1. ☐ Sheets criado
2. ☐ Code.gs instalado (1191 linhas)
3. ☐ Implementado como App da Web
4. ☐ URL registado + 📡 sincronizado com Mestre

### GitHub Pages
1. ☐ Repositório público com todos os ficheiros
2. ☐ Settings → Pages → main / root
3. ☐ Testar login aluno + professor

### Apps Script — Atualizar
⚠️ **Gerir implementações → ✏️ → Nova versão → Implementar** (nunca criar nova implementação — muda o URL)

## 14. URLs de Produção

| Recurso | URL |
|---|---|
| GitHub Pages | `https://cte-secundariacinfaes.github.io/NEXUS_ESECCinfaesCTE/` |
| Sheets Mestre | `https://script.google.com/macros/s/AKfycbyKY7oHWdkkkmrPElA9zXQRjF9NRGETWZioDt_pV0WkYi0jfjf2fva4Ta0fwEz26Nx4/exec` |

---

*Documento de referência v3.5 — maio 2026*
