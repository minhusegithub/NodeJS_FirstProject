/**
 * Haversine formula - Calculate distance between two GPS coordinates
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lon1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lon2 - Longitude of point 2 (degrees)
 * @returns {number} Distance in kilometers
 */
export function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Estimate transfer cost based on distance
 * @param {number} distanceKm - Distance in km
 * @param {object} options - Cost parameters
 * @param {number} options.baseCost - Base cost in VND (default: 50000)
 * @param {number} options.costPerKm - Cost per km in VND (default: 3000)
 * @returns {number} Estimated cost in VND
 */
export function estimateTransferCost(distanceKm, options = {}) {
    const { baseCost = 50000, costPerKm = 3000 } = options;
    return baseCost + costPerKm * distanceKm;
}
