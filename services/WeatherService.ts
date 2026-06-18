import * as api from "../api/api";
import * as utils from "../utils/utils";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WBGT_CACHE_KEY = "wbgt_latest";
const WBGT_PUBLISH_TIME_CACHE_KEY = "wbgt_publish_time";

function getWbgtFromCity(
  wbgtData: WbgtData[],
  pref: string,
  city: string,
  time: string
) {
  const matchCityList = wbgtData.filter(
    (item) => item.prefectureName === utils.getShortName(pref)
  );

  if (matchCityList.length !== 0) {
    const key = `maxWbgt${parseInt(time)}` as keyof WbgtData;

    const wbgtList = matchCityList.reduce<Record<string, number>>(
      (acc, curr) => {
        const wbgt = curr[key] as Record<string, number>;
        return {
          ...acc,
          ...wbgt,
        };
      },
      {}
    );

    let wbgt = wbgtList[city ?? ""] ?? wbgtList[utils.getShortName(city ?? "")];
    if (!wbgt) {
      const values = Object.values(wbgtList);
      wbgt =
        values.reduce((sum: number, val: any) => sum + Number(val), 0) /
        values.length;
    }

    return wbgt;
  } else {
    return null;
  }
}

/**
 * 天気情報を取得するサービス
 */
export class WeatherService {
  /**
   * 緯度・経度を指定して、現在の気温と湿度を取得する
   *
   * @param latitude 緯度
   * @param longitude 経度
   * @returns 気温・湿度を含む Result オブジェクト
   */
  public static async getWeather(
    latitude: number,
    longitude: number
  ): Promise<Result<{ temperature: number; humidity: number }>> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m&timezone=Asia%2FTokyo`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("気象情報の取得に失敗しました");

      const json = await res.json();

      return {
        ok: true,
        data: {
          temperature: json.current.temperature_2m,
          humidity: json.current.relative_humidity_2m,
        },
      };
    } catch (e: any) {
      return {
        ok: false,
        message: "気象情報の取得に失敗しました: " + e.message,
      };
    }
  }

  /**
   * 1時間ごとの天気データを取得する
   */
  public static async getHourlyWeather(
    latitude: number,
    longitude: number
  ): Promise<Result<HourlyForecast>> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation,weathercode&timezone=Asia%2FTokyo`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("API通信に失敗しました");
      }

      const json = await res.json();
      let result = {} as any;
      Object.entries(json.hourly as HourlyForecast).forEach(([key, value]) => {
        result[key] = value.slice(0, 48);
      });
      return {
        ok: true,
        data: result as HourlyForecast,
      };
    } catch (e: any) {
      return {
        ok: false,
        message: "1時間ごとの天気取得に失敗しました: " + e.message,
      };
    }
  }

  /**
   * 1日ごとの週間天気データを取得する
   */
  public static async getDailyWeather(
    latitude: number,
    longitude: number
  ): Promise<Result<DailyForecast>> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Asia%2FTokyo`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("API通信に失敗しました");
      }

      const json = await res.json();
      return {
        ok: true,
        data: json.daily as DailyForecast,
      };
    } catch (e: any) {
      return {
        ok: false,
        message: "週間天気の取得に失敗しました: " + e.message,
      };
    }
  }

  /**
   * WBGTデータを取得する
   */
  public static async getWbgtLatest(
    pref: string,
    city: string,
    time: WbgtTime
  ): Promise<WeatherServiceWbgtResponse> {
    const wbgtResult = await api.fetchAwsApi<WbgtApiResponse>(
      "/wbgt/v1/latest"
    );
    if (!wbgtResult.ok) return { ok: false, message: wbgtResult.message };

    const { items: wbgtData, publishedAtJst } = wbgtResult.data;

    // 現在地のWBGTを取得
    const wbgt = getWbgtFromCity(wbgtData, pref, city, time);
    if (wbgt == null) {
      return { ok: false, message: "there is no WBGT data in your location." };
    } else {
      return { ok: true, wbgt, publishedAtJst };
    }
  }

  /**
   * Wbgtを取得する。失敗したときはキャッシュ値から取得する。
   */
  public static async fetchWbgtLatestWithCache(
    pref: string,
    city: string,
    time: WbgtTime
  ): Promise<WeatherServiceWbgtResponse> {
    const result = await WeatherService.getWbgtLatest(pref, city, time);
    if (result.ok) {
      await AsyncStorage.setItem(WBGT_CACHE_KEY, JSON.stringify(result.wbgt));
      await AsyncStorage.setItem(
        WBGT_PUBLISH_TIME_CACHE_KEY,
        JSON.stringify(result.publishedAtJst)
      );
      return result;
    }
    // 失敗時はキャッシュから復旧
    const cachedWbgt = await AsyncStorage.getItem(WBGT_CACHE_KEY);
    const cachedPublishedAtJst = await AsyncStorage.getItem(
      WBGT_PUBLISH_TIME_CACHE_KEY
    );
    if (cachedWbgt && cachedPublishedAtJst) {
      return {
        ok: true,
        wbgt: parseInt(JSON.parse(cachedWbgt)),
        publishedAtJst: JSON.parse(cachedPublishedAtJst),
      };
    }
    return result;
  }
}
