import { URLValidationResult } from '@/types/security';

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