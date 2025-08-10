type Result<T> = { ok: true; data: T } | { ok: false; message: string };

interface GeocodeResult {
  coords: Location.LocationObjectCoords;
  country: string;
  pref: string;
  city: string;
  area: string;
}
