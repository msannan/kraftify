// Centralized configuration for API and asset URLs
// This ensures all parts of the app use the correct backend URL

export const getApiBaseUrl = (): string => {
  // If NEXT_PUBLIC_API_URL is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // If running in browser, detect from current location
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If accessing via IP or domain (not localhost), use same host with port 5001
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:5001/api`;
    }
  }
  
  // Default to localhost for development
  return 'http://localhost:5001/api';
};

export const getSocketUrl = (): string => {
  // Get base URL (without /api)
  const baseUrl = getApiBaseUrl();
  return baseUrl.replace('/api', '');
};

export const getAssetUrl = (path: string): string => {
  if (!path) return '';
  
  // If already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Otherwise, prepend the API base URL
  const baseUrl = getApiBaseUrl().replace('/api', '');
  return `${baseUrl}${path}`;
};

