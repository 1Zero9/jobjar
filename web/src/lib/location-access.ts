export function hasLocationRestrictions(allowedLocationIds: string[] | null | undefined) {
  return Boolean(allowedLocationIds && allowedLocationIds.length > 0);
}

export function getRoomLocationAccessWhere(allowedLocationIds: string[] | null | undefined) {
  return hasLocationRestrictions(allowedLocationIds)
    ? { locationId: { in: allowedLocationIds! } }
    : {};
}

export function getLocationScopeLabel(
  locations: Array<{ name: string }>,
  allowedLocationIds: string[] | null | undefined,
) {
  if (!hasLocationRestrictions(allowedLocationIds)) {
    return "All locations";
  }

  if (locations.length === 0) {
    return "No locations";
  }

  if (locations.length === 1) {
    return locations[0].name;
  }

  return `${locations[0].name} +${locations.length - 1}`;
}
