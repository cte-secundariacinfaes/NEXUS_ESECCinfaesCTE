// ═══════════════════════════════════════════════════════════════════════
// Nexus ESECCinfãesCTE — Google Apps Script MESTRE (v1 · Login Centralizado)
// ═══════════════════════════════════════════════════════════════════════
// Este script gere o Sheets Mestre (utilizadores, login, routing).
// Cada turma mantém o seu próprio Sheets + Code.gs para os dados.
// ═══════════════════════════════════════════════════════════════════════

const SH_USERS = "Utilizadores";

// ── Security ─────────────────────────────────────────────────────────
// Change this token to something unique. Must match index.html, Professor.html, Aluno.html.
const API_TOKEN = "nexus_eac_2026_token";
const SH_LOG   = "Log Acessos";

const HDR_USERS = [
  "Tipo","ID","Nome","Password (hash)","Turma","Sheets URL",
  "Código Estágio","Código Aulas","Pwd Aulas","Ativo","UID RFID","Criado Em"
];

const HDR_LOG = ["Timestamp","ID","Tipo","Turma","Ação","Detalhe"];

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────
function timestamp() {
  return Utilities.formatDate(new Date(), "Europe/Lisbon", "yyyy-MM-dd HH:mm:ss");
}

function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreate(ss, name, headers, tabColor) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (headers && headers.length) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers])
        .setFontWeight("bold").setBackground("#1B3A6B").setFontColor("#fff");
      sh.setFrozenRows(1);
    }
    if (tabColor) sh.setTabColor(tabColor);
  }
  return sh;
}

// Simple djb2 hash (must match the JS version)
function hashPwd(pwd) {
  var hash = 5381;
  for (var i = 0; i < pwd.length; i++) {
    hash = ((hash << 5) + hash) + pwd.charCodeAt(i);
    hash = hash & 0xFFFFFFFF; // unsigned 32-bit
  }
  // Convert to base36
  var chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  var n = hash >>> 0; // ensure unsigned
  var s = "";
  while (n > 0) {
    s = chars[n % 36] + s;
    n = Math.floor(n / 36);
  }
  return "h_" + (s || "0");
}

// ─────────────────────────────────────────────────────────────────────
// ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────
function doGet() {
  return jsonResp({
    ok: true,
    msg: "Nexus ESECCinfãesCTE — Mestre v1. Use POST.",
    version: 1,
    actions: ["login", "ping", "getUsers", "addUser", "updateUser", "removeUser",
              "rfidLookup", "rfidPresenca"]
  });
}

function doPost(e) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(12000);
    var payload = JSON.parse(e.postData.contents);
    var action  = String(payload.action || "ping").toLowerCase();
    var logSh   = getOrCreate(ss, SH_LOG, HDR_LOG, "#4C1D95");

    // ── Token validation (ping is always allowed) ──
    if (action !== "ping" && String(payload.token || "") !== API_TOKEN) {
      return jsonResp({ok: false, msg: "Acesso negado — token inválido."});
    }

    // ── Role-based access control ──
    var tipo = String(payload.tipo || "prof").toLowerCase();
    var ALUNO_MESTRE_ACTIONS = ["login","ping"];
    if (tipo === "aluno" && ALUNO_MESTRE_ACTIONS.indexOf(action) < 0) {
      return jsonResp({ok: false, msg: "Ação não permitida para alunos."});
    }

    // ── Rate limit for login (max 5 attempts per ID per 15 min) ──
    if (action === "login") {
      var rlResult = checkRateLimit(logSh, String(payload.id || ""), 5, 15);
      if (!rlResult.ok) return jsonResp(rlResult);
    }

    var result;

    switch(action) {
      case "ping":        result = {ok: true, msg: "Mestre ativo!"}; break;
      case "login":       result = handleLogin(ss, payload);         break;
      case "getusers":    result = handleGetUsers(ss, payload);      break;
      case "adduser":     result = handleAddUser(ss, payload);       break;
      case "updateuser":  result = handleUpdateUser(ss, payload);    break;
      case "removeuser":  result = handleRemoveUser(ss, payload);    break;
      case "rfidlookup":  result = handleRfidLookup(ss, payload);   break;
      case "rfidpresenca":result = handleRfidPresenca(ss, payload);  break;
      default:            result = {ok: false, msg: "Ação desconhecida: " + action};
    }

    // Log the action
    logSh.appendRow([timestamp(), payload.id || payload.uid || "—", action,
                     payload.turma || result.turma || "—", result.msg || "ok",
                     JSON.stringify(payload).substring(0, 200)]);

    return jsonResp(result);
  } catch(err) {
    return jsonResp({ok: false, msg: "Erro: " + err.message});
  } finally {
    lock.releaseLock();
  }
}

// ─────────────────────────────────────────────────────────────────────
// RATE LIMIT
// ─────────────────────────────────────────────────────────────────────
function checkRateLimit(logSh, id, maxAttempts, windowMinutes) {
  if (!id || !logSh || logSh.getLastRow() < 2) return {ok: true};
  var cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
  var data = logSh.getDataRange().getValues();
  var count = 0;
  for (var r = data.length - 1; r >= 1; r--) {
    var row = data[r];
    var ts = new Date(row[0]);
    if (ts < cutoff) break; // logs are chronological, stop early
    if (String(row[1]).trim().toLowerCase() === id.toLowerCase() &&
        String(row[4]).trim() === "login") {
      count++;
    }
  }
  if (count >= maxAttempts) {
    return {ok: false, msg: "Demasiadas tentativas. Espera " + windowMinutes + " minutos."};
  }
  return {ok: true};
}

// ─────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────
function handleLogin(ss, d) {
  var id   = String(d.id || "").trim();
  var pwd  = String(d.pwd || "").trim();
  if (!id || !pwd) return {ok: false, msg: "ID e password obrigatórios."};

  var sh = ss.getSheetByName(SH_USERS);
  if (!sh || sh.getLastRow() < 2) return {ok: false, msg: "Sem utilizadores registados."};

  var data = sh.getDataRange().getValues();
  // Headers: Tipo, ID, Nome, Password(hash), Turma, SheetsURL, CodEst, CodAulas, PwdAulas, Ativo, UID_RFID, CriadoEm
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (String(row[1]).trim().toLowerCase() !== id.toLowerCase()) continue;

    // Check active
    if (String(row[9]).trim().toLowerCase() === "não" || String(row[9]).trim().toLowerCase() === "nao") {
      return {ok: false, msg: "Conta desativada. Contacta o professor."};
    }

    // Check password
    var storedHash = String(row[3]).trim();
    var inputHash  = pwd.startsWith("h_") ? pwd : hashPwd(pwd);
    
    // If stored password is plain text (not hashed), hash it before comparing
    // and auto-convert it in the Sheets for future logins
    if (storedHash && !storedHash.startsWith("h_")) {
      var hashedStored = hashPwd(storedHash);
      // Auto-convert: replace plain text with hash in Sheets
      try { sh.getRange(r + 1, 4).setValue(hashedStored); } catch(e) {}
      storedHash = hashedStored;
    }
    
    if (storedHash !== inputHash) {
      return {ok: false, msg: "Password incorreta."};
    }

    // Success!
    return {
      ok: true,
      msg: "Login OK",
      tipo:           String(row[0]).trim(),       // aluno / prof
      id:             String(row[1]).trim(),        // nº aluno ou username prof
      nome:           String(row[2]).trim(),
      turma:          String(row[4]).trim(),
      sheetsUrl:      String(row[5]).trim(),
      codigoEstagio:  String(row[6]).trim(),
      codigoAulas:    String(row[7]).trim(),
      pwdAulas:       String(row[8]).trim(),
      uidRfid:        String(row[10]).trim()
    };
  }

  return {ok: false, msg: "Utilizador não encontrado."};
}

// ─────────────────────────────────────────────────────────────────────
// USER MANAGEMENT (for Professor interface)
// ─────────────────────────────────────────────────────────────────────
function handleGetUsers(ss, d) {
  var sh = ss.getSheetByName(SH_USERS);
  if (!sh || sh.getLastRow() < 2) return {ok: true, users: [], msg: "Sem utilizadores."};

  var data = sh.getDataRange().getValues();
  var users = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    // Filter by turma if specified
    if (d.turma && String(row[4]).trim() !== d.turma) continue;
    users.push({
      tipo:          String(row[0]).trim(),
      id:            String(row[1]).trim(),
      nome:          String(row[2]).trim(),
      turma:         String(row[4]).trim(),
      sheetsUrl:     String(row[5]).trim(),
      codigoEstagio: String(row[6]).trim(),
      codigoAulas:   String(row[7]).trim(),
      pwdAulas:      String(row[8]).trim(),
      ativo:         String(row[9]).trim() !== "Não",
      uidRfid:       String(row[10]).trim(),
      criadoEm:      String(row[11]).trim()
    });
  }
  return {ok: true, users: users, msg: users.length + " utilizadores"};
}

function handleAddUser(ss, d) {
  var sh = getOrCreate(ss, SH_USERS, HDR_USERS, "#1B3A6B");
  var id = String(d.id || "").trim();
  if (!id) return {ok: false, msg: "ID obrigatório."};

  // Check duplicate
  if (sh.getLastRow() >= 2) {
    var ids = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().flat().map(function(v){return String(v).trim().toLowerCase();});
    if (ids.indexOf(id.toLowerCase()) >= 0) {
      return {ok: false, msg: "ID '" + id + "' já existe."};
    }
  }

  var pwdHash = d.pwd ? (d.pwd.startsWith("h_") ? d.pwd : hashPwd(d.pwd)) : hashPwd(id);

  sh.appendRow([
    d.tipo || "aluno",
    id,
    d.nome || "",
    pwdHash,
    d.turma || "",
    d.sheetsUrl || "",
    d.codigoEstagio || "",
    d.codigoAulas || "",
    d.pwdAulas || "",
    d.ativo !== false ? "Sim" : "Não",
    d.uidRfid || "",
    timestamp()
  ]);

  // Format row
  var lastRow = sh.getLastRow();
  sh.getRange(lastRow, 1, 1, HDR_USERS.length)
    .setBackground(lastRow % 2 === 0 ? "#F8FAFC" : "#FFFFFF");

  return {ok: true, msg: "Utilizador '" + id + "' adicionado."};
}

function handleUpdateUser(ss, d) {
  var sh = ss.getSheetByName(SH_USERS);
  if (!sh || sh.getLastRow() < 2) return {ok: false, msg: "Sem utilizadores."};

  var id = String(d.id || "").trim().toLowerCase();
  var data = sh.getDataRange().getValues();

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][1]).trim().toLowerCase() !== id) continue;
    var rowNum = r + 1;
    // Update fields that are provided
    if (d.nome !== undefined)          sh.getRange(rowNum, 3).setValue(d.nome);
    if (d.pwd !== undefined)           sh.getRange(rowNum, 4).setValue(d.pwd.startsWith("h_") ? d.pwd : hashPwd(d.pwd));
    if (d.turma !== undefined)         sh.getRange(rowNum, 5).setValue(d.turma);
    if (d.sheetsUrl !== undefined)     sh.getRange(rowNum, 6).setValue(d.sheetsUrl);
    if (d.codigoEstagio !== undefined) sh.getRange(rowNum, 7).setValue(d.codigoEstagio);
    if (d.codigoAulas !== undefined)   sh.getRange(rowNum, 8).setValue(d.codigoAulas);
    if (d.pwdAulas !== undefined)      sh.getRange(rowNum, 9).setValue(d.pwdAulas);
    if (d.ativo !== undefined)         sh.getRange(rowNum, 10).setValue(d.ativo ? "Sim" : "Não");
    if (d.uidRfid !== undefined)       sh.getRange(rowNum, 11).setValue(d.uidRfid);
    return {ok: true, msg: "Utilizador '" + id + "' atualizado."};
  }
  return {ok: false, msg: "Utilizador não encontrado."};
}

function handleRemoveUser(ss, d) {
  var sh = ss.getSheetByName(SH_USERS);
  if (!sh || sh.getLastRow() < 2) return {ok: false, msg: "Sem utilizadores."};

  var id = String(d.id || "").trim().toLowerCase();
  var data = sh.getDataRange().getValues();

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][1]).trim().toLowerCase() !== id) continue;
    sh.deleteRow(r + 1);
    return {ok: true, msg: "Utilizador '" + id + "' removido."};
  }
  return {ok: false, msg: "Utilizador não encontrado."};
}

// ─────────────────────────────────────────────────────────────────────
// RFID LOOKUP & PRESENÇA (for ESP32/RPi terminals)
// ─────────────────────────────────────────────────────────────────────
function handleRfidLookup(ss, d) {
  var uid = String(d.uid || "").trim().toUpperCase();
  if (!uid) return {ok: false, msg: "UID obrigatório."};

  var sh = ss.getSheetByName(SH_USERS);
  if (!sh || sh.getLastRow() < 2) return {ok: false, msg: "Sem utilizadores."};

  var data = sh.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][10]).trim().toUpperCase() !== uid) continue;
    if (String(data[r][9]).trim().toLowerCase() === "não") {
      return {ok: false, msg: "Conta desativada."};
    }
    return {
      ok: true,
      msg: "UID encontrado",
      id:    String(data[r][1]).trim(),
      nome:  String(data[r][2]).trim(),
      turma: String(data[r][4]).trim(),
      sheetsUrl: String(data[r][5]).trim()
    };
  }
  return {ok: false, msg: "Cartão não registado."};
}

function handleRfidPresenca(ss, d) {
  // 1. Lookup the UID
  var lookup = handleRfidLookup(ss, d);
  if (!lookup.ok) return lookup;

  // 2. Forward the presença to the turma's Sheets
  var sheetsUrl = lookup.sheetsUrl;
  if (!sheetsUrl) return {ok: false, msg: "Sem URL do Sheets configurado para " + lookup.nome};

  try {
    var payload = {
      action: "presencaRegisto",
      alunoId: "rfid_" + String(d.uid).trim(),
      alunoNome: lookup.nome,
      nAluno: lookup.id,
      tipo: d.tipo || "entrada",
      lat: d.lat || 0,
      lng: d.lng || 0,
      acc: 0,
      dist: 0,
      raio: 0,
      valid: true,
      localNome: d.terminal || "Terminal RFID",
      atraso: 0,
      pontualidade: ""
    };

    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(sheetsUrl, options);
    var result = JSON.parse(response.getContentText());

    return {
      ok: result.ok,
      msg: result.ok ? "Presença registada" : (result.msg || "Erro"),
      nome: lookup.nome,
      turma: lookup.turma,
      id: lookup.id
    };
  } catch(e) {
    return {ok: false, msg: "Erro ao registar: " + e.message, nome: lookup.nome};
  }
}
