import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }
  return new Resend(apiKey);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const emailService = {
  sendEmail: async ({ to, subject, html }: EmailOptions) => {
    try {
      const resend = getResendClient();
      const data = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'STARTER <probotic@browserautomations.com>',
        to,
        subject,
        html,
      });
      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },

  sendInviteEmail: async (email: string, inviteLink: string) => {
    const subject = 'You have been invited to join our platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Our Platform!</h2>
        <p>You have been invited to join our platform. To get started, please click the button below to set up your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${inviteLink}</p>
        <p>This invitation link will expire in 24 hours.</p>
        <p>If you didn't request this invitation, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
      </div>
    `;

    return emailService.sendEmail({ to: email, subject, html });
  },

  sendPasswordResetEmail: async (email: string, resetUrl: string) => {
    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You have requested to reset your password. To proceed, please click the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p><strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
      </div>
    `;

    return emailService.sendEmail({ to: email, subject, html });
  }
};

// Export specific functions for direct import
export const { sendEmail, sendInviteEmail, sendPasswordResetEmail } = emailService;