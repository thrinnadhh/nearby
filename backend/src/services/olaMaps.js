import https from 'https';
import logger from '../utils/logger.js';

const OLA_MAPS_API_KEY = process.env.OLA_MAPS_API_KEY;

if (!OLA_MAPS_API_KEY) {
  throw new Error('OLA_MAPS_API_KEY is not configured');
}

const BASE_URL = 'https://api.olamaps.io';

/**
 * Make HTTP request to Ola Maps API.
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
        api_key: OLA_MAPS_API_KEY,
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
        'X-API-Key': OLA_MAPS_API_KEY,
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
            const error = new Error(responseData.message || 'Ola Maps API error');
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
    const response = await request('GET', '/v1/forward_geocode', {
      query: address,
      ...(location.lat && location.lng && {
        location: `${location.lat},${location.lng}`,
      }),
    });

    logger.debug('Geocoded address via Ola Maps', { address });
    return response;
  } catch (err) {
    logger.error('Failed to geocode address via Ola Maps', {
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
    const response = await request('GET', '/v1/reverse_geocode', {
      latlng: `${lat},${lng}`,
    });

    logger.debug('Reverse geocoded coordinates via Ola Maps', { lat, lng });
    return response;
  } catch (err) {
    logger.error('Failed to reverse geocode via Ola Maps', {
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
    const originString = origins.map(o => `${o.lat},${o.lng}`).join('|');
    const destString = destinations.map(d => `${d.lat},${d.lng}`).join('|');

    const response = await request('GET', '/v1/matrix', {
      origins: originString,
      destinations: destString,
    });

    logger.debug('Fetched distance matrix via Ola Maps', {
      originCount: origins.length,
      destCount: destinations.length,
    });
    return response;
  } catch (err) {
    logger.error('Failed to get distance matrix via Ola Maps', {
      error: err.message,
    });
    throw err;
  }
}

/**
 * Get route between two locations.
 * @param {Object} origin - {lat, lng}
 * @param {Object} destination - {lat, lng}
 * @param {Object} options - Optional {mode: 'bike|car|foot'}
 * @returns {Promise<Object>} Route result
 */
async function getRoute(origin, destination, options = {}) {
  try {
    const response = await request('GET', '/v1/directions', {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode: options.mode || 'bike',
    });

    logger.debug('Fetched route via Ola Maps', {
      mode: options.mode || 'bike',
    });
    return response;
  } catch (err) {
    logger.error('Failed to get route via Ola Maps', {
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
    return result?.rows?.[0]?.elements?.[0]?.duration?.value ?? null;
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
