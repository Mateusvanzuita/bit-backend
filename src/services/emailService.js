// src/services/emailService.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Bitzy <noreply@bitzy.pet>';

const emailService = {
  
  async sendPasswordResetCode(toEmail, userName, code) {
    console.log(`📧 Tentando enviar email para: ${toEmail}`);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: 'Seu código de redefinição de senha - Bitzy',
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Redefinição de Senha</title>
        </head>
        <body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0"
                  style="background:#FFFFFF;border-radius:20px;overflow:hidden;
                         box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#191970,#2D3A8C);
                               padding:36px 40px;text-align:center;">
                      <div style="font-size:48px;margin-bottom:12px;">🐾</div>
                      <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;
                                 letter-spacing:-0.5px;">Bitzy</h1>
                      <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">
                        Seu assistente de saúde pet
                      </p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 40px 32px;">
                      <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">
                        Redefinição de senha
                      </h2>
                      <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
                        Olá, <strong style="color:#111827;">${userName}</strong>! 
                        Use o código abaixo para redefinir sua senha. 
                        Ele é válido por <strong>15 minutos</strong>.
                      </p>

                      <!-- Código -->
                      <div style="background:#F0F4FF;border:2px dashed #C7D2FE;
                                  border-radius:16px;padding:28px;text-align:center;
                                  margin-bottom:24px;">
                        <p style="margin:0 0 8px;color:#6B7280;font-size:13px;
                                  text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                          Seu código
                        </p>
                        <span style="font-size:44px;font-weight:800;letter-spacing:12px;
                                     color:#191970;font-family:'Courier New',monospace;">
                          ${code}
                        </span>
                      </div>

                      <p style="margin:0 0 8px;color:#9CA3AF;font-size:13px;line-height:1.6;">
                        Se você não solicitou a redefinição de senha, ignore este email. 
                        Sua senha permanece a mesma.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#F9FAFB;padding:20px 40px;
                               border-top:1px solid #E5E7EB;text-align:center;">
                      <p style="margin:0;color:#9CA3AF;font-size:12px;">
                        © ${new Date().getFullYear()} Bitzy — Todos os direitos reservados
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend error:', JSON.stringify(error));
      throw new Error(error.message);
    }

    console.log('✅ Email enviado com sucesso. ID:', data?.id);
  },

  async sendOngConvite(toEmail, nomeResponsavel, nomeOng, link) {
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `Seu acesso ao portal das ONGs do Bitzy - ${nomeOng}`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
        <body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 0;">
            <tr><td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <tr><td style="background:linear-gradient(135deg,#191970,#2D3A8C);padding:32px 40px;text-align:center;">
                  <div style="font-size:44px;margin-bottom:8px;">🐾</div>
                  <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;">Portal das ONGs Bitzy</h1>
                </td></tr>
                <tr><td style="padding:36px 40px 28px;">
                  <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Olá, ${esc(nomeResponsavel)}!</h2>
                  <p style="margin:0 0 20px;color:#6B7280;font-size:15px;line-height:1.6;">
                    A equipe do Bitzy liberou o acesso de <strong style="color:#111827;">${esc(nomeOng)}</strong>
                    ao portal, onde você cadastra os animais, acompanha os interessados e recebe pedidos de ajuda.
                  </p>
                  <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
                    Crie sua senha pelo botão abaixo. O link vale por <strong>7 dias</strong> e só pode ser usado uma vez.
                  </p>
                  <p style="text-align:center;margin:0 0 24px;">
                    <a href="${esc(link)}" style="display:inline-block;background:#191970;color:#FFFFFF;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:12px;">Criar minha senha</a>
                  </p>
                  <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:1.6;">
                    Se o botão não abrir, copie e cole este endereço no navegador:<br/>
                    <span style="word-break:break-all;">${esc(link)}</span><br/><br/>
                    Não esperava este e-mail? Pode ignorá-lo: sem a criação da senha, nada é ativado.
                  </p>
                </td></tr>
                <tr><td style="background:#F9FAFB;padding:18px 40px;border-top:1px solid #E5E7EB;text-align:center;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">© ${new Date().getFullYear()} Bitzy — Todos os direitos reservados</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend error (convite ONG):', JSON.stringify(error));
      throw new Error(error.message);
    }
    console.log('✅ Convite de ONG enviado. ID:', data?.id);
  },

  async sendOngResetSenha(toEmail, nome, link) {
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: 'Redefinir sua senha - Portal das ONGs Bitzy',
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
        <body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 0;">
            <tr><td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <tr><td style="background:linear-gradient(135deg,#191970,#2D3A8C);padding:28px 40px;text-align:center;">
                  <h1 style="margin:0;color:#FFFFFF;font-size:20px;font-weight:700;">Portal das ONGs Bitzy</h1>
                </td></tr>
                <tr><td style="padding:32px 40px 28px;">
                  <h2 style="margin:0 0 8px;color:#111827;font-size:19px;">Olá, ${esc(nome)}!</h2>
                  <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
                    Recebemos um pedido para redefinir a senha do seu acesso. O link vale por <strong>1 hora</strong> e só pode ser usado uma vez.
                  </p>
                  <p style="text-align:center;margin:0 0 24px;">
                    <a href="${esc(link)}" style="display:inline-block;background:#191970;color:#FFFFFF;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:12px;">Criar nova senha</a>
                  </p>
                  <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:1.6;">
                    Se o botão não abrir, copie e cole este endereço no navegador:<br/>
                    <span style="word-break:break-all;">${esc(link)}</span><br/><br/>
                    Não foi você? Ignore este e-mail: sua senha continua a mesma.
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend error (reset ONG):', JSON.stringify(error));
      throw new Error(error.message);
    }
  },
  
};

module.exports = emailService;