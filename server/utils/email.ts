import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = 'noreply@techevents.io'; // Update this with your verified sender

export async function sendVerificationCode(
  to: string,
  code: string
): Promise<boolean> {
  try {
    await mailService.send({
      to,
      from: FROM_EMAIL,
      subject: 'Your TechEvents.io Verification Code',
      text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your Verification Code</h2>
          <p style="font-size: 24px; font-weight: bold; color: #4F46E5; letter-spacing: 2px; padding: 20px; background: #F3F4F6; border-radius: 8px; text-align: center;">
            ${code}
          </p>
          <p style="color: #666; margin-top: 20px;">
            This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Function to generate a random 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
