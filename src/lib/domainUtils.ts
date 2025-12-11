/**
 * Normalizes a domain by:
 * - Converting to lowercase
 * - Removing protocol (http://, https://)
 * - Removing path and query parameters
 * - Keeping only the hostname
 */
export function normalizeDomain(domain: string): string {
  let normalized = domain.toLowerCase().trim();
  
  // Remove protocol
  normalized = normalized.replace(/^https?:\/\//, '');
  
  // Remove path, query, and fragment
  normalized = normalized.split('/')[0];
  normalized = normalized.split('?')[0];
  normalized = normalized.split('#')[0];
  
  // Remove port if present
  normalized = normalized.split(':')[0];
  
  // Remove www. prefix (optional, but common)
  normalized = normalized.replace(/^www\./, '');
  
  return normalized;
}

