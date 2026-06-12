const axios = require('axios');
const logger = require('../utils/logger');

async function sendEmail(contact) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderName = process.env.SENDER_NAME || 'Outreach Pilot';
  const senderEmail = process.env.SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    throw new Error('BREVO_API_KEY or SENDER_EMAIL is missing in .env');
  }

  const personalizedSubject = (process.env.EMAIL_SUBJECT || "Quick Question for {{companyName}}")
    .replace('{{companyName}}', contact.companyName);

  const htmlContent = `
    <html>
      <body>
        <p>Hi ${contact.firstName},</p>
        <p>I hope you're having a great week at <strong>${contact.companyName}</strong>.</p>
        <p>I'm reaching out because I've been following what you're building, and I wanted to introduce myself. I've built a new automated pipeline tool that helps companies like yours streamline their outreach processes.</p>
        <p>Given your role as ${contact.title}, I thought you might be interested in a quick chat about how this could save your team time.</p>
        <p>Best regards,<br>${senderName}</p>
      </body>
    </html>
  `;

  try {
    await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: contact.email, name: `${contact.firstName} ${contact.lastName}` }],
      subject: personalizedSubject,
      htmlContent: htmlContent
    }, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    logger.success(`Email sent successfully to ${contact.email}`);
  } catch (error) {
    logger.error(`Brevo API Error for ${contact.email}: ${error.response?.data?.message || error.message}`);
  }
}

module.exports = { sendEmail };
