import { URLValidationResult, ValidationRule, ValidationResult, FormValidation } from '@/types/security';

export interface TimeoutConfig {
  timeoutMs: number;
}

export function validateAndNormalizeURL(url: string): URLValidationResult {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      error: 'URL must be a non-empty string'
    };
  }

  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return {
      isValid: false,
      error: 'URL cannot be empty'
    };
  }

  try {
    let normalizedUrl = trimmedUrl;

    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const urlObj = new URL(normalizedUrl);

    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        isValid: false,
        error: 'URL must use HTTP or HTTPS protocol'
      };
    }

    if (!urlObj.hostname) {
      return {
        isValid: false,
        error: 'URL must have a valid hostname'
      };
    }

    if (urlObj.hostname === 'localhost' ||
        urlObj.hostname.startsWith('127.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname.startsWith('192.168.') ||
        urlObj.hostname.startsWith('172.')) {
      return {
        isValid: false,
        error: 'Cannot analyze local or private network URLs for security reasons'
      };
    }

    return {
      isValid: true,
      normalizedUrl: urlObj.toString()
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

export function isValidGitHubToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const trimmedToken = token.trim();

  if (trimmedToken.startsWith('ghp_') && trimmedToken.length === 40) {
    return true;
  }

  if (trimmedToken.startsWith('gho_') && trimmedToken.length === 40) {
    return true;
  }

  if (trimmedToken.startsWith('ghu_') && trimmedToken.length === 40) {
    return true;
  }

  if (trimmedToken.startsWith('ghs_') && trimmedToken.length === 40) {
    return true;
  }

  if (trimmedToken.startsWith('ghr_') && trimmedToken.length === 40) {
    return true;
  }

  return /^[a-zA-Z0-9]{40}$/.test(trimmedToken);
}

export function isValidRepositoryURL(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);

    if (urlObj.hostname !== 'github.com') {
      return false;
    }

    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);

    if (pathParts.length < 2) {
      return false;
    }

    const [owner, repo] = pathParts;

    if (!owner || !repo) {
      return false;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Additional validation functions for advanced features

export const validateForm = (data: Record<string, unknown>, rules: FormValidation): ValidationResult => {
  const errors: Record<string, string[]> = {};
  let isValid = true;

  Object.entries(rules).forEach(([field, fieldRules]) => {
    const value = data[field];
    const fieldErrors: string[] = [];

    fieldRules.forEach(rule => {
      if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
        fieldErrors.push(`${field} is required`);
      }

      if (value && rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
        fieldErrors.push(`${field} must be at least ${rule.minLength} characters`);
      }

      if (value && rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        fieldErrors.push(`${field} must be no more than ${rule.maxLength} characters`);
      }

      if (value && rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        fieldErrors.push(`${field} format is invalid`);
      }

      if (value && rule.custom) {
        const customResult = rule.custom(value);
        if (typeof customResult === 'string') {
          fieldErrors.push(customResult);
        } else if (!customResult) {
          fieldErrors.push(`${field} is invalid`);
        }
      }
    });

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
      isValid = false;
    }
  });

  return { isValid, errors };
};

export const validateUrl = (url: string): ValidationResult => {
  const errors: Record<string, string[]> = {};
  let isValid = true;

  if (!url || !url.trim()) {
    errors.url = ['URL is required'];
    isValid = false;
  } else {
    const validation = validateAndNormalizeURL(url);
    if (!validation.isValid) {
      errors.url = [validation.error || 'Invalid URL'];
      isValid = false;
    }
  }

  return { isValid, errors };
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateWebhookUrl = (url: string): ValidationResult => {
  const errors: Record<string, string[]> = {};
  let isValid = true;

  const urlValidation = validateUrl(url);
  if (!urlValidation.isValid) {
    return urlValidation;
  }

  try {
    const urlObj = new URL(url);

    if (urlObj.protocol !== 'https:') {
      errors.url = ['Webhook URL must use HTTPS'];
      isValid = false;
    }

    if (urlObj.hostname === 'localhost' || urlObj.hostname.startsWith('192.168.') || urlObj.hostname.startsWith('10.')) {
      errors.url = ['Webhook URL must be publicly accessible'];
      isValid = false;
    }
  } catch {
    errors.url = ['Invalid webhook URL format'];
    isValid = false;
  }

  return { isValid, errors };
};

export const validateSlackWebhook = (url: string): ValidationResult => {
  const errors: Record<string, string[]> = {};
  let isValid = true;

  if (!url || !url.trim()) {
    errors.url = ['Slack webhook URL is required'];
    return { isValid: false, errors };
  }

  if (!url.includes('hooks.slack.com')) {
    errors.url = ['Must be a valid Slack webhook URL'];
    isValid = false;
  }

  const baseValidation = validateWebhookUrl(url);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  return { isValid, errors };
};

export const validateGitHubToken = (token: string): ValidationResult => {
  const errors: Record<string, string[]> = {};
  let isValid = true;

  if (!token || !token.trim()) {
    errors.token = ['GitHub token is required'];
    return { isValid: false, errors };
  }

  if (!isValidGitHubToken(token)) {
    errors.token = ['Invalid GitHub token format'];
    isValid = false;
  }

  return { isValid, errors };
};

export const validateCSPPolicy = (policy: string): ValidationResult => {
  const errors: Record<string, string[]> = {};
  let isValid = true;

  if (!policy || !policy.trim()) {
    errors.policy = ['CSP policy cannot be empty'];
    return { isValid: false, errors };
  }

  const directives = policy.split(';').map(d => d.trim()).filter(d => d);

  if (directives.length === 0) {
    errors.policy = ['CSP policy must contain at least one directive'];
    isValid = false;
  }

  const hasDefaultSrc = directives.some(d => d.startsWith('default-src'));
  const hasSpecificSrc = directives.some(d =>
    d.startsWith('script-src') || d.startsWith('style-src') || d.startsWith('img-src')
  );

  if (!hasDefaultSrc && !hasSpecificSrc) {
    errors.policy = ['CSP policy should include default-src or specific source directives'];
    isValid = false;
  }

  // Check for potentially unsafe directives
  const warnings: string[] = [];
  if (policy.includes("'unsafe-inline'")) {
    warnings.push("Policy contains 'unsafe-inline' which reduces XSS protection");
  }
  if (policy.includes("'unsafe-eval'")) {
    warnings.push("Policy contains 'unsafe-eval' which is a security risk");
  }
  if (policy.includes('*')) {
    warnings.push("Policy contains wildcard (*) which reduces security");
  }

  if (warnings.length > 0) {
    errors.warnings = warnings;
  }

  return { isValid, errors };
};

export const validateHSTSConfig = (maxAge: number, includeSubDomains: boolean, preload: boolean): ValidationResult => {
  const errors: Record<string, string[]> = {};
  let isValid = true;

  if (maxAge < 0) {
    errors.maxAge = ['Max age must be a positive number'];
    isValid = false;
  }

  if (maxAge < 86400) { // 1 day
    errors.maxAge = ['Max age should be at least 86400 seconds (1 day)'];
    isValid = false;
  }

  if (preload && (!includeSubDomains || maxAge < 31536000)) {
    errors.preload = ['Preload requires includeSubDomains and max-age >= 31536000 (1 year)'];
    isValid = false;
  }

  return { isValid, errors };
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const sanitizeCSPPolicy = (policy: string): string => {
  // Remove dangerous characters and normalize
  return policy
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

export const sanitizeHeaderValue = (value: string): string => {
  // Remove control characters and normalize
  return value
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
    .trim();
};

export const isValidDomain = (domain: string): boolean => {
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain) && domain.length <= 253;
};

export const isValidIPAddress = (ip: string): boolean => {
  // IPv4 regex
  const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

export const validateBatchUrls = (urls: string[]): { valid: string[]; invalid: Array<{ url: string; error: string }> } => {
  const valid: string[] = [];
  const invalid: Array<{ url: string; error: string }> = [];

  urls.forEach(url => {
    const validation = validateUrl(url);
    if (validation.isValid) {
      valid.push(url);
    } else {
      invalid.push({
        url,
        error: validation.errors.url?.[0] || 'Invalid URL'
      });
    }
  });

  return { valid, invalid };
};

// Common validation rules
export const commonValidationRules = {
  url: [
    { required: true },
    { custom: (value: string) => validateUrl(value).isValid || 'Invalid URL format' }
  ] as ValidationRule[],

  email: [
    { required: true },
    { custom: (value: string) => validateEmail(value) || 'Invalid email format' }
  ] as ValidationRule[],

  webhookUrl: [
    { required: true },
    { custom: (value: string) => validateWebhookUrl(value).isValid || 'Invalid webhook URL' }
  ] as ValidationRule[],

  slackWebhook: [
    { required: true },
    { custom: (value: string) => validateSlackWebhook(value).isValid || 'Invalid Slack webhook URL' }
  ] as ValidationRule[],

  githubToken: [
    { required: true },
    { custom: (value: string) => validateGitHubToken(value).isValid || 'Invalid GitHub token' }
  ] as ValidationRule[],

  cspPolicy: [
    { required: true },
    { minLength: 10 },
    { custom: (value: string) => validateCSPPolicy(value).isValid || 'Invalid CSP policy' }
  ] as ValidationRule[]
};