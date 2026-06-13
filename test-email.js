require('dotenv').config();
const readline = require('readline');
const logger = require('./src/utils/logger');
const { sanitizeDomain } = require('./src/utils/helpers');
const apollo = require('./src/api/apollo');
const prospeo = require('./src/api/prospeo');
const snov = require('./src/api/snov');
const brevo = require('./src/api/brevo');
const axios = require('axios');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const TEST_EMAIL_RECIPIENT = process.env.TEST_EMAIL_RECIPIENT;

if (!TEST_EMAIL_RECIPIENT) {
  logger.error('TEST_EMAIL_RECIPIENT is missing in .env');
  process.exit(1);
}

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Modified version of brevo.sendEmail that redirects to a test inbox
 */
async function sendTestEmail(contact) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderName = process.env.SENDER_NAME || 'Outreach Pilot (Test Mode)';
  const senderEmail = process.env.SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    throw new Error('BREVO_API_KEY or SENDER_EMAIL is missing in .env');
  }

  const personalizedSubject = `[TEST] ${(process.env.EMAIL_SUBJECT || "Quick Question for {{companyName}}")
    .replace('{{companyName}}', contact.companyName)}`;

  // Original content with a debug header
  const htmlContent = `
    <div style="background: #f4f4f4; padding: 10px; border: 1px solid #ccc; margin-bottom: 20px;">
      <strong>TEST MODE DEBUG INFO:</strong><br>
      Originally intended for: ${contact.firstName} ${contact.lastName} (${contact.originalEmail})<br>
      Company: ${contact.companyName}<br>
      Title: ${contact.title}
    </div>
    <hr>
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
      to: [{ email: TEST_EMAIL_RECIPIENT, name: `Test Recipient (${contact.firstName})` }],
      subject: personalizedSubject,
      htmlContent: htmlContent
    }, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    logger.success(`Test email sent to ${TEST_EMAIL_RECIPIENT} (Original: ${contact.originalEmail})`);
  } catch (error) {
    logger.error(`Brevo Test API Error: ${error.response?.data?.message || error.message}`);
  }
}

async function runTestPipeline() {
  try {
    logger.stage('OutreachPilot: [TEST MODE] Automated Cold Outreach Pipeline');
    logger.warn(`ALL EMAILS WILL BE REDIRECTED TO: ${TEST_EMAIL_RECIPIENT}`);

    const rawInput = await question('Enter the seed company domain (e.g., apple.com): ');
    const seedDomain = sanitizeDomain(rawInput);

    if (!seedDomain) {
      logger.error('Seed domain is required.');
      process.exit(1);
    }

    // Stage 1: Apollo.io
    logger.stage('Stage 1: Finding lookalike companies (Apollo.io)');
    const lookalikeDomains = await apollo.findLookalikes(seedDomain);
    logger.success(`Found ${lookalikeDomains.length} lookalike companies.`);

    if (lookalikeDomains.length === 0) {
      logger.warn('No lookalike companies found.');
      process.exit(0);
    }

    // Stage 2: Prospeo API
    logger.stage('Stage 2: Identifying decision makers (Prospeo)');
    const decisionMakers = [];
    for (const domain of lookalikeDomains) {
      logger.info(`Searching for decision makers at ${domain}...`);
      const makers = await prospeo.getDecisionMakers(domain);
      decisionMakers.push(...makers);
    }
    logger.success(`Found ${decisionMakers.length} decision makers.`);

    if (decisionMakers.length === 0) {
      logger.warn('No decision makers found.');
      process.exit(0);
    }

    // Stage 3: Snov.io API
    logger.stage('Stage 3: Resolving email addresses (Snov.io)');
    const verifiedContacts = [];
    for (const maker of decisionMakers) {
      logger.info(`Resolving email for ${maker.firstName} ${maker.lastName} at ${maker.domain}...`);
      const contact = await snov.resolveEmail(maker);
      if (contact && contact.email) {
        // Store original email and override for testing
        contact.originalEmail = contact.email;
        verifiedContacts.push(contact);
      }
    }
    logger.success(`Resolved ${verifiedContacts.length} verified email addresses.`);

    if (verifiedContacts.length === 0) {
      logger.warn('No verified emails found.');
      process.exit(0);
    }

    // Summary
    logger.stage('Final Summary before [TEST] Outreach');
    console.table(verifiedContacts.map(c => ({
      Name: `${c.firstName} ${c.lastName}`,
      Company: c.companyName,
      Original_Email: c.originalEmail,
      Redirected_To: TEST_EMAIL_RECIPIENT
    })));

    const confirm = await question(`\nSend ${verifiedContacts.length} test emails to ${TEST_EMAIL_RECIPIENT}? (yes/no): `);
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      logger.warn('Test outreach cancelled.');
      process.exit(0);
    }

    // Stage 4: Redirected Send
    logger.stage('Stage 4: Sending test emails (Brevo Redirected)');
    for (const contact of verifiedContacts) {
      await sendTestEmail(contact);
    }

    logger.success(`Finished! All test emails sent to ${TEST_EMAIL_RECIPIENT}`);

  } catch (error) {
    logger.error(`Test pipeline failed: ${error.message}`);
  } finally {
    rl.close();
  }
}

runTestPipeline();
