const axios = require('axios');
const logger = require('../utils/logger');

async function getDecisionMakers(domain) {
  const apiKey = process.env.PROSPEO_API_KEY;
  if (!apiKey) {
    throw new Error('PROSPEO_API_KEY is missing in .env');
  }

  try {
    const response = await axios.post('https://api.prospeo.io/search-person', {
      filters: {
        company_domain: [domain],
        title: ['CEO', 'CTO', 'COO', 'CFO', 'CMO', 'VP', 'Vice President', 'Founder', 'Co-Founder', 'Director']
      },
      page: 1
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-KEY': apiKey
      }
    });

    const results = response.data.response?.results || [];
    const decisionMakers = [];

    for (const lead of results) {
      decisionMakers.push({
        firstName: lead.first_name,
        lastName: lead.last_name,
        title: lead.title,
        linkedin: lead.linkedin_url || lead.linkedin,
        domain: domain,
        companyName: lead.company?.name || domain
      });
    }

    return decisionMakers.slice(0, 3);

  } catch (error) {
    logger.error(`Prospeo API Error for ${domain}: ${error.response?.data?.error || error.message}`);
    return [];
  }
}

module.exports = { getDecisionMakers };
