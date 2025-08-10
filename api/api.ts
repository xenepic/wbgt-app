import * as Location from "expo-location";
import * as utils from "../utils/utils";

const getWeather = async (latitude: number, longitude: number) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m&timezone=Asia%2FTokyo`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("気象情報の取得に失敗しました");

  const json = await res.json();
  return {
    temperature: json.current.temperature_2m,
    humidity: json.current.relative_humidity_2m,
  };
};

/**
 * 最新のWBGTデータをCSVから取得・解析し、配列として返す。
 *
 * @returns WBGTデータの配列を含むResultオブジェクト
 */
export const getWbgtData = async (): Promise<Result<WbgtData[]>> => {
  try {
    const { date, time, url: csvUrl } = utils.getLatestWbgtUrl();
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const csvText = await response.text();
    const rawData = csvText.split("\n").map((line) => line.split(","));
    const internalFlagIndex = rawData.findIndex((d) => d[0] === "InternalFlag");

    const data = rawData
      .slice(internalFlagIndex + 2)
      .filter((d) => d.length > 2)
      .map((d) => {
        const result: any = {
          areaName: d[0],
          prefectureName: d[4],
        };
        [10, 17, 5].forEach((t, i) => {
          result[`maxWbgt${t}`] = {};
          if (d[8 + i]) {
            d[8 + i].split("/").forEach((entry) => {
              const [place, val] = entry.split(":");
              result[`maxWbgt${t}`][place] = parseInt(val);
            });
          }
        });
        return result;
      });
    return {
      ok: true,
      data,
    };
  } catch (e: any) {
    return {
      ok: false,
      message: "WBGTデータ取得に失敗しました: " + e.message,
    };
  }
};

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
