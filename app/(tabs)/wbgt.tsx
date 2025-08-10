import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import * as Location from "expo-location";
import * as utils from "../../utils/utils";
import * as api from "../../api/api";
import { GeoService } from "../../services/GeoService";
import { WeatherService } from "../../services/WeatherService";

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

export default function HomeScreen() {
  const [locationPref, setLocationPref] = useState<string | null>(null);
  const [wbgt, setWbgt] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // 位置情報の使用権限チェック
      const locationPermissionResult =
        await GeoService.checkLocationPermission();
      if (!locationPermissionResult.ok) {
        setErrorMsg("位置情報の許可が必要です");
        return;
      }

      // 位置情報取得
      const geocordResult = await GeoService.getGeocode();
      if (!geocordResult.ok) {
        setErrorMsg(geocordResult.message);
        return;
      }
      const {
        pref,
        city,
        coords: { latitude, longitude },
      } = geocordResult.data;

      // 天候情報取得
      const weatherResult = await WeatherService.getWeather(
        latitude,
        longitude
      );
      if (!weatherResult.ok) {
        setErrorMsg(weatherResult.message);
        return;
      }
      const { temperature, humidity } = weatherResult.data;

      // 位置情報設定
      setLocationPref(`${pref} ${city}`);

      // 時刻取得
      const { date, time } = utils.getLatestWbgtDateTime();

      // WBGT情報取得
      const wbgtResult = await api.getWbgtData();
      if (!wbgtResult.ok) {
        setErrorMsg(wbgtResult.message);
        return;
      }
      const wbgtData = wbgtResult.data;

      // 現在地のWBGTを取得
      const wbgt = getWbgtFromCity(wbgtData, pref, city, time);
      if (wbgt == null) {
        setErrorMsg("WBGTデータが見つかりませんでした");
        return;
      }

      // WBGT設定
      setWbgt(wbgt);
    })();
  }, []);

  const { level, color } =
    wbgt !== null
      ? utils.getWbgtLevel(wbgt)
      : { level: "", color: "#686868ff" };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: color }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.heading}>{utils.getForecastLabel()}</Text>
      </View>

      {/* 中央コンテンツ */}
      <View style={styles.centerContent}>
        {locationPref && wbgt !== null ? (
          <>
            <Text style={styles.wbgtValue}>{`WBGT ${wbgt}`}</Text>
            <Text style={styles.level}>{level}</Text>
            <Text style={styles.location}>{locationPref}</Text>
          </>
        ) : errorMsg ? (
          <Text style={styles.error}>{errorMsg}</Text>
        ) : (
          <>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>ローディング中...</Text>
          </>
        )}
      </View>

      {/* フッター */}
      {locationPref && wbgt !== null && (
        <View style={styles.footer}>
          <Text
            style={styles.time}
          >{`（${utils.getDisplayDate()} 発表）`}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginTop: 100, // ← SafeArea内の余白 + 微調整
    marginBottom: 16,
  },
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  wbgtValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#ffffff",
  },
  level: {
    fontSize: 32,
    marginTop: 10,
    color: "#ffffff",
  },
  location: {
    fontSize: 24,
    marginTop: 20,
    color: "#ffffff",
  },
  loadingText: {
    fontSize: 18,
    color: "#ffffff",
    marginTop: 12,
  },
  footer: {
    alignItems: "flex-end",
    padding: 10,
  },
  time: {
    fontSize: 14,
    color: "#dddddd",
  },
  error: {
    fontSize: 20,
    color: "#fc8474ff",
    textAlign: "center",
  },
});
