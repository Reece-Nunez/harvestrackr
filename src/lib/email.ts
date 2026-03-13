import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "HarvesTrackr <noreply@nunezdev.com>";

interface InviteEmailParams {
  to: string;
  inviteUrl: string;
  farmName: string;
  inviterName: string;
  role: string;
}

export async function sendInviteEmail({
  to,
  inviteUrl,
  farmName,
  inviterName,
  role,
}: InviteEmailParams) {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You're invited to join ${farmName} on HarvesTrackr`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #357a38; padding: 32px 40px; text-align: center;">
              <span style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">HarvesTrackr</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #18181b; text-align: center; line-height: 1.3;">
                You're invited!
              </h1>

              <p style="margin: 0 0 24px; font-size: 15px; color: #71717a; text-align: center; line-height: 1.6;">
                ${inviterName} has invited you to collaborate on HarvesTrackr.
              </p>

              <!-- Details Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 8px; border: 1px solid #e4e4e7; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="font-size: 13px; color: #71717a;">Farm</span><br />
                          <span style="font-size: 15px; color: #18181b; font-weight: 500;">${farmName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="font-size: 13px; color: #71717a;">Your role</span><br />
                          <span style="display: inline-block; margin-top: 4px; padding: 2px 10px; background-color: #e8f5e9; color: #357a38; border-radius: 4px; font-size: 13px; font-weight: 600;">${role}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="font-size: 13px; color: #71717a;">Invited by</span><br />
                          <span style="font-size: 15px; color: #18181b; font-weight: 500;">${inviterName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #357a38; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; text-align: center;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 13px; color: #a1a1aa; text-align: center; line-height: 1.5;">
                This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e4e4e7; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} HarvesTrackr. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw error;
  }
}
