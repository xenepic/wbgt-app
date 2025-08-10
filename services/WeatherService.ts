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
      return {
        ok: true,
        data: json.hourly as HourlyForecast,
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
}
