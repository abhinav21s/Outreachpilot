const axios = require('axios');
const logger = require('../utils/logger');

let accessToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  const clientId = process.env.SNOV_CLIENT_ID;
  const clientSecret = process.env.SNOV_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SNOV_CLIENT_ID or SNOV_CLIENT_SECRET is missing in .env');
  }

  // Check if token is still valid (with 1-minute buffer)
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  try {
    const response = await axios.post('https://api.snov.io/v1/oauth/access_token', {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    });

    accessToken = response.data.access_token;
    // Token usually lasts 3600 seconds
    tokenExpiry = Date.now() + (response.data.expires_in || 3600) * 1000;
    return accessToken;
  } catch (error) {
    logger.error(`Snov.io Auth Error: ${error.response?.data?.error_description || error.message}`);
    throw error;
  }
}

async function resolveEmail(maker) {
  try {
    const token = await getAccessToken();

    // Snov.io V1 Get Email by Name API
    const response = await axios.post('https://api.snov.io/v1/get-emails-from-names', {
      firstName: maker.firstName,
      lastName: maker.lastName,
      domain: maker.domain
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;

    // Check if the search is complete and contains email objects
    if (data && data.success && data.data) {
        
      // Handle the case where emails are found
      if (Array.isArray(data.data.emails)) {
        // Find the first valid email object in the array
        const validEmailObject = data.data.emails.find(e => typeof e === 'object' && e.email);
        
        if (validEmailObject) {
          return {
            ...maker,
            email: validEmailObject.email,
            verificationStatus: validEmailObject.emailStatus || 'unknown'
          };
        }
      }
      
      // Fallback: If Snov.io says search is in progress or completed but no specific email object was picked up, 
      // sometimes it provides an email property directly in data.data or similar.
      // Or if it's "search in Progress", we might want to try another endpoint or just wait.
      // But for a CLI, we prefer immediate results.
    }

    // Try a second method if the first one fails: Get Emails by Domain
    // This is more aggressive but can help if the name-specific one fails.
    try {
        const domainResponse = await axios.get('https://api.snov.io/v1/get-domain-emails-with-info', {
            params: {
                domain: maker.domain,
                type: 'all',
                limit: 100
            },
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const domainData = domainResponse.data;
        if (domainData && domainData.emails) {
            const found = domainData.emails.find(e => 
                e.firstName?.toLowerCase() === maker.firstName?.toLowerCase() && 
                e.lastName?.toLowerCase() === maker.lastName?.toLowerCase()
            );
            
            if (found) {
                return {
                    ...maker,
                    email: found.email,
                    verificationStatus: found.status || 'unknown'
                };
            }
        }
    } catch (e) {
        // Ignore domain search errors, we already tried our best
    }

    return null;

  } catch (error) {
    if (error.response?.status === 403) {
      logger.error(`Snov.io 403 Forbidden: Check credits or API permissions.`);
    } else if (error.response?.status === 404) {
      return null;
    } else {
      logger.error(`Snov.io API Error for ${maker.firstName} ${maker.lastName}: ${error.response?.data?.message || error.message}`);
    }
    return null;
  }
}

module.exports = { resolveEmail };
