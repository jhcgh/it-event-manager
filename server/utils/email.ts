import { MailService } from '@sendgrid/mail';
import { type MailDataRequired } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

// Update FROM_EMAIL to use the official domain
const FROM_EMAIL = {
  email: process.env.SENDGRID_FROM_EMAIL || 'noreply@itevents.io',
  name: 'ITEvents.io' // Add sender name for better identification
};

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    // Initialize with required text content
    const msg: MailDataRequired = {
      to: params.to,
      from: FROM_EMAIL,
      subject: params.subject,
      text: params.text || params.html?.replace(/<[^>]*>/g, '') || 'No content provided',
      html: params.html,
      // Add mail settings for better deliverability
      mailSettings: {
        sandboxMode: {
          enable: false
        },
        bypassListManagement: {
          enable: true
        }
      },
      // Add tracking settings
      trackingSettings: {
        openTracking: {
          enable: true
        },
        clickTracking: {
          enable: true,
          enableText: true
        },
        subscriptionTracking: {
          enable: false
        }
      }
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
    console.error('SendGrid email error:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error,
      params: {
        to: params.to,
        subject: params.subject
      },
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

export async function sendVerificationCode(
  to: string,
  code: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Your ITEvents.io Verification Code',
    text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5; margin-bottom: 20px;">Verify Your ITEvents.io Account</h2>
        <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
          Please use the following code to verify your account:
        </p>
        <div style="background: #F3F4F6; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
          <p style="font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 4px; margin: 0;">
            ${code}
          </p>
        </div>
        <p style="color: #6B7280; font-size: 14px; margin-top: 24px;">
          This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
        </p>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} ITEvents.io. All rights reserved.
          </p>
        </div>
      </div>
    `
  });
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5; margin-bottom: 20px;">Event Successfully Created</h2>
        <div style="background: #F3F4F6; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: #4F46E5;">${eventTitle}</h3>
          <p style="color: #374151; margin: 0;">Date: ${eventDate}</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${eventUrl}" 
             style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            View Event Details
          </a>
        </div>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} TechEvents.io. All rights reserved.
          </p>
        </div>
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5; margin-bottom: 20px;">Event Reminder</h2>
        <div style="background: #F3F4F6; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; color: #4F46E5;">${eventTitle}</h3>
          <p style="color: #374151; margin: 0;">Date: ${eventDate}</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${eventUrl}" 
             style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            View Event Details
          </a>
        </div>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} TechEvents.io. All rights reserved.
          </p>
        </div>
      </div>
    `
  });
}

export async function sendTestEmail(to: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Test Email from TechEvents.io',
    text: 'This is a test email to verify your SendGrid integration is working correctly.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5; margin-bottom: 20px;">TechEvents.io Test Email</h2>
        <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
          This is a test email to verify your SendGrid integration is working correctly.
        </p>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} TechEvents.io. All rights reserved.
          </p>
        </div>
      </div>
    `
  });
}