import * as Location from "expo-location";
import * as api from "../api/api";

export class GeoService {
  private static geocodeResult: GeocodeResult | null = null;
  private static locationPermissionResult: Result<void> | null = null;

  /**
   * ユーザーに位置情報の取得許可をリクエストし、結果を返す。
   *
   * @returns 許可されていれば `ok: true`、拒否されていれば `ok: false` を含むResult
   */
  public static async checkLocationPermission(): Promise<Result<void>> {
    // 位置情報取得権限確認済みならそれを返す
    if (this.locationPermissionResult?.ok) {
      return this.locationPermissionResult;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        this.locationPermissionResult = {
          ok: false,
          message: "位置情報の許可が必要です",
        };
      } else {
        this.locationPermissionResult = {
          ok: true,
          data: undefined,
        };
      }
      return this.locationPermissionResult;
    } catch (e: any) {
      this.locationPermissionResult = {
        ok: false,
        message: "位置情報の許可を取得中にエラーが発生しました",
      };
      return this.locationPermissionResult;
    }
  }

  public static async getGeocode(): Promise<Result<GeocodeResult>> {
    if (this.geocodeResult) {
      return { ok: true, data: this.geocodeResult };
    }

    const locResult = await api.getCurrentLocation();
    if (!locResult.ok) return { ok: false, message: locResult.message };

    const geocode = await Location.reverseGeocodeAsync(locResult.data.coords);
    if (!geocode || geocode.length === 0) {
      return { ok: false, message: "現在地情報の解析に失敗しました" };
    }

    const { country, region: pref, city, district: area } = geocode[0];
    if (!country || !pref || !city || !area) {
      return { ok: false, message: "現在地情報の解析に失敗しました" };
    }

    this.geocodeResult = {
      country,
      pref,
      city,
      area,
      coords: locResult.data.coords,
    };
    return { ok: true, data: this.geocodeResult };
  }

  // 任意：テスト用の手動セット
  public static setMockGeocode(data: GeocodeResult) {
    this.geocodeResult = data;
  }

  public static reset() {
    this.geocodeResult = null;
  }
}
