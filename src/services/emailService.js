// src/services/emailService.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Bitzy <noreply@bitzy.pet>';

const emailService = {
  async sendPasswordResetCode(toEmail, userName, code) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: 'Seu código de redefinição de senha — Bitzy',
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
  },
};

module.exports = emailService;