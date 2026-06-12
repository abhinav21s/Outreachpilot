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

    // Snov.io V1 Get Email by Name API (Synchronous for single lookup)
    const response = await axios.get('https://api.snov.io/v1/get-emails-from-names', {
      params: {
        firstName: maker.firstName,
        lastName: maker.lastName,
        domain: maker.domain
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Snov.io returns an array of emails
    const data = response.data;
    if (data && data.emails && data.emails.length > 0) {
      // Pick the first email found
      const bestEmail = data.emails[0];
      
      // Snov.io usually provides a status
      if (bestEmail.status === 'invalid') {
        logger.warn(`Invalid email found for ${maker.firstName} ${maker.lastName}. Skipping...`);
        return null;
      }

      return {
        ...maker,
        email: bestEmail.email,
        verificationStatus: bestEmail.status
      };
    }

    return null;

  } catch (error) {
    // Snov.io returns 404 or empty if not found
    if (error.response?.status === 404) {
        return null;
    }
    logger.error(`Snov.io API Error for ${maker.firstName} ${maker.lastName}: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

module.exports = { resolveEmail };
