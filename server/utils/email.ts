import { MailService } from '@sendgrid/mail';
import { type MailDataRequired } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = 'noreply@techevents.io';

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    // Initialize with required text content
    const msg: MailDataRequired = {
      to: params.to,
      from: params.from || FROM_EMAIL,
      subject: params.subject,
      text: params.text || params.html?.replace(/<[^>]*>/g, '') || 'No content provided',
      html: params.html
    };

    console.log('Sending email:', {
      to: msg.to,
      from: msg.from,
      subject: msg.subject,
      timestamp: new Date().toISOString()
    });

    await mailService.send(msg);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendVerificationCode(
  to: string,
  code: string
): Promise<boolean> {
  return sendEmail({
    to,
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
    `
  });
}

export async function sendEventConfirmation(
  to: string,
  eventTitle: string,
  eventDate: string,
  eventUrl: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Event Created: ${eventTitle}`,
    text: `Event "${eventTitle}" has been created successfully.\nDate: ${eventDate}\nView details at: ${eventUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Event Successfully Created</h2>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0; color: #4F46E5;">${eventTitle}</h3>
          <p style="color: #666; margin: 10px 0;">Date: ${eventDate}</p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${eventUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Event Details
          </a>
        </div>
        <p style="color: #666; margin-top: 30px; font-size: 14px;">
          This email was sent by TechEvents.io. If you did not create this event, please contact support.
        </p>
      </div>
    `
  });
}

export async function sendEventReminder(
  to: string,
  eventTitle: string,
  eventDate: string,
  eventUrl: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Reminder: ${eventTitle} is Coming Up`,
    text: `Reminder: Your event "${eventTitle}" is coming up!\nDate: ${eventDate}\nView details at: ${eventUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Event Reminder</h2>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0; color: #4F46E5;">${eventTitle}</h3>
          <p style="color: #666; margin: 10px 0;">Date: ${eventDate}</p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${eventUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Event Details
          </a>
        </div>
      </div>
    `
  });
}

// Function to generate a random 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}