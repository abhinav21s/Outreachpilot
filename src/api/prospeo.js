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
        company: {
          websites: {
            include: [domain]
          }
        },
        person_job_title: {
          include: ['CEO', 'CTO', 'COO', 'CFO', 'CMO', 'VP', 'Vice President', 'Founder', 'Co-Founder', 'Director']
        }
      },
      page: 1
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-KEY': apiKey
      }
    });

    const results = response.data.results || [];
    const decisionMakers = [];

    for (const item of results) {
      const lead = item.person;
      if (!lead) continue;

      decisionMakers.push({
        firstName: lead.first_name,
        lastName: lead.last_name,
        title: lead.current_job_title || lead.title,
        linkedin: lead.linkedin_url || lead.linkedin,
        domain: domain,
        companyName: item.company?.name || domain
      });
    }

    return decisionMakers.slice(0, 3);

  } catch (error) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.filter_error || errorData?.error_message || errorData?.error_code || error.message;
    
    // If we get an "error: true" but it's just a boolean, we want the specific error code/message
    const finalError = (errorMessage === true && errorData?.error_code) ? errorData.error_code : errorMessage;
    
    logger.error(`Prospeo API Error for ${domain}: ${finalError}`);
    return [];
  }
}

module.exports = { getDecisionMakers };
