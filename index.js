require('dotenv').config();
const readline = require('readline');
const logger = require('./src/utils/logger');
const { sanitizeDomain } = require('./src/utils/helpers');
const apollo = require('./src/api/apollo');
const prospeo = require('./src/api/prospeo');
const snov = require('./src/api/snov');
const brevo = require('./src/api/brevo');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function runPipeline() {
  try {
    logger.stage('OutreachPilot: Automated Cold Outreach Pipeline');
    
    const seedDomain = await question('Enter the seed company domain (e.g., apple.com): ');
    if (!seedDomain) {
      logger.error('Seed domain is required.');
      process.exit(1);
    }

    // Stage 1: Apollo.io - Find lookalike companies
    logger.stage('Stage 1: Finding lookalike companies (Apollo.io)');
    const lookalikeDomains = await apollo.findLookalikes(seedDomain);
    logger.success(`Found ${lookalikeDomains.length} lookalike companies.`);

    if (lookalikeDomains.length === 0) {
      logger.warn('No lookalike companies found. Pipeline stopped.');
      process.exit(0);
    }

    // Stage 2: Prospeo API - Find decision makers
    logger.stage('Stage 2: Identifying decision makers (Prospeo)');
    const decisionMakers = [];
    for (const domain of lookalikeDomains) {
      logger.info(`Searching for decision makers at ${domain}...`);
      const makers = await prospeo.getDecisionMakers(domain);
      decisionMakers.push(...makers);
    }
    logger.success(`Found ${decisionMakers.length} decision makers.`);

    if (decisionMakers.length === 0) {
      logger.warn('No decision makers found. Pipeline stopped.');
      process.exit(0);
    }

    // Stage 3: Snov.io API - Resolve emails
    logger.stage('Stage 3: Resolving email addresses (Snov.io)');
    const verifiedContacts = [];
    for (const maker of decisionMakers) {
      logger.info(`Resolving email for ${maker.firstName} ${maker.lastName} at ${maker.domain}...`);
      const contact = await snov.resolveEmail(maker);
      if (contact && contact.email) {
        verifiedContacts.push(contact);
      }
    }
    logger.success(`Resolved ${verifiedContacts.length} verified email addresses.`);

    if (verifiedContacts.length === 0) {
      logger.warn('No verified emails found. Pipeline stopped.');
      process.exit(0);
    }

    // Summary and Confirmation
    logger.stage('Final Summary before Outreach');
    console.table(verifiedContacts.map(c => ({
      Name: `${c.firstName} ${c.lastName}`,
      Company: c.companyName,
      Email: c.email,
      Title: c.title
    })));

    const confirm = await question('\nDo you want to send personalized emails to these contacts? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      logger.warn('Outreach cancelled by user.');
      process.exit(0);
    }

    // Stage 4: Brevo API - Send emails
    logger.stage('Stage 4: Sending personalized emails (Brevo)');
    for (const contact of verifiedContacts) {
      logger.info(`Sending email to ${contact.email}...`);
      await brevo.sendEmail(contact);
    }

    logger.success('All outreach emails sent successfully!');
    
  } catch (error) {
    logger.error(`Pipeline failed: ${error.message}`);
  } finally {
    rl.close();
  }
}

runPipeline();
