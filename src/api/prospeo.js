const axios = require('axios');
const logger = require('../utils/logger');

async function getDecisionMakers(domain, retryCount = 0) {
  const apiKey = process.env.PROSPEO_API_KEY;
  if (!apiKey) {
    throw new Error('PROSPEO_API_KEY is missing in .env');
  }

  try {
    const response = await axios.post('https://api.prospeo.io/search-person', {
      filters: {
        person_search: domain,
        person_seniority: {
          include: ['C-Level', 'VP', 'Director']
        }
      },
      page: 1
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-KEY': apiKey
      }
    });

    const results = response.data.response?.results || [];
    logger.info(`Prospeo found ${results.length} results for ${domain} with seniority filter.`);
    
    // Fallback: If no results with seniority, try searching just by domain
    if (results.length === 0) {
        const fallbackResponse = await axios.post('https://api.prospeo.io/search-person', {
            filters: {
                person_search: domain
            },
            page: 1
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-KEY': apiKey
            }
        });
        const fallbackResults = fallbackResponse.data.response?.results || [];
        logger.info(`Fallback: Prospeo found ${fallbackResults.length} raw results for ${domain} without seniority filter.`);
        results.push(...fallbackResults);
    }

    const decisionMakers = [];
    const targetTitles = ['CEO', 'CTO', 'COO', 'CFO', 'CMO', 'VP', 'Vice President', 'Founder', 'Director', 'Head of', 'Manager'];

    for (const lead of results) {
      const title = lead.title || '';
      const isDecisionMaker = targetTitles.some(t => title.toLowerCase().includes(t.toLowerCase()));

      if (isDecisionMaker) {
        decisionMakers.push({
          firstName: lead.first_name,
          lastName: lead.last_name,
          title: lead.title,
          linkedin: lead.linkedin_url || lead.linkedin,
          domain: domain,
          companyName: lead.company?.name || domain
        });
      }
    }

    // Deduplicate and return top 3
    const uniqueMakers = Array.from(new Set(decisionMakers.map(m => `${m.firstName} ${m.lastName}`)))
        .map(name => decisionMakers.find(m => `${m.firstName} ${m.lastName}` === name));

    return uniqueMakers.slice(0, 3);

  } catch (error) {
    const errorBody = error.response?.data || {};
    
    // Handle Rate Limit with Exponential Backoff
    if (error.response?.status === 429 || errorBody.error_code === 'Rate limit exceeded') {
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 2000;
        logger.warn(`Rate limit hit for ${domain}. Retrying in ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return getDecisionMakers(domain, retryCount + 1);
      }
    }

    const errorDetail = errorBody.message || errorBody.error || error.message;
    logger.error(`Prospeo API Error for ${domain}: ${JSON.stringify(errorDetail)}`);
    if (error.response?.data) {
        logger.info(`Full Error Body: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

module.exports = { getDecisionMakers };
