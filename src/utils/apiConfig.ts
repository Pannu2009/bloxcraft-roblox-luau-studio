// API Configuration for BloxCraft AI
// When running in a standard web browser, relative URLs like '/api/...' are used.
// When running inside Android APK (Capacitor WebView), requests are routed to the hosted backend.

const HOSTED_BACKEND_URL = 'https://ais-dev-ohx7oc6cyz6esxotctmk2y-447732698899.us-east1.run.app';

export const getApiUrl = (endpoint: string): string => {
  if (typeof window !== 'undefined') {
    const isCapacitor =
      (window as any).Capacitor !== undefined ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));

    if (isCapacitor) {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return `${HOSTED_BACKEND_URL}${cleanEndpoint}`;
    }
  }
  return endpoint;
};
