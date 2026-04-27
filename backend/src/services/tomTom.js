import https from 'https';
import logger from '../utils/logger.js';

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

if (!TOMTOM_API_KEY) {
  throw new Error('TOMTOM_API_KEY is not configured');
}

const BASE_URL = 'https://api.tomtom.com';

/**
 * Make HTTP request to Tom Tom API.
 * @private
 * @param {string} method - HTTP method
 * @param {string} path - API endpoint path
 * @param {Object} data - Request body or query params
 * @returns {Promise<Object>} API response
 */
async function request(method, path, data = {}) {
  return new Promise((resolve, reject) => {
    let fullPath = path;

    if (method === 'GET') {
      const params = new URLSearchParams({
        ...data,
        key: TOMTOM_API_KEY,
      }).toString();
      fullPath = `${path}?${params}`;
    }

    const url = new URL(`${BASE_URL}${fullPath}`);
    const body = method !== 'GET' ? JSON.stringify(data) : '';

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        try {
          const responseData = JSON.parse(responseBody);
          if (res.statusCode >= 400) {
            const error = new Error(responseData.message || 'Tom Tom API error');
            error.statusCode = res.statusCode;
            error.response = responseData;
            reject(error);
          } else {
            resolve(responseData);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

/**
 * Get geocoding for an address.
 * @param {string} address - Address string
 * @param {Object} location - Optional location bias { lat, lng }
 * @returns {Promise<Object>} Geocoding result
 */
async function geocode(address, location = {}) {
  try {
    const response = await request('GET', `/search/2/geocode/${encodeURIComponent(address)}.json`, {
      ...(location.lat && location.lng && {
        lat: location.lat,
        lon: location.lng,
      }),
    });

    logger.debug('Geocoded address via Tom Tom', { address });
    return response;
  } catch (err) {
    logger.error('Failed to geocode address via Tom Tom', {
      error: err.message,
      address,
    });
    throw err;
  }
}

/**
 * Get reverse geocoding for coordinates.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Reverse geocoding result
 */
async function reverseGeocode(lat, lng) {
  try {
    const response = await request('GET', `/search/2/reverseGeocode/${lat},${lng}.json`, {});

    logger.debug('Reverse geocoded coordinates via Tom Tom', { lat, lng });
    return response;
  } catch (err) {
    logger.error('Failed to reverse geocode via Tom Tom', {
      error: err.message,
      lat,
      lng,
    });
    throw err;
  }
}

/**
 * Get distance matrix between multiple locations.
 * @param {Array<Object>} origins - Array of {lat, lng}
 * @param {Array<Object>} destinations - Array of {lat, lng}
 * @returns {Promise<Object>} Distance matrix result
 */
async function getDistanceMatrix(origins, destinations) {
  try {
    const originString = origins.map(o => `${o.lng},${o.lat}`).join(':');
    const destString = destinations.map(d => `${d.lng},${d.lat}`).join(':');

    const response = await request('GET', '/routing/1/matrix/json', {
      origins: `${originString}`,
      destinations: destString,
    });

    logger.debug('Fetched distance matrix via Tom Tom', {
      originCount: origins.length,
      destCount: destinations.length,
    });
    return response;
  } catch (err) {
    logger.error('Failed to get distance matrix via Tom Tom', {
      error: err.message,
    });
    throw err;
  }
}

/**
 * Get route between two locations.
 * @param {Object} origin - {lat, lng}
 * @param {Object} destination - {lat, lng}
 * @param {Object} options - Optional {mode: 'bike|car|pedestrian'}
 * @returns {Promise<Object>} Route result
 */
async function getRoute(origin, destination, options = {}) {
  try {
    const mode = options.mode || 'car';
    const modeMap = { bike: 'bicycle', car: 'car', foot: 'pedestrian' };
    const tomTomMode = modeMap[mode] || 'car';

    const response = await request('GET', `/routing/1/calculateRoute/${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json`, {
      travelMode: tomTomMode,
    });

    logger.debug('Fetched route via Tom Tom', { mode: tomTomMode });
    return response;
  } catch (err) {
    logger.error('Failed to get route via Tom Tom', {
      error: err.message,
    });
    throw err;
  }
}

/**
 * Get ETA in seconds between two coordinates using the distance matrix API.
 * Returns null on any failure — callers treat ETA as best-effort.
 * @param {number} originLat
 * @param {number} originLng
 * @param {number} destLat
 * @param {number} destLng
 * @returns {Promise<number|null>} Duration in seconds, or null if unavailable
 */
async function getETA(originLat, originLng, destLat, destLng) {
  try {
    const result = await getDistanceMatrix(
      [{ lat: originLat, lng: originLng }],
      [{ lat: destLat, lng: destLng }]
    );
    return result?.matrix?.[0]?.[0]?.response?.routeSummary?.travelTimeInSeconds ?? null;
  } catch (err) {
    logger.warn('getETA failed', { error: err.message });
    return null;
  }
}

export {
  geocode,
  reverseGeocode,
  getDistanceMatrix,
  getRoute,
  getETA,
};
