import { defineEventHandler, readBody, createError } from '#imports';
import { contactSchema, type Contact } from '~~/shared/types/ContactSchema';
import { Resend } from 'resend';

export default defineEventHandler(async (event) => {

  const rawBody = await readBody<Contact>(event);
  const body = contactSchema.parse(rawBody);
  const { token, email, fullname, subject, message, phone } = body;

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Captcha token is required',
    });
  }

  const config = useRuntimeConfig();
  const turnstileSecret = config.turnstile.secretKey;

  if (!turnstileSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server error',
    });
  }

  const verifyResponse = await verifyTurnstileToken(token);

  if (!verifyResponse.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Captcha verification failed',
    });
  }

  const resendApiKey = process.env.NUXT_RESEND_API_KEY;

  if (!resendApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Resend API key is not configured',
    });
  }

  const emailHtml = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${fullname || ''}</p>
    <p><strong>Email:</strong> ${email || ''}</p>
    <p><strong>Phone:</strong> ${phone ?? 'N/A'}</p>
    <p><strong>Subject:</strong> ${subject || ''}</p>
    <h3>Message:</h3>
    <p>${message || ''}</p>
  `;

  try {
    const resend = new Resend(resendApiKey);

    const { error } = await resend.emails.send({
        from: 'noreply@riavzon.com',
        to: 'sergo998826@gmail.com', 
        subject: `(Portfolio) New contact inquiry: ${subject || 'No subject'}`,
        html: emailHtml,
        replyTo: email || '',
    });

    if (error) {
       console.error('Resend error:', error);
       throw createError({ statusCode: 500, statusMessage: 'Failed to send email via Resend' });
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Server error sending email:', errorMessage);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send email. Please try again later.',
    });
  }
});
