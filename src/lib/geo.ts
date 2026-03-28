/**
 * High-Accuracy Geolocation Service
 * 
 * This module gets precise GPS coordinates (meter-level accuracy)
 * instead of falling back to IP/cell tower location.
 * 
 * REQUIREMENTS:
 * 1. HTTPS is required for high-accuracy GPS
 * 2. User must grant location permission
 * 3. Device must have GPS hardware
 */

export interface LocationResult {
  lat: number;
  lng: number;
  accuracy: number;  // GPS accuracy in meters
  method: 'gps' | 'ip';
}

interface HighAccuracyOptions {
  maxAccuracy?: number;      // Accept position when accuracy <= this (default: 100m)
  timeout?: number;          // Max wait time in ms (default: 25000)
  onProgress?: (data: { accuracy: number; status: 'improving' | 'good' }) => void;
}

/**
 * getHighAccuracyLocation - waits for precise GPS lock
 * Uses watchPosition to continuously improve accuracy until:
 * - Accuracy reaches target (default 100m)
 * - Timeout expires (returns best available)
 */
export async function getHighAccuracyLocation(
  options: HighAccuracyOptions = {}
): Promise<LocationResult | null> {
  const {
    maxAccuracy = 100,
    timeout = 25000,
    onProgress
  } = options;

  if (!navigator.geolocation) {
    console.warn('[GPS] Geolocation not supported');
    return getIpFallback();
  }

  return new Promise((resolve) => {
    let bestPosition: GeolocationPosition | null = null;
    let watchId: number;
    let resolved = false;

    const cleanup = () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };

    const resolveWith = (result: LocationResult | null) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result);
    };

    // Timeout - use best position or fall back to IP
    const timer = setTimeout(async () => {
      if (bestPosition) {
        console.log(`[GPS] Timeout - using best: ${bestPosition.coords.accuracy.toFixed(0)}m`);
        resolveWith({
          lat: bestPosition.coords.latitude,
          lng: bestPosition.coords.longitude,
          accuracy: bestPosition.coords.accuracy,
          method: 'gps'
        });
      } else {
        console.warn('[GPS] Timeout with no position - trying IP fallback');
        resolveWith(await getIpFallback());
      }
    }, timeout);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        console.log(`[GPS] Reading: ${accuracy.toFixed(0)}m accuracy`);

        // Report progress
        if (onProgress) {
          onProgress({
            accuracy,
            status: accuracy <= maxAccuracy ? 'good' : 'improving'
          });
        }

        // Keep best (most accurate) position
        if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }

        // If accuracy is good enough, resolve immediately
        if (accuracy <= maxAccuracy) {
          clearTimeout(timer);
          console.log(`[GPS] ✓ Locked: ${accuracy.toFixed(0)}m accuracy`);
          resolveWith({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy,
            method: 'gps'
          });
        }
      },
      async (error) => {
        clearTimeout(timer);
        console.warn('[GPS] Error:', error.message);

        // If we have a best position, use it
        if (bestPosition) {
          resolveWith({
            lat: bestPosition.coords.latitude,
            lng: bestPosition.coords.longitude,
            accuracy: bestPosition.coords.accuracy,
            method: 'gps'
          });
        } else {
          resolveWith(await getIpFallback());
        }
      },
      {
        enableHighAccuracy: true,  // CRITICAL: Forces GPS chip
        maximumAge: 0,             // No cached positions
        timeout: timeout           // Per-reading timeout
      }
    );
  });
}

/**
 * getGpsLocation - backwards compatible wrapper
 * Now uses high-accuracy mode internally
 */
export async function getGpsLocation(): Promise<LocationResult | null> {
  return getHighAccuracyLocation({ maxAccuracy: 100, timeout: 20000 });
}

/**
 * IP-based fallback (city-level accuracy ~5-50km)
 */
async function getIpFallback(): Promise<LocationResult | null> {
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json', {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.latitude && data.longitude) {
      console.log('[GPS] Using IP fallback');
      return {
        lat: parseFloat(data.latitude),
        lng: parseFloat(data.longitude),
        accuracy: 50000, // IP accuracy is ~50km
        method: 'ip'
      };
    }
  } catch (e) {
    console.warn('[GPS] IP fallback failed:', e);
  }
  return null;
}

/**
 * Quick location check (for status display, uses cache)
 */
export async function getQuickLocation(): Promise<LocationResult | null> {
  if (!navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        method: 'gps'
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );
  });
}

/**
 * checkGpsAvailability – returns the best available location method.
 * 'gps'    → precise GPS works
 * 'ip'     → only IP geolocation available
 * 'none'   → both failed
 */
export async function checkGpsAvailability(): Promise<'gps' | 'ip' | 'none'> {
  const result = await getQuickLocation();
  if (result && result.method === 'gps' && result.accuracy < 1000) return 'gps';
  
  // Try IP as backup test
  const ipResult = await getIpFallback();
  if (ipResult) return 'ip';
  
  return 'none';
}
