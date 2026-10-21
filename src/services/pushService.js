// src/services/pushService.js
//
// Envio de push notifications via Expo Push API.
// Nunca lança exceção: push é best-effort e não pode quebrar o fluxo principal.
//
//  - enviarPush(token, titulo, mensagem, data)  -> 1 destinatário
//  - enviarPushLote([{ pushToken, titulo, mensagem, data }]) -> vários (até 100 por requisição)
//
// Requer Node 18+ (fetch nativo).

const prisma = require('../config/database');

const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL || 'https://exp.host/--/api/v2/push/send';
const TIMEOUT_MS = Number(process.env.PUSH_TIMEOUT_MS) || 8000;
const LOTE_MAX = 100; // limite da Expo por requisição
const TOKEN_REGEX = /^Expo(nent)?PushToken\[[^\]\s]+\]$/;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const mascarar = (token) => `…${String(token).slice(-7)}`;

/** POST na Expo com timeout e 1 nova tentativa em falha de rede, 429 ou 5xx. */
async function postar(mensagens) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  for (let tentativa = 1; tentativa <= 2; tentativa += 1) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(mensagens), // sempre array: a resposta vem sempre como lista de tickets
        signal: controle.signal,
      });
      const json = await res.json().catch(() => null);

      if (res.ok && Array.isArray(json?.data)) return { tickets: json.data };

      // A Expo recusou o pedido inteiro (ex.: 400/403/429): vem em "errors", não em "data".
      const erroReq = json?.errors?.[0];
      const motivo = erroReq ? `${erroReq.code}: ${erroReq.message}` : `HTTP ${res.status}`;
      if ((res.status === 429 || res.status >= 500) && tentativa < 2) {
        await esperar(1000);
        continue;
      }
      return { erro: motivo };
    } catch (err) {
      const motivo = err.name === 'AbortError' ? `timeout (${TIMEOUT_MS}ms)` : err.message;
      if (tentativa < 2) {
        await esperar(1000);
        continue;
      }
      return { erro: motivo };
    } finally {
      clearTimeout(timer);
    }
  }
  return { erro: 'desconhecido' };
}

/** Tokens que a Expo diz não existirem mais (app desinstalado etc.) saem do banco. */
async function removerTokensMortos(tokens) {
  if (tokens.length === 0) return 0;
  try {
    const r = await prisma.user.updateMany({
      where: { pushToken: { in: tokens } },
      data: { pushToken: null },
    });
    return r.count;
  } catch (err) {
    console.warn('[Push] Não foi possível limpar tokens inválidos:', err.message);
    return 0;
  }
}

/**
 * Envia várias notificações. Descarta tokens com formato inválido, remove duplicados exatos
 * (mesmo token + mesmo conteúdo) e divide em requisições de até 100.
 *
 * @returns {Promise<{ enviados: number, falhas: Array, invalidos: number, duplicados: number, removidos: number }>}
 */
async function enviarPushLote(itens) {
  const resultado = { enviados: 0, falhas: [], invalidos: 0, duplicados: 0, removidos: 0 };

  try {
    const vistos = new Set();
    const mensagens = [];

    for (const item of itens ?? []) {
      const { pushToken, titulo, mensagem, data = {} } = item ?? {};
      if (!pushToken || !TOKEN_REGEX.test(pushToken)) {
        resultado.invalidos += 1;
        continue;
      }
      const chave = `${pushToken}|${titulo}|${mensagem}|${JSON.stringify(data)}`;
      if (vistos.has(chave)) {
        resultado.duplicados += 1;
        continue;
      }
      vistos.add(chave);
      mensagens.push({
        to: pushToken,
        title: titulo,
        body: mensagem,
        data,
        sound: 'default',
        channelId: 'default', // Android
        priority: 'high',
      });
    }

    const mortos = [];

    for (let i = 0; i < mensagens.length; i += LOTE_MAX) {
      const parte = mensagens.slice(i, i + LOTE_MAX);
      const resp = await postar(parte);

      if (resp.erro) {
        parte.forEach((m) => resultado.falhas.push({ token: mascarar(m.to), erro: resp.erro }));
        continue;
      }

      parte.forEach((m, idx) => {
        const ticket = resp.tickets[idx];
        if (ticket?.status === 'ok') {
          resultado.enviados += 1;
          return;
        }
        const codigo = ticket?.details?.error;
        if (codigo === 'DeviceNotRegistered') mortos.push(m.to);
        resultado.falhas.push({
          token: mascarar(m.to),
          erro: ticket?.message ?? 'sem resposta da Expo',
          codigo,
        });
      });
    }

    resultado.removidos = await removerTokensMortos(mortos);

    if (resultado.enviados > 0 || resultado.falhas.length > 0) {
      console.log(
        `[Push] ${resultado.enviados} aceito(s) pela Expo, ${resultado.falhas.length} falha(s)` +
          (resultado.removidos ? `, ${resultado.removidos} token(s) removido(s)` : ''),
      );
    }
    resultado.falhas.slice(0, 5).forEach((f) =>
      console.warn('[Push] Falha:', f.token, '|', f.codigo ?? '-', '|', f.erro),
    );
  } catch (err) {
    console.warn('[Push] Erro inesperado no envio:', err.message);
  }

  return resultado;
}

/**
 * Envia uma notificação para um único token.
 * Mesma assinatura de antes; agora devolve { ok, motivo? } em vez de undefined.
 */
async function enviarPush(pushToken, titulo, mensagem, data = {}) {
  if (!pushToken) return { ok: false, motivo: 'sem_token' };
  if (!TOKEN_REGEX.test(pushToken)) {
    console.warn('[Push] Token com formato inesperado:', mascarar(pushToken));
    return { ok: false, motivo: 'token_invalido' };
  }
  const r = await enviarPushLote([{ pushToken, titulo, mensagem, data }]);
  if (r.enviados === 1) return { ok: true };
  return { ok: false, motivo: r.falhas[0]?.codigo ?? r.falhas[0]?.erro ?? 'falha' };
}

module.exports = { enviarPush, enviarPushLote };