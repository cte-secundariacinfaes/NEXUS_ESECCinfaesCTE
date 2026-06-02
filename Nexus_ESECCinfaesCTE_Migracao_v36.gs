// ═══════════════════════════════════════════════════════════════════════════
// Nexus ESECCinfãesCTE — SCRIPT DE MIGRAÇÃO ONE-SHOT
// ═══════════════════════════════════════════════════════════════════════════
//
// PORQUÊ?
//   Antes da v3.6, o cliente (Professor.html / Aluno.html) chamava postToSheet()
//   com payload.tipo = 'aluno' ou 'prof' (papel do utilizador). Esse mesmo campo
//   "tipo" era também usado para distinguir entrada/saida/pausa_inicio/pausa_fim
//   nos registos de presença. Resultado: a coluna "Tipo" das folhas:
//     - "Presenças Estágio"
//     - "Presenças Aulas"
//   ficou gravada com "aluno"/"prof" em vez do verdadeiro tipo de operação.
//
// O QUE FAZ?
//   Para cada linha cuja coluna "Tipo" tenha "aluno" ou "prof":
//     - Em "Presenças Estágio" (HDR col D = índice 3, Hora na col L = índice 11):
//         * 1ª linha do dia para esse aluno → "entrada"
//         * Última linha do dia para esse aluno → "saida"
//         * Linhas intermédias com localNome a começar por "⏸" → "pausa_inicio"
//         * Linhas intermédias com localNome a começar por "▶" → "pausa_fim"
//     - Em "Presenças Aulas": os tipos "aluno"/"prof" são apagados (esta folha não
//       usa 'tipo' diretamente, mas o cliente envia-o por engano. Limpar é seguro.)
//
// COMO USAR?
//   1. Abre o Sheets da TURMA → Extensões → Apps Script
//   2. Cria um NOVO ficheiro (File → +) chamado "Migracao_v36.gs"
//   3. Cola este código completo
//   4. Seleciona a função "migrarTipoPresencas" no dropdown e clica ▶ Executar
//   5. Vê o log (Executions / Logs) para confirmar quantas linhas foram corrigidas
//   6. Apaga este ficheiro depois de correr (não voltar a executar)
//
// IMPORTANTE:
//   - Faz BACKUP do Sheets antes de correr! (Ficheiro → Fazer uma cópia)
//   - Esta script só deve ser executada UMA VEZ por turma
//   - Após v3.6 instalado, registos novos já ficam corretos automaticamente
//
// ═══════════════════════════════════════════════════════════════════════════

function migrarTipoPresencas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];

  // ── 1. Presenças Estágio ─────────────────────────────────────────
  log.push("=== Presenças Estágio ===");
  var shEst = ss.getSheetByName("Presenças Estágio");
  if (!shEst || shEst.getLastRow() < 2) {
    log.push("(folha vazia ou inexistente, ignorada)");
  } else {
    var data = shEst.getDataRange().getValues();
    // HDR: Timestamp, Aluno ID, Nome Aluno, Tipo, Lat, Lng, Acc, Dist, Raio, Local, NoEstagio, Hora, Data, Atraso, Pont, NºAluno
    //      0          1         2          3     4    5    6    7     8     9      10         11    12    13      14    15

    // Agrupar por (alunoId + data) e ordenar por timestamp
    var groups = {};  // key = "alunoId|data" → array of {rowNum, ts, tipo, localNome}
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var alunoId = String(row[1] || "").trim();
      var dataStr = String(row[12] || "").trim();
      var tipoVal = String(row[3] || "").trim().toLowerCase();
      var localNome = String(row[9] || "");
      if (!alunoId || !dataStr) continue;
      // Só linhas com tipo corrompido (aluno/prof)
      if (tipoVal !== "aluno" && tipoVal !== "prof") continue;
      var key = alunoId + "|" + dataStr;
      if (!groups[key]) groups[key] = [];
      groups[key].push({
        rowNum: r + 1,
        ts: row[0] ? new Date(row[0]).getTime() : 0,
        localNome: localNome
      });
    }

    var fixed = 0;
    Object.keys(groups).forEach(function(key) {
      var rows = groups[key].sort(function(a, b) { return a.ts - b.ts; });
      // Heurística:
      //   - localNome a começar por "⏸" → pausa_inicio
      //   - localNome a começar por "▶" → pausa_fim
      //   - Caso contrário: primeira não-pausa = entrada; última não-pausa = saida; restantes (raro) = entrada
      var realCount = 0;
      var nonPauseIndices = [];
      rows.forEach(function(r, i) {
        if (r.localNome.indexOf("⏸") === 0) {
          shEst.getRange(r.rowNum, 4).setValue("pausa_inicio");
          fixed++;
        } else if (r.localNome.indexOf("▶") === 0) {
          shEst.getRange(r.rowNum, 4).setValue("pausa_fim");
          fixed++;
        } else {
          nonPauseIndices.push(i);
        }
      });
      // entrada / saida
      if (nonPauseIndices.length === 1) {
        // Só uma linha "real" — assumir entrada
        shEst.getRange(rows[nonPauseIndices[0]].rowNum, 4).setValue("entrada");
        fixed++;
      } else if (nonPauseIndices.length >= 2) {
        // primeira = entrada, última = saida, intermédias = entrada (fallback)
        shEst.getRange(rows[nonPauseIndices[0]].rowNum, 4).setValue("entrada");
        fixed++;
        shEst.getRange(rows[nonPauseIndices[nonPauseIndices.length - 1]].rowNum, 4).setValue("saida");
        fixed++;
        for (var k = 1; k < nonPauseIndices.length - 1; k++) {
          shEst.getRange(rows[nonPauseIndices[k]].rowNum, 4).setValue("entrada");
          fixed++;
        }
      }
    });
    log.push("Linhas corrigidas em Presenças Estágio: " + fixed);
    log.push("Grupos (alunoId+data) processados: " + Object.keys(groups).length);
  }

  // ── 2. Presenças Aulas ─────────────────────────────────────────
  log.push("\n=== Presenças Aulas ===");
  var shAul = ss.getSheetByName("Presenças Aulas");
  if (!shAul || shAul.getLastRow() < 2) {
    log.push("(folha vazia ou inexistente, ignorada)");
  } else {
    // Esta folha tem coluna "Estado" (índice 10), NÃO "Tipo".
    // O bug não a afeta — mas se houver linhas com "aluno"/"prof" em Estado, limpar.
    var dataA = shAul.getDataRange().getValues();
    var fixedA = 0;
    for (var r = 1; r < dataA.length; r++) {
      var estado = String(dataA[r][10] || "").trim().toLowerCase();
      if (estado === "aluno" || estado === "prof") {
        // Não temos info para reconstruir → marcar como "Presente" (caso típico)
        shAul.getRange(r + 1, 11).setValue("Presente");
        fixedA++;
      }
    }
    log.push("Linhas corrigidas em Presenças Aulas: " + fixedA);
  }

  // ── 3. Resumo ─────────────────────────────────────────
  log.push("\n=== CONCLUÍDO ===");
  log.push("Recorda: após v3.6 instalado, registos novos já gravam corretamente.");
  log.push("Apaga este ficheiro de migração para não correr novamente.");

  Logger.log(log.join("\n"));
  return log.join("\n");
}

// Função utilitária: ver quantas linhas estão corrompidas (sem fazer alterações)
function contarPresencasCorrompidas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var total = 0;
  ["Presenças Estágio", "Presenças Aulas"].forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    var data = sh.getDataRange().getValues();
    var col = (name === "Presenças Estágio") ? 3 : 10;  // Tipo / Estado
    var n = 0;
    for (var r = 1; r < data.length; r++) {
      var v = String(data[r][col] || "").trim().toLowerCase();
      if (v === "aluno" || v === "prof") n++;
    }
    Logger.log(name + ": " + n + " linhas corrompidas");
    total += n;
  });
  Logger.log("TOTAL: " + total);
  return total;
}
