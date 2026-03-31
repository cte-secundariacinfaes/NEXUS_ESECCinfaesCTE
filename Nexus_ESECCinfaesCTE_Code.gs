// ═══════════════════════════════════════════════════════════════════════════
// Nexus ESECCinfãesCTE — Google Apps Script  (v4 · multi-UFCD autoavaliação)
// ─────────────────────────────────────────────────────────────────────────
// COMO INSTALAR:
//   1. script.google.com → Novo projeto → cola este código
//   2. Implementar → Nova implementação → Aplicação Web
//      • Executar como: "Eu"
//      • Quem tem acesso: "Qualquer pessoa"
//   3. Copia o URL → cola na app HTML (⚙️ Gerir → Google Sheets)
//
// FOLHAS CRIADAS AUTOMATICAMENTE:
//   Votos              — pares (critérios dinâmicos)
//   Votos Individuais  — avaliação por membro
//   Avaliação Professor — avaliações do professor
//   Resumo Pares       — médias pares por grupo
//   Resumo Professor   — médias professor com pesos
//   Sorteio            — ordem de apresentação
//   Presenças Estágio  — registos de entrada/saída com GPS
//   Presenças Aulas    — registos de presenças em aulas práticas
//   Feedback Estágio   — feedback diário dos alunos de estágio
//   Registo            — log interno
//   AA_<ABREV>         — autoavaliação por UFCD (criado automaticamente)
//                        ex: "AA_EAC", "AA_UFCD6059", "AA_IE"
//
// LÓGICA DAS ABREVIATURAS:
//   "Eletrónica, Automação e Computadores" → AA_EAC
//   "Instalações Elétricas"                → AA_IE
//   "UFCD 6059 — PLCs"                     → AA_UFCD6059
//   Se a disciplina já começa com "UFCD", usa "UFCD" + número
// ═══════════════════════════════════════════════════════════════════════════

const SH_AUTOAV   = "Autoavaliação"; // fallback/legacy tab name
const SH_PRESENCAS = "Presenças Estágio";
const SH_AULAS     = "Presenças Aulas";
const SH_PRES_FB   = "Feedback Estágio";
const SH_CONFIG    = "Configuração";
const SH_VOTES    = "Votos";
const SH_MEMBERS  = "Votos Individuais";
const SH_PROF     = "Avaliação Professor";
const SH_SUMMARY  = "Resumo Pares";
const SH_SUMPROF  = "Resumo Professor";
const SH_DRAW     = "Sorteio";
const SH_LOG      = "Registo";
const AA_PREFIX   = "AA_";   // prefix for autoav sheets

const HDR_BG    = "#1B3A6B";
const HDR_COLOR = "#FFFFFF";
const AA_HDR_BG = "#0F4C2A";  // dark green for autoav sheets

// ── Security ──────────────────────────────────────────────────────────
// Must match token in index.html, Professor.html, Aluno.html
const API_TOKEN = "nexus_eac_2026_token";

const HDR_DRAW    = ["Posição","Grupo ID","Nome do Grupo","Título","Timestamp"];
const HDR_LOG     = ["Timestamp","Tipo","Mensagem","Detalhe"];
const HDR_MEMBERS = ["Timestamp","Grupo ID","Nome do Grupo","Membro",
                     "Participação","Conhecimento","Clareza Individual",
                     "Média Membro (0–20)","Sessão ID"];
const HDR_PRESENCAS = ["Timestamp","Aluno ID","Nome Aluno","Tipo","Latitude","Longitude",
                       "Precisão (m)","Distância (m)","Raio Local (m)","Local Estágio",
                       "No Estágio?","Hora Formatada","Data","Atraso (min)","Pontualidade","Nº Aluno"];
const HDR_AULAS     = ["Timestamp","Sessão ID","Disciplina","Módulo","Data Aula",
                       "Hora Início","Aluno ID","Nome Aluno","Hora Marcação",
                       "Atraso (min)","Estado","Sumário","Descrição Aluno","Avaliação (0-10)","Nº Aluno"];

// ─────────────────────────────────────────────────────────────────────────
// ABREVIATURA DA DISCIPLINA → nome do tab
// ─────────────────────────────────────────────────────────────────────────
function disciplinaToSheetName(disciplina) {
  if (!disciplina) return AA_PREFIX + "GERAL";
  const d = disciplina.trim();

  // Se começa com "UFCD" seguido de número, usa "UFCD" + número
  const ufcdMatch = d.match(/UFCD\s*(\d+)/i);
  if (ufcdMatch) return AA_PREFIX + "UFCD" + ufcdMatch[1];

  // Palavras a ignorar na abreviatura
  const stop = new Set(["e","de","da","do","das","dos","a","o","em","por","para","com","na","no"]);

  // Tokenize: number sequences kept whole, words get first letter uppercase
  const tokens = d.replace(/[,–—\/\\()\[\]]/g, " ").match(/[0-9]+|[^\s0-9]+/g) || [];
  let abbrev = "";
  tokens.forEach(function(tok) {
    if (/^[0-9]+$/.test(tok)) {
      abbrev += tok;                              // keep full number: 6027 → "6027"
    } else if (!stop.has(tok.toLowerCase()) && tok.length > 0) {
      abbrev += tok[0].toUpperCase();            // first letter of word
    }
  });

  if (!abbrev) abbrev = d.substring(0, 4).replace(/\s/g, "").toUpperCase();
  return AA_PREFIX + abbrev.substring(0, 15);   // Sheets tab limit is 31 chars
}

// ─────────────────────────────────────────────────────────────────────────
// PONTO DE ENTRADA
// ─────────────────────────────────────────────────────────────────────────
function doPost(e) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(12000);
    const payload = JSON.parse(e.postData.contents);
    const action  = String(payload.action || "vote").toLowerCase();
    const logSh   = getOrCreate(ss, SH_LOG, HDR_LOG);
    // ── Token validation (ping always allowed) ──
    if (action !== "ping" && String(payload.token || "") !== API_TOKEN) {
      return jsonResp({ok: false, msg: "Acesso negado."});
    }

    // ── Role-based access control ──
    // If tipo='aluno', restrict to safe actions only.
    // If tipo is missing or 'prof', allow everything (retrocompatible).
    var tipo = String(payload.tipo || "prof").toLowerCase();
    var ALUNO_ACTIONS = ["vote","membervote","autoavsubmit","presencaregisto",
      "aularegisto","aulafeedback","presencafeedback","getconfig","ping",
      "getpresencas","getaulasregistos"];
    if (tipo === "aluno" && ALUNO_ACTIONS.indexOf(action) < 0) {
      return jsonResp({ok: false, msg: "Ação não permitida para alunos."});
    }

    let result;
    switch(action) {
      case "vote":             result = handleVote(ss, payload);          break;
      case "membervote":       result = handleMemberVote(ss, payload);    break;
      case "profvote":         result = handleProfVote(ss, payload);      break;
      case "profsummary":      result = handleProfSummary(ss, payload);   break;
      case "draw":             result = handleDraw(ss, payload);          break;
      case "summary":          result = handleSummary(ss, payload);       break;
      case "clearvotes":       result = handleClearVotes(ss);             break;
      case "ping":             result = {ok:true, msg:"Script ativo!"};   break;
      case "getvotes":         result = handleGetVotes(ss, payload);      break;
      case "autoavsubmit":     result = handleAutoAvSubmit(ss, payload);  break;
      case "getautoav":        result = handleGetAutoAv(ss, payload);     break;
      case "listautoavsheets": result = handleListAutoAvSheets(ss);       break;
      case "clearautoav":      result = handleClearAutoAv(ss, payload);   break;
      case "deleteautoavsheet": result = handleDeleteAutoAvSheet(ss, payload); break;
      case "getprofvotes":     result = handleGetProfVotes(ss, payload);  break;
      case "presencaregisto":  result = handlePresencaRegisto(ss, payload); break;
      case "getpresencas":     result = handleGetPresencas(ss, payload);    break;
      case "aularegisto":      result = handleAulaRegisto(ss, payload);     break;
      case "getaulasregistos": result = handleGetAulasRegistos(ss, payload); break;
      case "aulafeedback":     result = handleAulaFeedback(ss, payload);     break;
      case "presencafeedback": result = handlePresencaFeedback(ss, payload); break;
      case "saveconfig":       result = handleSaveConfig(ss, payload);       break;
      case "getconfig":        result = handleGetConfig(ss);                 break;
      case "rfidaularegisto": result = handleRfidAulaRegisto(ss, payload);  break;
      case "tomaconhecimento": result = handleTomaConhecimento(ss, payload);  break;
      default:               result = {ok:false, msg:"Ação desconhecida: "+action};
    }
    appendLog(logSh, action, result.msg||"ok", JSON.stringify(payload).substring(0,200));
    return jsonResp(result);
  } catch(err) {
    try {
      const lg = ss.getSheetByName(SH_LOG);
      if(lg) appendLog(lg,"ERRO",err.message, e.postData?e.postData.contents.substring(0,200):"");
    } catch(_){}
    return jsonResp({ok:false, error:err.message});
  } finally { lock.releaseLock(); }
}

function doGet() {
  return jsonResp({ok:true, msg:"Nexus ESECCinfãesCTE v6 ativo. Use POST.", version:6,
    actions:["vote","membervote","profvote","profsummary","draw","summary","clearvotes","ping",
             "getvotes","autoavsubmit","getautoav","listautoavsheets","clearautoav","deleteautoavsheet",
             "getprofvotes","presencaregisto","getpresencas","aularegisto","getaulasregistos",
             "aulafeedback","presencafeedback","saveconfig","getconfig"]});
}

// ─────────────────────────────────────────────────────────────────────────
// VOTOS DE PARES — critérios dinâmicos
// ─────────────────────────────────────────────────────────────────────────
function handleVote(ss, d) {
  const criteria = d.criteria || null;
  const ratings  = d.ratings  || {};
  let critKeys, critLabels;
  if(criteria && criteria.length) {
    critKeys   = criteria.map(c=>c.key);
    critLabels = criteria.map(c=>(c.emoji?" "+c.emoji+" ":"")+c.label);
  } else {
    critKeys   = Object.keys(ratings);
    critLabels = critKeys.map(k=>k.charAt(0).toUpperCase()+k.slice(1));
  }
  const hdrs = ["Timestamp","Grupo ID","Nome do Grupo","Título",
                ...critLabels,"Média (0–20)","Comentário","Sessão ID"];
  const sh = ensureDynamicSheet(ss, SH_VOTES, hdrs);
  const toScore = v => Math.round((Number(v)||0)*4);
  const scores  = critKeys.map(k=>toScore(ratings[k]||0));
  const media   = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
  sh.appendRow([timestamp(), d.groupId||"", d.groupName||"", d.groupTitle||"",
                ...scores, media, d.comment||"", d.sessionId||""]);
  styleLastRow(sh, hdrs.length);
  return {ok:true, msg:`Voto Grupo ${d.groupId} registado (${media}/20)`};
}

// ─────────────────────────────────────────────────────────────────────────
// VOTOS INDIVIDUAIS
// ─────────────────────────────────────────────────────────────────────────
function handleMemberVote(ss, d) {
  const sh = getOrCreate(ss, SH_MEMBERS, HDR_MEMBERS);
  const ts = timestamp();
  (d.memberRatings||[]).forEach(m=>{
    const r    = m.ratings||{};
    const part = Math.round((r.participacao||0)*4);
    const conh = Math.round((r.conhecimento||0)*4);
    const clar = Math.round((r.clareza_ind ||0)*4);
    const avg  = Math.round((part+conh+clar)/3);
    sh.appendRow([ts,d.groupId||"",d.groupName||"",m.name||"",part,conh,clar,avg,d.sessionId||""]);
    styleLastRow(sh, HDR_MEMBERS.length, "#F0F9F6");
  });
  return {ok:true, msg:`Votos individuais Grupo ${d.groupId} registados`};
}

// ─────────────────────────────────────────────────────────────────────────
// AVALIAÇÃO DO PROFESSOR
// ─────────────────────────────────────────────────────────────────────────
function handleProfVote(ss, d) {
  const record   = d.record   || {};
  const criteria = record.criteria || [];
  const ratings  = record.ratings  || {};
  const score    = record.score    || {};
  const sess     = d.session  || {};
  const critLabels = criteria.map(c=>`${c.emoji||''} ${c.label} (${c.weight}%)`);
  const hdrs = ["Timestamp","Grupo ID","Nome do Grupo","Título",
                ...critLabels, "Nota Final Ponderada (/20)",
                "Observações","Tipo de Sessão","Data"];
  const sh = ensureDynamicSheet(ss, SH_PROF, hdrs, "#0F2447");
  const toScore = v => Math.round((Number(v)||0)*4);
  const scores  = criteria.map(c=>toScore(ratings[c.key]||0));
  sh.appendRow([
    timestamp(), record.groupId||"", record.groupName||"", record.groupTitle||"",
    ...scores, score.total||0, record.comment||"", sess.tipo||"", sess.data||""
  ]);
  const lastRow = sh.getLastRow();
  const bg = lastRow%2===0?"#F0F4FA":"#FFFFFF";
  sh.getRange(lastRow,1,1,hdrs.length).setBackground(bg);
  const scoreCol = 5+criteria.length;
  sh.getRange(lastRow,scoreCol).setFontWeight("bold").setFontColor("#1B3A6B");
  return {ok:true, msg:`Avaliação professor Grupo ${record.groupId}: ${score.total}/20`};
}

// ─────────────────────────────────────────────────────────────────────────
// RESUMO PROFESSOR
// ─────────────────────────────────────────────────────────────────────────
function handleProfSummary(ss, d) {
  const sh = getOrCreate(ss, SH_SUMPROF, []);
  sh.clearContents();
  const records    = d.records    || [];
  const criteria   = d.criteria   || [];
  const sess       = d.session    || {};
  const driveLinks = d.driveLinks || [];
  const ts = timestamp();
  const sorted = [...records].sort((a,b)=>(b.score?.total||0)-(a.score?.total||0));
  sh.getRange("A1").setValue("Avaliação Professor — Resumo Oficial · "+ts)
    .setFontSize(12).setFontWeight("bold").setFontColor("#1B3A6B");
  sh.getRange("A2").setValue(
    [sess.turma,sess.tipo,sess.data?sess.data.split("-").reverse().join("/"):""]
    .filter(Boolean).join(" · "));
  sh.getRange("A3").setValue("");
  sh.getRange("A4").setValue("Critérios e Pesos:").setFontWeight("bold");
  criteria.forEach((c,i)=>{
    sh.getRange(4,2+i).setValue(`${c.emoji} ${c.label}: ${c.weight}%`).setBackground("#EEF2F7");
  });
  const hdrs = ["Pos.","Grupo","Título",
                ...criteria.map(c=>`${c.label} /20 (${c.weight}%)`),
                "Nota Final","Observações"];
  sh.getRange(6,1,1,hdrs.length).setValues([hdrs])
    .setFontWeight("bold").setBackground("#1B3A6B").setFontColor("#FFFFFF");
  sh.setFrozenRows(6);
  let row=7;
  sorted.forEach((e,i)=>{
    const scores = criteria.map(c=>Math.round((e.ratings?.[c.key]||0)*4));
    const bg = i===0?"#FFFBEB":i===1?"#F8FAFC":(row%2===0?"#F1F5F9":"#FFFFFF");
    const rowData = [i+1,e.groupName||"",e.groupTitle||"",...scores,e.score?.total||0,e.comment||""];
    sh.getRange(row,1,1,rowData.length).setValues([rowData]).setBackground(bg);
    sh.getRange(row,4+criteria.length).setFontWeight("bold").setFontColor("#1B3A6B");
    row++;
  });
  sh.autoResizeColumns(1,hdrs.length);
  if(driveLinks.length) {
    const linkRow=row+2;
    sh.getRange(linkRow,1).setValue("📎 EVIDÊNCIAS FOTOGRÁFICAS").setFontWeight("bold").setFontColor("#1B3A6B").setBackground("#EEF2F7");
    sh.getRange(linkRow+1,1,1,3).setValues([["Label","URL","Data"]]).setFontWeight("bold").setBackground("#1B3A6B").setFontColor("#FFFFFF");
    driveLinks.forEach((lnk,i)=>{
      const r=linkRow+2+i;
      sh.getRange(r,1,1,3).setValues([[lnk.label||"","",lnk.ts?new Date(lnk.ts).toLocaleDateString("pt-PT"):""]]);
      sh.getRange(r,2).setFormula(`=HYPERLINK("${lnk.url}","Ver evidência")`);
      sh.getRange(r,1,1,3).setBackground(i%2===0?"#F8FAFC":"#FFFFFF");
    });
  }
  return {ok:true, msg:"Resumo professor atualizado · "+ts};
}

// ─────────────────────────────────────────────────────────────────────────
// IMPORTAR VOTOS
// ─────────────────────────────────────────────────────────────────────────
function handleGetVotes(ss, d) {
  const sessionId = d.sessionId || null;
  const sh = ss.getSheetByName(SH_VOTES);
  if(!sh || sh.getLastRow()<2) return {ok:true,votes:[],memberVotes:[],msg:"Sem votos"};
  const data = sh.getDataRange().getValues();
  const hdrs = data[0].map(h=>String(h).trim());
  const fixedStart=4, fixedEnd=3;
  const critCols = hdrs.slice(fixedStart,hdrs.length-fixedEnd);
  const grouped  = {};
  for(let r=1;r<data.length;r++){
    const row=data[r]; const gid=String(row[1]||"").trim();
    if(!gid) continue;
    const sid=String(row[hdrs.length-1]||"").trim();
    if(sessionId&&sid&&sid!==sessionId) continue;
    const ratings={};
    critCols.forEach((_,i)=>{
      const val=Number(row[fixedStart+i])||0;
      ratings["c"+i]=val>0?Math.round(val/4):0;
    });
    const comment=String(row[hdrs.length-2]||"").trim();
    const ts=row[0]?new Date(row[0]).toISOString():new Date().toISOString();
    if(!grouped[gid]) grouped[gid]={id:gid,name:String(row[2]||""),title:String(row[3]||""),votes:[]};
    grouped[gid].votes.push({ratings,comment,ts,sessionId:sid});
  }
  const criteriaInfo=critCols.map((label,i)=>({key:"c"+i,label:label.replace(/^\s*[\p{Emoji}\s]+/u,"").trim()||label}));
  const msh=ss.getSheetByName(SH_MEMBERS);
  const memberVotes=[];
  if(msh&&msh.getLastRow()>1){
    const mdata=msh.getDataRange().getValues();
    for(let r=1;r<mdata.length;r++){
      const row=mdata[r]; const sid=String(row[8]||"").trim();
      if(sessionId&&sid&&sid!==sessionId) continue;
      memberVotes.push({groupId:String(row[1]||"").trim(),groupName:String(row[2]||"").trim(),
        member:String(row[3]||"").trim(),participacao:Number(row[4])||0,
        conhecimento:Number(row[5])||0,clareza_ind:Number(row[6])||0,avg:Number(row[7])||0,sessionId:sid});
    }
  }
  return {ok:true,groups:Object.values(grouped),criteriaInfo,memberVotes,
    msg:`${Object.keys(grouped).length} grupos · ${data.length-1} votos importados`};
}

function handleGetProfVotes(ss, d) {
  const sh=ss.getSheetByName(SH_PROF);
  if(!sh||sh.getLastRow()<2) return {ok:true,profVotes:[],msg:"Sem avaliações do professor"};
  const data=sh.getDataRange().getValues();
  const hdrs=data[0].map(h=>String(h).trim());
  const fixedStart=4,fixedEnd=4;
  const critHdrs=hdrs.slice(fixedStart,hdrs.length-fixedEnd);
  const profVotes={};
  for(let r=1;r<data.length;r++){
    const row=data[r]; const gid=String(row[1]||"").trim(); if(!gid) continue;
    const ratings={};
    critHdrs.forEach((h,i)=>{ratings["pc"+i]=Math.round((Number(row[fixedStart+i])||0)/4);});
    profVotes[gid]={groupId:gid,groupName:String(row[2]||"").trim(),groupTitle:String(row[3]||"").trim(),
      ratings,score:{total:Number(row[hdrs.length-4])||0,breakdown:[]},
      comment:String(row[hdrs.length-3]||"").trim(),
      ts:row[0]?new Date(row[0]).toISOString():new Date().toISOString()};
  }
  return {ok:true,profVotes,msg:`${Object.keys(profVotes).length} avaliações professor importadas`};
}

// ─────────────────────────────────────────────────────────────────────────
// LIMPAR VOTOS
// ─────────────────────────────────────────────────────────────────────────
function handleClearVotes(ss) {
  [SH_VOTES,SH_MEMBERS,SH_PROF].forEach(name=>{
    const sh=ss.getSheetByName(name);
    if(sh){const last=sh.getLastRow();if(last>1) sh.deleteRows(2,last-1);}
  });
  [SH_SUMMARY,SH_SUMPROF].forEach(name=>{
    const sh=ss.getSheetByName(name);if(sh) sh.clearContents();
  });
  return {ok:true,msg:"Votos apagados. Cabeçalhos mantidos."};
}

// ─────────────────────────────────────────────────────────────────────────
// SORTEIO
// ─────────────────────────────────────────────────────────────────────────
function handleDraw(ss, d) {
  const sh=getOrCreate(ss,SH_DRAW,HDR_DRAW);
  const last=sh.getLastRow();if(last>1) sh.deleteRows(2,last-1);
  const ts=timestamp();
  (d.order||[]).forEach((g,i)=>{
    sh.appendRow([i+1,g.id,g.name,g.title,ts]);
    styleLastRow(sh,HDR_DRAW.length);
  });
  return {ok:true,msg:`Sorteio: ${(d.order||[]).length} grupos`};
}

// ─────────────────────────────────────────────────────────────────────────
// RESUMO PARES
// ─────────────────────────────────────────────────────────────────────────
function handleSummary(ss, d) {
  const sh=getOrCreate(ss,SH_SUMMARY,[]);
  sh.clearContents();
  const grupos=d.groups||[],votes=d.votes||{},sess=d.session||{};
  const ts=timestamp();
  let critKeys=null,critLabels=null;
  for(const gid of Object.keys(votes)){
    const v=(votes[gid]||[])[0];
    if(v&&v.ratings){critKeys=Object.keys(v.ratings);critLabels=critKeys.map(k=>k.charAt(0).toUpperCase()+k.slice(1));break;}
  }
  if(!critKeys){critKeys=["nota"];critLabels=["Nota"];}
  sh.getRange("A1").setValue("Resumo Pares · "+ts).setFontSize(12).setFontWeight("bold").setFontColor("#1B3A6B");
  sh.getRange("A2").setValue([sess.turma,sess.tipo].filter(Boolean).join(" · "));
  sh.getRange("A3").setValue("");
  const hdrs=["Grupo","Título","Nº Votos",...critLabels,"Média Final"];
  sh.getRange(4,1,1,hdrs.length).setValues([hdrs]).setFontWeight("bold").setBackground("#1B3A6B").setFontColor("#FFFFFF");
  sh.setFrozenRows(4);
  const stats=grupos.map(g=>{
    const gv=votes[g.id]||[];if(!gv.length) return null;
    const scores=critKeys.map(k=>Math.round(gv.reduce((a,v)=>a+(v.ratings[k]||0),0)/gv.length*4));
    const media=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    return {g,scores,media,count:gv.length};
  }).filter(Boolean).sort((a,b)=>b.media-a.media);
  stats.forEach(({g,scores,media,count},i)=>{
    const row=5+i;
    sh.getRange(row,1,1,4+scores.length).setValues([[g.name,g.title,count,...scores,media]]);
    const bg=i===0?"#FFFBEB":i===1?"#F8FAFC":(row%2===0?"#F1F5F9":"#FFFFFF");
    sh.getRange(row,1,1,4+scores.length).setBackground(bg);
    sh.getRange(row,4+scores.length).setFontWeight("bold").setFontColor("#1B3A6B");
  });
  sh.autoResizeColumns(1,hdrs.length);
  return {ok:true,msg:"Resumo pares atualizado · "+ts};
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTOAVALIAÇÃO — um tab por UFCD/disciplina
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Submete uma autoavaliação.
 * Cria automaticamente o tab "AA_<ABREV>" se não existir.
 * d.cfg.disciplina determina o tab destino.
 */
function handleAutoAvSubmit(ss, d) {
  const record  = d.record || {};
  const cfg     = d.cfg    || {};
  const vetores = record.vetores || [];

  // Determine destination sheet
  // Use UFCD number for sheet name if available
  var ufcd = record.ufcd || cfg.ufcd || "";
  const sheetName = ufcd ? AA_PREFIX + "UFCD" + ufcd : disciplinaToSheetName(record.disciplina || cfg.disciplina || "");

  // Build headers
  const vetorHeaders = vetores.map(v => v.nome + " /20");
  const vetorContrib = vetores.map(v => v.nome + " contrib.");
  const pesos        = vetores.map(v => v.nome + " peso%");
  const hdrs = [
    "Timestamp","Nome","Disciplina","Nº UFCD","Ano/Turma","Ano Letivo","Data Avaliação",
    ...vetorHeaders,
    ...vetorContrib,
    "Nota Final /20",
    ...pesos,
    "Comentário",
    "Nº Aluno"
  ];

  const sh = ensureDynamicSheet(ss, sheetName, hdrs, AA_HDR_BG);

  // Colour-code the tab
  try {
    sh.setTabColor("#0F4C2A");
  } catch(_) {}

  // Row aligns exactly with hdrs (6 fixed cols before vetores)
  const row = [
    timestamp(),
    record.nome                              || "",  // Nome
    record.disciplina || cfg.disciplina      || "",  // Disciplina
    record.ano        || cfg.ano             || "",  // Ano/Turma
    record.anoLetivo  || cfg.anoLetivo       || "",  // Ano Letivo
    record.data       || cfg.data            || "",  // Data Avaliação
    ...vetores.map(v => v.subtotal  || 0),            // V /20  (one per vetor)
    ...vetores.map(v => v.contrib   || 0),            // V contrib.
    record.notaFinal  || 0,                           // Nota Final /20
    ...vetores.map(v => v.peso      || 0),            // V peso%
    record.comentario || "",                            // Comentário
    record.nAluno    || ""                              // Nº Aluno
  ];

  sh.appendRow(row);
  styleLastRow(sh, hdrs.length, "#EAF7EF");

  return {
    ok: true,
    sheetName,
    msg: `"${record.nome}" → ${sheetName} (${record.notaFinal}/20)`
  };
}

/**
 * Lista todos os tabs de autoavaliação existentes.
 * Devolve array de { sheetName, disciplina, count }
 */
function handleListAutoAvSheets(ss) {
  const sheets = ss.getSheets()
    .filter(sh => sh.getName().startsWith(AA_PREFIX))
    .map(sh => {
      const name  = sh.getName();
      const rows  = Math.max(sh.getLastRow() - 1, 0);
      // Try to read disciplina from first data row col 3
      let disciplina = name.replace(AA_PREFIX, "");
      if(sh.getLastRow() > 1) {
        const val = sh.getRange(2, 3).getValue();
        if(val) disciplina = String(val);
      }
      return { sheetName: name, disciplina, count: rows };
    });
  return { ok: true, sheets, msg: `${sheets.length} folhas de autoavaliação` };
}

/**
 * Devolve os registos de autoavaliação.
 * Se d.sheetName fornecido, lê esse tab específico.
 * Se d.disciplina fornecido, calcula o nome do tab.
 * Se nenhum, devolve TODOS os registos de todos os tabs AA_.
 */
function handleGetAutoAv(ss, d) {
  d = d || {};
  let targetSheets = [];

  if(d.sheetName) {
    const sh = ss.getSheetByName(d.sheetName);
    if(sh) targetSheets = [sh];
  } else if(d.disciplina) {
    const name = disciplinaToSheetName(d.disciplina);
    const sh = ss.getSheetByName(name);
    if(sh) targetSheets = [sh];
  } else {
    // All AA_ sheets
    targetSheets = ss.getSheets().filter(sh => sh.getName().startsWith(AA_PREFIX));
  }

  if(!targetSheets.length) {
    return { ok: true, records: [], msg: "Sem autoavaliações" };
  }

  const records = [];
  targetSheets.forEach(sh => {
    if(sh.getLastRow() < 2) return;
    const data = sh.getDataRange().getValues();
    const hdrs = data[0].map(h => String(h).trim());

    // ── nVetores: count peso columns at end of header (always correct) ──
    // Header layout: [fixed...] [sub×n /20] [contrib×n] [Nota Final /20] [peso×n %]
    // pesos are the last n columns → nVetores = totalHdrCols - 1 - notaFinalHdrIdx
    const notaFinalHdrIdx = hdrs.findIndex(h => h.startsWith("Nota Final"));
    const nVetores = (notaFinalHdrIdx > 0) ? (hdrs.length - 1 - notaFinalHdrIdx) : 3;
    // Vetor names from header sub-columns (columns just before contribs)
    // hdrFixedCols = where subs start in header = total - 1 - 3*nVetores
    const hdrFixedCols = hdrs.length - 1 - 3 * nVetores;
    const vetorNames = [];
    for (var vi = 0; vi < nVetores; vi++) {
      vetorNames.push(String(hdrs[hdrFixedCols + vi] || "Vetor "+(vi+1)).replace(" /20",""));
    }

    for(let r = 1; r < data.length; r++) {
      const row = data[r];
      if(!row[1]) continue;

      // ── Per-row column layout ──────────────────────────────────────
      // Data layout: [fixedCols...] [sub×n] [contrib×n] [NF] [peso×n]
      // Total data cols = fixedCols + 3*n + 1
      // So: fixedCols = row.length - 3*nVetores - 1  ← works regardless of format
      const dataFixed    = row.length - 3 * nVetores - 1;
      const subStart     = dataFixed;
      const contribStart = dataFixed + nVetores;
      const nfCol        = dataFixed + 2 * nVetores;
      const pesoStart    = nfCol + 1;

      const vetores = [];
      for(let i = 0; i < nVetores; i++) {
        vetores.push({
          nome:     vetorNames[i] || ("Vetor "+(i+1)),
          subtotal: Number(row[subStart     + i]) || 0,
          contrib:  Number(row[contribStart + i]) || 0,
          peso:     Number(row[pesoStart    + i]) || 0
        });
      }

      // Fixed metadata: ts(0), nome(1), disc(2), then ano/turma and anoletivo
      // Robust: find by position relative to subStart
      // Modern (6 fixed): [ts,nome,disc,ano,anoletivo,data, ...]  → ano=3, al=4
      // Legacy 7: [ts,nome,disc,turma,ano,anoletivo,data,...] → ano=4, al=5
      // Legacy 5: [ts,nome,disc,ano,anoletivo,...]             → ano=3, al=4
      const anoCol = dataFixed >= 6 ? dataFixed - 3 : 3;
      const alCol  = dataFixed >= 6 ? dataFixed - 2 : 4;

      records.push({
        sheetName:  sh.getName(),
        ts:         row[0] ? new Date(row[0]).toISOString() : "",
        nome:       String(row[1] || "").trim(),
        disciplina: String(row[2] || "").trim(),
        ano:        String(row[anoCol] || "").trim(),
        anoLetivo:  String(row[alCol]  || "").trim(),
        vetores,
        notaFinal:  Number(row[nfCol]) || 0
      });
    }
  });

  return {
    ok: true,
    records,
    msg: `${records.length} autoavaliações · ${targetSheets.length} folha(s)`
  };
}

/**
 * Limpa autoavaliações.
 * d.sheetName ou d.disciplina → limpa tab específico.
 * Sem parâmetros → limpa TODOS os tabs AA_.
 */
function handleListAutoAvSheets(ss) {
  const sheets = ss.getSheets()
    .filter(s => s.getName().startsWith("AA_") || s.getName() === SH_AUTOAV)
    .map(s => ({ name: s.getName(), rows: Math.max(0, s.getLastRow() - 1) }));
  return { ok: true, sheets, msg: sheets.length + " folha(s) de autoavaliação" };
}

function handleDeleteAutoAvSheet(ss, d) {
  const name = d && d.sheetName;
  if (!name) return { ok: false, msg: "sheetName em falta" };
  const sh = ss.getSheetByName(name);
  if (!sh) return { ok: false, msg: "Folha não encontrada: " + name };
  ss.deleteSheet(sh);
  return { ok: true, msg: "Folha [" + name + "] eliminada" };
}

function handleClearAutoAv(ss, d) {
  d = d || {};
  let targets = [];

  if(d.sheetName) {
    const sh = ss.getSheetByName(d.sheetName);
    if(sh) targets = [sh];
  } else if(d.disciplina) {
    const sh = ss.getSheetByName(disciplinaToSheetName(d.disciplina));
    if(sh) targets = [sh];
  } else {
    targets = ss.getSheets().filter(sh => sh.getName().startsWith(AA_PREFIX));
  }

  let cleared = 0;
  targets.forEach(sh => {
    if(sh.getLastRow() > 1) {
      sh.deleteRows(2, sh.getLastRow() - 1);
      cleared++;
    }
  });

  return {
    ok: true,
    msg: `${cleared} folha(s) de autoavaliação limpas`
  };
}

// ─────────────────────────────────────────────────────────────────────────
// PRESENÇAS DE ESTÁGIO
// ─────────────────────────────────────────────────────────────────────────
function handlePresencaRegisto(ss, d) {
  var sh = getOrCreate(ss, SH_PRESENCAS, HDR_PRESENCAS, "#0F4C2A");
  var ts = timestamp();
  var dataStr = new Date().toLocaleDateString("pt-PT");
  var horaStr = new Date().toLocaleTimeString("pt-PT", {hour:"2-digit", minute:"2-digit", second:"2-digit", timeZone:"Europe/Lisbon"});
  var valid = d.valid ? "Sim" : "Não";

  sh.appendRow([
    ts,
    d.alunoId  || "",
    d.alunoNome|| "",
    d.tipo     || "",
    d.lat      || "",
    d.lng      || "",
    Math.round(d.acc || 0),
    Math.round(d.dist || 0),
    d.raio     || "",
    d.localNome|| "",
    valid,
    horaStr,
    dataStr,
    Number(d.atraso) || 0,
    d.pontualidade === "presente" ? "Presente" :
    d.pontualidade === "pontualidade" ? "Falta Pontualidade" :
    d.pontualidade === "falta" ? "Falta" : "",
    d.nAluno || ""
  ]);

  var lastRow = sh.getLastRow();
  var bg = lastRow % 2 === 0 ? "#F0FDF4" : "#FFFFFF";
  sh.getRange(lastRow, 1, 1, HDR_PRESENCAS.length).setBackground(bg);

  // Colour the "No Estágio?" cell
  var validCell = sh.getRange(lastRow, 11);
  if (d.valid) {
    validCell.setFontColor("#065F46").setFontWeight("bold");
  } else {
    validCell.setFontColor("#991B1B").setFontWeight("bold").setBackground("#FEF2F2");
  }

  // Colour the Tipo cell
  var tipoCell = sh.getRange(lastRow, 4);
  if (String(d.tipo).toLowerCase() === "entrada") {
    tipoCell.setFontColor("#065F46").setFontWeight("bold");
  } else {
    tipoCell.setFontColor("#991B1B").setFontWeight("bold");
  }

  // Colour the Pontualidade cell
  if (d.pontualidade) {
    var pontCell = sh.getRange(lastRow, 15);
    if (d.pontualidade === "presente") {
      pontCell.setFontColor("#065F46").setFontWeight("bold");
    } else if (d.pontualidade === "pontualidade") {
      pontCell.setFontColor("#9A3412").setFontWeight("bold").setBackground("#FFF7ED");
    } else if (d.pontualidade === "falta") {
      pontCell.setFontColor("#991B1B").setFontWeight("bold").setBackground("#FEF2F2");
    }
  }

  return {ok: true, msg: d.alunoNome + " " + d.tipo + " (" + valid + ") às " + horaStr};
}

function handleGetPresencas(ss, d) {
  d = d || {};
  var sh = ss.getSheetByName(SH_PRESENCAS);
  if (!sh || sh.getLastRow() < 2) return {ok: true, records: [], msg: "Sem presenças"};

  var data = sh.getDataRange().getValues();
  var records = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[1]) continue;

    // Optional filters
    if (d.alunoId && String(row[1]).trim() !== String(d.alunoId).trim()) continue;
    if (d.data && String(row[12]).trim() !== String(d.data).trim()) continue;

    records.push({
      ts:        row[0] ? new Date(row[0]).toISOString() : "",
      alunoId:   String(row[1] || "").trim(),
      alunoNome: String(row[2] || "").trim(),
      tipo:      String(row[3] || "").trim(),
      lat:       Number(row[4]) || 0,
      lng:       Number(row[5]) || 0,
      acc:       Number(row[6]) || 0,
      dist:      Number(row[7]) || 0,
      raio:      Number(row[8]) || 0,
      localNome: String(row[9] || "").trim(),
      valid:     String(row[10] || "").trim() === "Sim",
      hora:      String(row[11] || "").trim(),
      data:      String(row[12] || "").trim(),
      atraso:    Number(row[13]) || 0,
      pontualidade: String(row[14] || "").trim()
    });
  }

  return {ok: true, records: records, msg: records.length + " registos de presenças"};
}

// ─────────────────────────────────────────────────────────────────────────
// PRESENÇAS EM AULAS PRÁTICAS (sem GPS)
// ─────────────────────────────────────────────────────────────────────────
function handleAulaRegisto(ss, d) {
  var sh = getOrCreate(ss, SH_AULAS, HDR_AULAS, "#4C1D95");
  var ts = timestamp();

  // Map estado to Portuguese
  var estadoPT = d.estado === "presente" ? "Presente" :
                 d.estado === "pontualidade" ? "Falta de Pontualidade" :
                 "Falta de Presença";

  sh.appendRow([
    ts,
    d.sessaoId    || "",
    d.disciplina  || "",
    d.modulo      || "",
    d.data        || "",
    d.horaInicio  || "",
    d.alunoId     || "",
    d.alunoNome   || "",
    d.horaMarcacao|| "",
    Number(d.atraso) || 0,
    estadoPT,
    d.sumario     || "",
    "",
    "",
    d.nAluno      || ""
  ]);

  var lastRow = sh.getLastRow();
  var bg = lastRow % 2 === 0 ? "#FAF5FF" : "#FFFFFF";
  sh.getRange(lastRow, 1, 1, HDR_AULAS.length).setBackground(bg);

  // Colour the Estado cell
  var estadoCell = sh.getRange(lastRow, 11);
  if (d.estado === "presente") {
    estadoCell.setFontColor("#065F46").setFontWeight("bold");
  } else if (d.estado === "pontualidade") {
    estadoCell.setFontColor("#9A3412").setFontWeight("bold").setBackground("#FFF7ED");
  } else {
    estadoCell.setFontColor("#991B1B").setFontWeight("bold").setBackground("#FEF2F2");
  }

  return {ok: true, msg: d.alunoNome + " → " + estadoPT + " (atraso: " + d.atraso + "min)"};
}

function handleGetAulasRegistos(ss, d) {
  d = d || {};
  var sh = ss.getSheetByName(SH_AULAS);
  if (!sh || sh.getLastRow() < 2) return {ok: true, records: [], msg: "Sem registos de aulas"};

  var data = sh.getDataRange().getValues();
  var records = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[6]) continue; // skip rows without alunoId

    // Optional filters
    if (d.alunoId && String(row[6]).trim() !== String(d.alunoId).trim()) continue;
    if (d.disciplina && String(row[2]).trim() !== String(d.disciplina).trim()) continue;

    records.push({
      ts:           row[0] ? new Date(row[0]).toISOString() : "",
      sessaoId:     String(row[1] || "").trim(),
      disciplina:   String(row[2] || "").trim(),
      modulo:       String(row[3] || "").trim(),
      data:         String(row[4] || "").trim(),
      horaInicio:   String(row[5] || "").trim(),
      alunoId:      String(row[6] || "").trim(),
      alunoNome:    String(row[7] || "").trim(),
      horaMarcacao: String(row[8] || "").trim(),
      atraso:       Number(row[9]) || 0,
      estado:       String(row[10] || "").trim(),
      sumario:      String(row[11] || "").trim(),
      descricao:    String(row[12] || "").trim(),
      avaliacao:    row[13] !== "" && row[13] !== null ? Number(row[13]) : -1
    });
  }

  return {ok: true, records: records, msg: records.length + " registos de aulas"};
}

// ─────────────────────────────────────────────────────────────────────────
// FEEDBACK — "O que fizeste hoje?"
// ─────────────────────────────────────────────────────────────────────────

/**
 * Aulas feedback: finds existing row by sessaoId+alunoId and updates
 * the Descrição and Avaliação columns in-place.
 */
function handleAulaFeedback(ss, d) {
  var sh = ss.getSheetByName(SH_AULAS);
  if (!sh || sh.getLastRow() < 2) return {ok: false, msg: "Sem folha de aulas"};

  var data = sh.getDataRange().getValues();
  var found = false;

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][1]).trim() === String(d.sessaoId).trim() &&
        String(data[r][6]).trim() === String(d.alunoId).trim()) {
      // Update columns 13 (Descrição) and 14 (Avaliação)
      sh.getRange(r + 1, 13).setValue(d.descricao || "");
      var avalVal = Number(d.avaliacao);
      sh.getRange(r + 1, 14).setValue(avalVal >= 0 ? avalVal : "");
      if (avalVal >= 0) {
        sh.getRange(r + 1, 14).setFontWeight("bold").setFontColor("#4C1D95");
      }
      found = true;
      break;
    }
  }

  if (!found) return {ok: false, msg: "Registo não encontrado"};
  return {ok: true, msg: d.alunoNome + " feedback atualizado"};
}

/**
 * Presenças estágio feedback: appends/updates daily feedback in a
 * dedicated "Feedback Estágio" sheet.
 */
var HDR_PRES_FB = ["Timestamp", "Aluno ID", "Nome Aluno", "Data",
                   "Descrição", "Avaliação (0-10)"];

function handlePresencaFeedback(ss, d) {
  var sh = getOrCreate(ss, SH_PRES_FB, HDR_PRES_FB, "#0F4C2A");
  var ts = timestamp();

  // Check if there's already a row for this aluno+data — update it
  if (sh.getLastRow() > 1) {
    var data = sh.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][1]).trim() === String(d.alunoId).trim() &&
          String(data[r][3]).trim() === String(d.data).trim()) {
        // Update in-place
        sh.getRange(r + 1, 1).setValue(ts);
        sh.getRange(r + 1, 5).setValue(d.descricao || "");
        var av = Number(d.avaliacao);
        sh.getRange(r + 1, 6).setValue(av >= 0 ? av : "");
        if (av >= 0) {
          sh.getRange(r + 1, 6).setFontWeight("bold").setFontColor("#065F46");
        }
        return {ok: true, msg: d.alunoNome + " feedback " + d.data + " atualizado"};
      }
    }
  }

  // New row
  var avalVal = Number(d.avaliacao);
  sh.appendRow([
    ts,
    d.alunoId   || "",
    d.alunoNome || "",
    d.data      || "",
    d.descricao || "",
    avalVal >= 0 ? avalVal : ""
  ]);

  var lastRow = sh.getLastRow();
  var bg = lastRow % 2 === 0 ? "#F0FDF4" : "#FFFFFF";
  sh.getRange(lastRow, 1, 1, HDR_PRES_FB.length).setBackground(bg);
  if (avalVal >= 0) {
    sh.getRange(lastRow, 6).setFontWeight("bold").setFontColor("#065F46");
  }

  return {ok: true, msg: d.alunoNome + " feedback " + d.data + " registado"};
}

// ─────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO — partilha entre Professor e Aluno
// ─────────────────────────────────────────────────────────────────────────

/**
 * Professor publica toda a configuração para o Sheets.
 * Guarda como JSON numa célula única — simples e eficaz.
 */
function handleSaveConfig(ss, d) {
  var sh = ss.getSheetByName(SH_CONFIG);
  if (!sh) {
    sh = ss.insertSheet(SH_CONFIG);
    sh.setTabColor("#1B3A6B");
  }
  sh.clearContents();
  var ts = timestamp();
  sh.getRange("A1").setValue("Configuração Nexus — Última atualização: " + ts)
    .setFontWeight("bold").setFontColor("#1B3A6B").setFontSize(11);
  sh.getRange("A2").setValue("⚠️ Não editar manualmente — esta folha é gerida pela aplicação.")
    .setFontColor("#DC2626").setFontSize(9);
  sh.getRange("A3").setValue(ts).setFontColor("#64748B").setFontSize(9);
  // Store JSON in A4
  var json = JSON.stringify(d.config || {});
  sh.getRange("A4").setValue(json).setWrap(false);
  sh.setColumnWidth(1, 600);
  return {ok: true, msg: "Configuração publicada às " + ts};
}

/**
 * Aluno carrega a configuração publicada pelo professor.
 */
function handleGetConfig(ss) {
  var sh = ss.getSheetByName(SH_CONFIG);
  if (!sh) return {ok: false, msg: "Sem configuração publicada. O professor deve publicar primeiro."};
  var raw = sh.getRange("A4").getValue();
  if (!raw) return {ok: false, msg: "Configuração vazia."};
  try {
    var config = JSON.parse(raw);
    var ts = String(sh.getRange("A3").getValue() || "");
    return {ok: true, config: config, updatedAt: ts, msg: "Configuração carregada"};
  } catch(e) {
    return {ok: false, msg: "Erro ao ler configuração: " + e.message};
  }
}

// ─────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────
function getOrCreate(ss, name, headers, bgColor) {
  let sh=ss.getSheetByName(name);
  if(!sh){ sh=ss.insertSheet(name); if(headers.length) writeHeader(sh,headers,bgColor); }
  return sh;
}

function ensureDynamicSheet(ss, name, expectedHeaders, bgColor) {
  let sh=ss.getSheetByName(name);
  if(!sh){ sh=ss.insertSheet(name); writeHeader(sh,expectedHeaders,bgColor); return sh; }
  const lastCol=Math.max(sh.getLastColumn(),1);
  const cur=sh.getRange(1,1,1,lastCol).getValues()[0].map(v=>String(v).trim());
  const same=expectedHeaders.length===cur.length&&expectedHeaders.every((h,i)=>h===cur[i]);
  if(!same){
    if(expectedHeaders.length>cur.length)
      sh.insertColumnsAfter(cur.length,expectedHeaders.length-cur.length);
    writeHeader(sh,expectedHeaders,bgColor);
  }
  return sh;
}

function writeHeader(sh, headers, bgColor) {
  sh.getRange(1,1,1,headers.length).setValues([headers])
    .setFontWeight("bold").setBackground(bgColor||HDR_BG).setFontColor(HDR_COLOR);
  sh.setFrozenRows(1);
}

function styleLastRow(sh, numCols, evenColor) {
  const lastRow=sh.getLastRow();
  sh.getRange(lastRow,1,1,numCols)
    .setBackground(lastRow%2===0?(evenColor||"#F1F5F9"):"#FFFFFF");
}

function appendLog(sh, type, msg, detail) {
  sh.appendRow([timestamp(),type,msg,detail]);
  styleLastRow(sh,HDR_LOG.length);
}

function timestamp() {
  return new Date().toLocaleString("pt-PT",{timeZone:"Europe/Lisbon"});
}

function jsonResp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────────────
// RFID AULA REGISTO — auto-detects active session
// ─────────────────────────────────────────────────────────────────────
function handleRfidAulaRegisto(ss, d) {
  // Try to find the active session from published config
  var configSh = ss.getSheetByName("Configuração");
  var sessaoId = "", disciplina = "", modulo = "", horaInicio = "", data = "", sumario = "";

  if (configSh && configSh.getLastRow() >= 4) {
    try {
      var cfgRaw = configSh.getRange(4, 1).getValue();
      if (cfgRaw) {
        var cfg = JSON.parse(cfgRaw);
        if (cfg.aulas && cfg.aulas.sessoes) {
          // Find the open session
          var active = null;
          for (var i = 0; i < cfg.aulas.sessoes.length; i++) {
            if (cfg.aulas.sessoes[i].aberta) {
              active = cfg.aulas.sessoes[i];
              break;
            }
          }
          if (active) {
            sessaoId   = active.id || "";
            disciplina = active.disciplina || "";
            modulo     = active.modulo || "";
            horaInicio = active.horaInicio || "";
            data       = active.data || "";
            sumario    = active.sumario || "";
          }
        }
      }
    } catch(e) {
      // Config parse error — continue with empty fields
    }
  }

  if (!sessaoId) {
    return {ok: false, msg: "Sem sessão de aula aberta."};
  }

  // Calculate time and punctuality
  var now = new Date();
  var horaMarcacao = Utilities.formatDate(now, "Europe/Lisbon", "HH:mm:ss");
  var atraso = 0;
  var estado = "presente";

  if (horaInicio) {
    var parts = horaInicio.split(":");
    var inicioMin = Number(parts[0]) * 60 + Number(parts[1] || 0);
    var agoraMin = now.getHours() * 60 + now.getMinutes();
    atraso = Math.max(0, agoraMin - inicioMin);
    if (atraso > 15) estado = "falta";
    else if (atraso > 10) estado = "pontualidade";
  }

  // Use the standard aula handler
  var aulaPayload = {
    sessaoId:     sessaoId,
    disciplina:   disciplina,
    modulo:       modulo,
    data:         data || Utilities.formatDate(now, "Europe/Lisbon", "yyyy-MM-dd"),
    horaInicio:   horaInicio,
    alunoId:      d.alunoId || "rfid_" + (d.uid || ""),
    alunoNome:    d.alunoNome || "",
    horaMarcacao: horaMarcacao,
    atraso:       atraso,
    estado:       estado,
    sumario:      sumario,
    nAluno:       d.nAluno || "",
    token:        d.token || ""
  };

  var result = handleAulaRegisto(ss, aulaPayload);
  result.sessao = disciplina + (modulo ? " — " + modulo : "");
  return result;
}

// ─────────────────────────────────────────────────────────────────────
// TOMADA DE CONHECIMENTO
// ─────────────────────────────────────────────────────────────────────
function handleTomaConhecimento(ss, d) {
  var shName = "Tomada Conhecimento";
  var hdrs = ["Timestamp","Nome","Nº Aluno","Disciplina","Nº UFCD","Ano/Turma",
              "Ano Letivo","Docs Consultados","Assinatura"];
  var sh = getOrCreate(ss, shName, hdrs, "#92400E");

  var ts = timestamp();
  sh.appendRow([
    ts,
    d.nome || "",
    d.nAluno || "",
    d.disciplina || "",
    d.ufcd || "",
    d.ano || "",
    d.anoLetivo || "",
    d.docs || "",
    "Sim"
  ]);

  var lastRow = sh.getLastRow();
  var bg = lastRow % 2 === 0 ? "#FFFBEB" : "#FFFFFF";
  sh.getRange(lastRow, 1, 1, hdrs.length).setBackground(bg);
  sh.getRange(lastRow, hdrs.length).setFontColor("#065F46").setFontWeight("bold");

  return {ok: true, msg: d.nome + " assinou — " + (d.disciplina||"") + " UFCD " + (d.ufcd||"")};
}

