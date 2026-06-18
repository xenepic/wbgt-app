import * as Location from "expo-location";
import Constants from "expo-constants";

// export type Result<T> = { ok: true; data: T } | { ok: false; message: string };

const apiBaseUrl =
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ??
  (Constants.manifest?.extra as any)?.apiBaseUrl;

function timeoutFetch(input: RequestInfo, init: RequestInit = {}, ms = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
}

export async function fetchAwsApi<T>(
  url: string,
  timeoutMs = 8000
): Promise<Result<T>> {
  try {
    const fetchUrl = `${apiBaseUrl}${url}`;
    const res = await timeoutFetch(fetchUrl, {}, timeoutMs);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as T;

    return { ok: true, data: json };
  } catch (e: any) {
    return {
      ok: false,
      message: `API呼び出しに失敗しました: ${e?.message ?? e}`,
    };
  }
}

/**
 * ユーザーに位置情報の取得許可をリクエストし、結果を返す。
 *
 * @returns 許可されていれば `ok: true`、拒否されていれば `ok: false` を含むResult
 */
export const checkLocationPermission = async (): Promise<Result<void>> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    return {
      ok: false,
      message: "位置情報の許可が必要です",
    };
  } else {
    return {
      ok: true,
      data: undefined,
    };
  }
};

/**
 * 現在の緯度・経度情報を取得する。
 *
 * @returns 位置情報オブジェクト（緯度・経度など）を含むResult
 */
export const getCurrentLocation = async (): Promise<
  Result<Location.LocationObject>
> => {
  try {
    const loc = await Location.getCurrentPositionAsync({});
    return {
      ok: true,
      data: loc,
    };
  } catch (e: any) {
    return {
      ok: false,
      message: "現在地の取得に失敗しました: " + e.message,
    };
  }
};
