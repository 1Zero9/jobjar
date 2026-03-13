export function hasLocationRestrictions(allowedLocationIds: string[] | null | undefined) {
  return Boolean(allowedLocationIds && allowedLocationIds.length > 0);
}

export function getRoomLocationAccessWhere(allowedLocationIds: string[] | null | undefined) {
  return hasLocationRestrictions(allowedLocationIds)
    ? { locationId: { in: allowedLocationIds! } }
    : {};
}
