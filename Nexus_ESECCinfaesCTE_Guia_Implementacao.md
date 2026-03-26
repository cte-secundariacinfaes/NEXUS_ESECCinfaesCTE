# Nexus ESECCinfãesCTE — Guia de Implementação e Teste

## Pré-requisitos

- Conta Google (Gmail)
- Conta GitHub (gratuita)
- Os 7 ficheiros do sistema descarregados
- Browser moderno (Chrome/Edge/Firefox)

---

## PARTE 1 — IMPLEMENTAÇÃO

### Passo 1: Criar o Google Sheets MESTRE (Utilizadores)

1. Abre [sheets.google.com](https://sheets.google.com) → **+ Criar** novo Sheets
2. Renomeia para: `Nexus Mestre — EAC`
3. Renomeia a folha (tab em baixo) para: `Utilizadores`
4. Na linha 1, escreve os cabeçalhos (um por coluna, A1 até L1):

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Tipo | ID | Nome | Password (hash) | Turma | Sheets URL | Código Estágio | Código Aulas | Pwd Aulas | Ativo | UID RFID | Criado Em |

5. Formata a linha 1: negrito, fundo azul escuro (#1B3A6B), texto branco
6. Congela a linha 1: **Ver → Fixar → 1 linha**
7. **Partilhar → Acesso geral → Restrito** (apenas tu) — Nível 2 de segurança

### Passo 2: Instalar o Apps Script MESTRE

1. No Sheets Mestre: **Extensões → Apps Script**
2. Apaga todo o código existente (o `function myFunction(){}`)
3. Cola o conteúdo completo de `Nexus_ESECCinfaesCTE_Code_Mestre.gs`
4. Clica **💾** para guardar
5. **Implementar → Nova implementação**
   - Tipo: **Aplicação Web**
   - Descrição: `Mestre v1`
   - Executar como: **Eu (o teu email)**
   - Quem tem acesso: **Qualquer pessoa**
6. Clica **Implementar**
7. Na primeira vez, pede autorização:
   - Clica **Autorizar acesso**
   - Seleciona a tua conta Google
   - Ecrã "App não verificada" → clica **Avançado** → **Ir para Nexus Mestre (não seguro)**
   - Clica **Permitir**
8. **Copia o URL** que aparece (ex: `https://script.google.com/macros/s/AKfyc.../exec`)
9. Guarda este URL — é o **URL do Mestre**

### Passo 3: Criar o Google Sheets da TURMA (Dados)

1. Cria outro Google Sheets novo → renomeia para: `Nexus 3ºB EAC 2025-26`
2. Não precisas de criar folhas — são criadas automaticamente
3. **Partilhar → Restrito** (apenas tu)

### Passo 4: Instalar o Apps Script da TURMA

1. No Sheets da turma: **Extensões → Apps Script**
2. Apaga o código existente
3. Cola o conteúdo de `Nexus_ESECCinfaesCTE_Code.gs`
4. **💾** Guardar
5. **Implementar → Nova implementação** (mesmo processo do Passo 2)
6. Autoriza (mesmo ecrã "não verificada")
7. **Copia o URL** — é o **URL da Turma**

### Passo 5: Configurar o Token de Segurança

O token predefinido é `nexus_eac_2026_token`. **Recomendo que o mudes** antes de publicar.

1. Abre cada um dos 5 ficheiros num editor de texto (Notepad++, VS Code, etc.)
2. Faz **Ctrl+H** (Find & Replace):
   - Procurar: `nexus_eac_2026_token`
   - Substituir por: (a tua string secreta, ex: `flavio_eac_s3cr3t0_2026`)
3. Aplica em:
   - `index.html`
   - `Nexus_ESECCinfaesCTE_Professor.html`
   - `Nexus_ESECCinfaesCTE_Aluno.html`
   - `Nexus_ESECCinfaesCTE_Code.gs` (já instalado — ver nota)
   - `Nexus_ESECCinfaesCTE_Code_Mestre.gs` (já instalado — ver nota)

**Nota para os .gs já instalados:** abre o Apps Script de cada Sheets, procura `API_TOKEN`, muda a string, guarda, e faz nova implementação (apagar antiga + nova).

### Passo 6: Configurar o URL do Mestre no index.html

1. Abre `index.html` num editor de texto
2. Procura a linha:
   ```javascript
   var HARDCODED_MESTRE_URL = '';
   ```
3. Substitui por:
   ```javascript
   var HARDCODED_MESTRE_URL = 'https://script.google.com/macros/s/AKfyc.../exec';
   ```
   (cola o URL do Mestre que copiaste no Passo 2)

### Passo 7: Adicionar Utilizadores ao Sheets Mestre

No Google Sheets Mestre, folha "Utilizadores", adiciona:

**Professor (linha 2):**

| Tipo | ID | Nome | Password (hash) | Turma | Sheets URL | Código Estágio | Código Aulas | Pwd Aulas | Ativo | UID RFID | Criado Em |
|---|---|---|---|---|---|---|---|---|---|---|---|
| prof | avelino | Avelino A. Colaço | _(ver abaixo)_ | 3.ºB EAC | _(URL da turma)_ | | | | Sim | | 2026-03-26 |

**Alunos de teste (linhas 3+):**

| Tipo | ID | Nome | Password (hash) | Turma | Sheets URL | Código Estágio | Código Aulas | Pwd Aulas | Ativo | UID RFID | Criado Em |
|---|---|---|---|---|---|---|---|---|---|---|---|
| aluno | 12045 | David Cardoso | _(ver abaixo)_ | 3.ºB EAC | _(URL da turma)_ | 1001 | 1001 | abc | Sim | | 2026-03-26 |
| aluno | 12046 | Gonçalo Silvestre | _(ver abaixo)_ | 3.ºB EAC | _(URL da turma)_ | 1002 | 1002 | def | Sim | | 2026-03-26 |

**Como gerar o hash da password:**
- Opção A: Escreve a password em texto claro (ex: `aluno123`). O sistema faz hash automaticamente no primeiro login.
- Opção B: Abre o index.html no browser → F12 → Console → escreve `hashPwd('aluno123')` → copia o resultado (ex: `h_1a2b3c`) → cola na coluna D.

### Passo 8: Publicar no GitHub Pages

1. Vai a [github.com](https://github.com) → **New repository**
2. Nome: `nexus-v2` (ou o que preferires)
3. Visibilidade: **Public**
4. Clica **Create repository**
5. Clica **uploading an existing file**
6. Arrasta os 8 ficheiros:
   - `index.html`
   - `Nexus_ESECCinfaesCTE_Professor.html`
   - `Nexus_ESECCinfaesCTE_Aluno.html`
   - `Nexus_ESECCinfaesCTE_Manual.html`
   - `Nexus_ESECCinfaesCTE_Code.gs`
   - `Nexus_ESECCinfaesCTE_Code_Mestre.gs`
   - `README.md`
   - `Nexus_ESECCinfaesCTE_Perfboard.html` (se tiveres)
7. **Commit changes**
8. Vai a **Settings → Pages**
9. Source: **Deploy from a branch**
10. Branch: **main**, Folder: **/ (root)**
11. Clica **Save**
12. Aguarda 1–2 minutos — o URL fica em: `https://teuuser.github.io/nexus-v2/`

---

## PARTE 2 — TESTE (Professor)

### Teste 1: Login como Professor

1. Abre `https://teuuser.github.io/nexus-v2/`
2. Clica no tab **👨‍🏫 Professor**
3. ID: `avelino` | Password: (a que definiste)
4. Clica **🔑 Entrar como Professor**

**Esperado:** ecrã de boas-vindas com avatar "A", nome, "👨‍🏫 Professor · 3.ºB EAC", cards "Área do Professor" e "Ver como Aluno".

5. Clica **Área do Professor** → abre Professor.html

**Verificar:** subtítulo mostra `Avelino A. Colaço (avelino) · 3.ºB EAC`

### Teste 2: Configurar Turma

1. Clica **＋** (ao lado do seletor de turma)
2. Nome: `3.ºB EAC` | Ano: `2025/26` | URL: (cola o URL da turma)
3. Clica **➕ Criar Turma**

**Esperado:** toast "🔄 Turma: 3.ºB EAC", seletor mostra a turma.

### Teste 3: Configurar Pares

1. Dropdown → **⚙️ Gerir** (pede senha — usa a senha admin: default `eac2025` ou a que definiste)
2. Na card "Configuração de Pares", clica **⚙️ Configurar**
3. Adiciona 2 grupos com 2 membros cada
4. Verifica critérios (5 por defeito)
5. Configura a sessão (turma, tipo, data)

**Esperado:** grupos aparecem na lista, critérios visíveis.

### Teste 4: Configurar Autoavaliação

1. Ainda em Gerir → ✍️ Autoavaliação → **⚙️ Configurar**
2. Preenche: Disciplina `EE 6017`, Ano `3.ºB`, Ano Letivo `25 / 26`
3. Configura 3 vetores com pesos (ex: 40%, 30%, 30%)
4. Preenche as 4 características de cada vetor
5. Clica **💾 Guardar Disciplina**

**Esperado:** disciplina aparece na lista "📚 Disciplinas Configuradas" com ✏️ e 🗑️.

6. Clica **＋ Adicionar Disciplina** → repete para `TA 6034`
7. Verifica que ambas aparecem na lista

### Teste 5: Configurar Presenças de Estágio

1. Gerir → 📍 Presenças → **📍 Gerir Presenças**
2. Adiciona 2 alunos com códigos (ex: 1001, 1002)
3. Adiciona 1 local com coordenadas GPS e raio (ex: 100m)
4. Configura horário (entrada 09:00, saída 17:30)

**Esperado:** alunos e local aparecem nas listas.

### Teste 6: Configurar Aulas Práticas

1. Gerir → 📝 Aulas → **📝 Gerir Aulas**
2. Adiciona 2 alunos com código + senha individual
3. Cria 1 sessão: disciplina, módulo, data, hora, duração
4. Abre a sessão (botão ▶)

**Esperado:** sessão ativa com badge roxo no topbar.

### Teste 7: Publicar

1. Volta a **⚙️ Gerir**
2. Clica **📡 Publicar**

**Esperado:** toast "📡 Configuração publicada!", banner azul "Publicado agora mesmo".

3. Verifica no Google Sheets da turma: folha "Configuração" criada com JSON na célula A4.

### Teste 8: Testar QR de Sessão

1. Vai a **📝 Aulas** → encontra a sessão aberta
2. Clica **📲 QR**

**Esperado:** modal com QR code, nome da disciplina, horário, sumário.

### Teste 9: Relatórios

1. Vai a **📍 Presenças** → separador **Relatórios**

**Esperado:** tabela vazia (ainda sem registos), mas a interface funciona.

### Teste 10: Importar do Sheets

1. Vai a **⚙️ Gerir** → **📥 Importar do Sheets**

**Esperado:** toast com os módulos recuperados (grupos, autoav, presenças, etc.)

---

## PARTE 3 — TESTE (Aluno)

### Teste 11: Login como Aluno

1. Abre outro browser (ou modo incógnito): `https://teuuser.github.io/nexus-v2/`
2. Tab **🎓 Aluno** (já selecionado por defeito)
3. Nº Aluno: `12045` | Password: (a que definiste)
4. Clica **🔑 Entrar como Aluno**

**Esperado:** ecrã de boas-vindas com avatar "D", "David Cardoso", "🎓 Nº 12045 · 3.ºB EAC", card "Entrar" e "Perfboard".

5. Clica **Entrar** → abre Aluno.html

**Verificar:**
- Subtítulo mostra `David Cardoso (12045) · ...`
- Dropdown já em **🏠 Início**
- Welcome mostra cards com disciplinas disponíveis

### Teste 12: Avaliação de Pares

1. Clica **🗳️ Pares** (ou seleciona no dropdown)
2. Seleciona um grupo
3. Avalia cada critério (1–5 estrelas) para cada membro
4. Escreve um comentário
5. Clica **✓ Submeter**

**Esperado:** toast de sucesso.

6. **Verificar no Sheets da turma:** folha "Votos" tem o registo + coluna "Nº Aluno" com `12045`.

### Teste 13: Autoavaliação

1. Clica **✍️ Autoavaliação**

**Esperado:** se há 2+ disciplinas, mostra cards de seleção. Se 1, vai direto ao formulário.

2. Seleciona uma disciplina (ex: EE 6017)

**Verificar:** nome pré-preenchido como "David Cardoso" (do login).

3. Avalia todas as características (5 estrelas cada)
4. Escreve um comentário (opcional)
5. Clica **✅ Submeter Autoavaliação**

**Esperado:** ecrã de sucesso com 3 botões: 🔄 Repetir, 📚 Outra disciplina, 🏠 Início.

6. Clica **📚 Fazer outra disciplina** → volta às cards
7. A disciplina submetida mostra ✅

**Verificar no Sheets:** folha `AA_EE6017` tem o registo + coluna "Nº Aluno" + coluna "Comentário".

### Teste 14: Presenças de Estágio

1. Clica **📍 Presenças Estágio**

**Esperado:** se o login central tem código de estágio, entra automaticamente (sem pedir código).

2. Clica **▶ Marcar Entrada**
3. O browser pede permissão de localização → **Permitir**
4. Se estiveres dentro do raio do local → ✅ No estágio
5. Testa **⏸ Pausa** → cronómetro inicia
6. Testa **💬 Feedback** → descrição + avaliação 0–10
7. Clica **⏹ Marcar Saída**

**Verificar no Sheets:** folha "Presenças Estágio" tem entradas/saídas + "Nº Aluno".

### Teste 15: Presenças em Aulas

1. Clica **📝 Aulas Práticas**

**Esperado:** se o login central tem código de aulas, entra automaticamente.

2. Vê a sessão ativa (se o professor a abriu)
3. Clica **✋ Marcar Presença**
4. Testa **⏸ Pausa** e **💬 Feedback**

**Verificar no Sheets:** folha "Presenças Aulas" tem o registo + "Nº Aluno".

### Teste 16: Sessão Expirada

1. No browser do aluno, abre a consola (F12 → Console)
2. Escreve:
   ```javascript
   localStorage.removeItem('nexus_session');
   ```
3. Recarrega a página (F5)

**Esperado:** volta ao ecrã de login no index.html (sessão limpa).

### Teste 17: Rate Limit

1. No login, tenta 6 vezes com password errada para o mesmo nº aluno

**Esperado:** na 6ª tentativa: "Demasiadas tentativas. Espera 15 minutos."

### Teste 18: Acesso Direto (Fallback)

1. Clica **"Acesso direto (sem login centralizado) →"** no index.html
2. Clica **Aluno**

**Esperado:** abre o Aluno.html normalmente, pede URL do Sheets manualmente. Tudo funciona como antes.

### Teste 19: Segurança — Ação Bloqueada

1. No browser do aluno (com sessão ativa), abre a consola
2. Escreve:
   ```javascript
   postToSheet({action:'clearVotes'}).then(r=>console.log(r));
   ```

**Esperado:** resposta `{ok:false, msg:"Ação não permitida para alunos."}`.

### Teste 20: Offline

1. No telemóvel, ativa modo avião
2. Abre o Aluno.html (se já estava carregado)

**Esperado:** banner vermelho "📵 Sem ligação à internet..." no topo. A interface continua funcional com dados locais.

3. Desativa modo avião → banner desaparece automaticamente.

---

## PARTE 4 — VERIFICAÇÃO FINAL

### Checklist do Sheets Mestre

| Folha | Conteúdo esperado |
|---|---|
| Utilizadores | Linhas com professor + alunos, passwords hashed |
| Log Acessos | Registos de login (timestamp, ID, ação) |

### Checklist do Sheets da Turma

| Folha | Quando é criada |
|---|---|
| Configuração | Ao clicar 📡 Publicar |
| Votos | Ao submeter primeiro voto |
| Votos Individuais | Ao submeter primeiro voto individual |
| AA_EE6017 | Ao submeter primeira autoavaliação dessa disciplina |
| Presenças Estágio | Ao marcar primeira presença |
| Feedback Estágio | Ao submeter primeiro feedback |
| Presenças Aulas | Ao marcar primeira presença em aula |
| Registo | Ao primeiro pedido (log interno) |

### Colunas "Nº Aluno"

Verifica que as seguintes folhas têm a coluna **"Nº Aluno"** como última coluna:
- Votos ✓
- AA_* ✓
- Presenças Estágio ✓
- Presenças Aulas ✓

---

## RESOLUÇÃO DE PROBLEMAS

| Problema | Causa | Solução |
|---|---|---|
| "Acesso negado" em todos os pedidos | Token diferente entre ficheiros | Verifica que o token é idêntico nos 5 ficheiros |
| "App não verificada" no Google | Normal na primeira autorização | Avançado → Ir para (nome do projeto) |
| Login falha com password correta | Password guardada como texto, não como hash | Regenera: `hashPwd('password')` na consola |
| Aluno não vê disciplinas | Professor não publicou | Professor: ⚙️ Gerir → 📡 Publicar |
| Sheets não cria folhas | Implementação antiga cacheada | Apagar implementação → Nova implementação |
| GitHub Pages 404 | Pages não ativado | Settings → Pages → main / root |
| "Demasiadas tentativas" | Rate limit (5/15min) | Esperar 15 minutos ou limpar linhas no Log Acessos |
| Aluno vê "Sistema não configurado" | HARDCODED_MESTRE_URL vazio | Editar index.html com o URL do Mestre |

---

## NOTAS IMPORTANTES

1. **Reimplementar Apps Script:** Ao alterar o Code.gs ou Code_Mestre.gs, tens de APAGAR a implementação antiga e criar uma NOVA. Editar a existente não funciona (cache do Google).

2. **Token secreto:** O token é público no código-fonte do HTML. É uma camada extra de proteção, não uma defesa total. A proteção principal é o Sheets estar privado (Nível 2).

3. **Sessão de 7 dias:** Os alunos fazem login uma vez por semana. Se perderem o telemóvel, a sessão expira automaticamente. Para forçar logout, desativa o aluno no Sheets Mestre (coluna "Ativo" → "Não").

4. **Retrocompatibilidade:** O link "Acesso direto →" no index.html mantém o sistema antigo funcional. Alunos com bookmarks diretos para Aluno.html continuam a funcionar.
