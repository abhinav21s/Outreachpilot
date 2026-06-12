/**
 * Sanitizes a domain input by removing protocols, www, and trailing slashes.
 * e.g., "https://www.apple.com/" -> "apple.com"
 */
function sanitizeDomain(input) {
  if (!input) return '';
  
  let domain = input.trim().toLowerCase();
  
  // Remove protocol
  domain = domain.replace(/^(https?:\/\/)/, '');
  
  // Remove www.
  domain = domain.replace(/^www\./, '');
  
  // Remove trailing slash and anything after it
  domain = domain.split('/')[0];
  
  return domain;
}

module.exports = { sanitizeDomain };
