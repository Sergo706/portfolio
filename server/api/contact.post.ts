import { defineEventHandler, readBody, createError } from '#imports';
import { contactSchema, type Contact } from '~~/shared/types/ContactSchema';

export default defineEventHandler(async (event) => {

  console.log('--- Contact API Route Triggered ---');
  const rawBody = await readBody<Contact>(event);
  console.log('Received body:', rawBody);
  const body = contactSchema.safeParse(rawBody);

  if (!body.success) {
      console.error('Validation failed:', body.error);
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid form data',
      });
    }

  const { token, email, fullname, subject, message, phone } = body.data;

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Captcha token is required',
    });
  }

  const config = useRuntimeConfig(event);
  const turnstileSecret = config.turnstile.secretKey;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const resendApiKey = config.privateResendApiKey;

  if (!turnstileSecret) {
    console.error('Missing Turnstile Secret');
    throw createError({
      statusCode: 500,
      statusMessage: 'Server error',
    });
  }

  if (!resendApiKey) {
    console.error('Missing Resend API Key');
    throw createError({
      statusCode: 500,
      statusMessage: 'Resend API key is not configured',
    });
  }

  const verifyResponse = await verifyTurnstileToken(token, event);

  if (!verifyResponse.success) {
    console.error('Captcha verification failed');
    throw createError({
      statusCode: 400,
      statusMessage: 'Captcha verification failed',
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
  console.log('Attempting to send email via Resend...');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${String(resendApiKey)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@riavzon.com',
        to: 'sergo998826@gmail.com',
        subject: `(Portfolio) New contact inquiry: ${subject || 'No subject'}`,
        html: emailHtml,
        reply_to: email || '',
      }),
    });

    const data = await response.json() as { id?: string; error?: unknown };

    if (!response.ok || data.error) {
      console.error('Resend error:', data.error);
      throw createError({ 
        statusCode: response.status, 
        statusMessage: 'Failed to send email' 
      });
    }

    console.log('Email sent successfully! ID:', data.id);
    return { success: true };
  } catch (err: unknown) {
    console.error('FATAL SERVER ERROR IN CONTACT API:', err);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send email. Please try again later.',
    });
  }
});
