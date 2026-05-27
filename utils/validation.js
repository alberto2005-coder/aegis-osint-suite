class InputValidator {
  static validateUsername(username) {
    if (typeof username !== 'string') return false;
    // Allow alphanumeric characters, underscore, hyphen, and dot. Length 1 to 100.
    const usernameRegex = /^[a-zA-Z0-9_\-\.]{1,100}$/;
    return usernameRegex.test(username);
  }

  static validateDomain(domain) {
    if (typeof domain !== 'string') return false;
    // Simple FQDN check
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,11}$/;
    return domainRegex.test(domain);
  }

  static validateUrl(urlString) {
    if (typeof urlString !== 'string') return false;
    try {
      const parsed = new URL(urlString);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }
}

module.exports = InputValidator;
