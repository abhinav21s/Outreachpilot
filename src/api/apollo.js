const axios = require('axios');
const logger = require('../utils/logger');

async function findLookalikes(seedDomain) {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    throw new Error('APOLLO_API_KEY is missing in .env');
  }

  try {
    // 1. Get seed company info to identify industry and size
    const seedInfoResponse = await axios.post('https://api.apollo.io/v1/organizations/search', {
      q_organization_domains: seedDomain,
      page: 1
    }, {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      }
    });

    const seedOrg = seedInfoResponse.data.organizations?.[0];
    if (!seedOrg) {
      logger.warn(`Could not find seed company info for ${seedDomain}. Searching generally...`);
      return [];
    }

    const industry = seedOrg.industry;
    const employeeRange = seedOrg.estimated_num_employees;
    
    logger.info(`Seed Company: ${seedOrg.name} | Industry: ${industry} | Size: ${employeeRange}`);

    // 2. Search for similar companies
    // Limit keywords to 100 to stay safely under Apollo's 150-term limit
    const keywords = (seedOrg.keywords || []).slice(0, 100);

    const lookalikeResponse = await axios.post('https://api.apollo.io/v1/organizations/search', {
      organization_industries: industry ? [industry] : [],
      q_organization_keyword_tags: keywords,
      page: 1,
      per_page: 5 
    }, {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      }
    });

    const organizations = lookalikeResponse.data.organizations || [];
    // Filter out the seed domain itself and return domains
    return organizations
      .map(org => org.primary_domain)
      .filter(domain => domain && domain !== seedDomain);

  } catch (error) {
    logger.error(`Apollo API Error: ${error.response?.data?.error || error.message}`);
    return [];
  }
}

module.exports = { findLookalikes };
