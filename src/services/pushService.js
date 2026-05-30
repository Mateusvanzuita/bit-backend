// src/services/pushService.js
//
// Helper que envia push notifications via Expo Push API.
// Não lança exceção se o envio falhar — push é best-effort.

const https = require('https');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Envia uma notificação push para um único token.
 *
 * @param {string} pushToken   - Token Expo do dispositivo (ex: "ExponentPushToken[xxx]")
 * @param {string} titulo      - Título da notificação
 * @param {string} mensagem    - Corpo da notificação
 * @param {object} [data={}]   - Dados extras (ex: { pathKey: '/analise/123' })
 */
async function enviarPush(pushToken, titulo, mensagem, data = {}) {
  if (!pushToken) return;

  // Valida formato básico do token Expo
  if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
    console.warn('[Push] Token com formato inesperado:', pushToken);
    return;
  }

  const payload = JSON.stringify({
    to: pushToken,
    title: titulo,
    body: mensagem,
    data,
    sound: 'default',
    channelId: 'default', // Android
    priority: 'high',
  });

  return new Promise((resolve) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    const req = https.request(EXPO_PUSH_URL, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const item = parsed?.data?.[0];
          if (item?.status === 'error') {
            console.warn('[Push] Expo retornou erro:', item.message, '| token:', pushToken);
          } else {
            console.log('[Push] Enviado com sucesso para:', pushToken);
          }
        } catch {
          // ignora erros de parse da resposta
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.warn('[Push] Falha na requisição para Expo:', err.message);
      resolve(); // não propaga — push é best-effort
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { enviarPush };