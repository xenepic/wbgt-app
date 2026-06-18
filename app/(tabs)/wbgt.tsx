import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import * as utils from "../../utils/utils";
import { GeoService } from "../../services/GeoService";
import { WeatherService } from "../../services/WeatherService";

export default function HomeScreen() {
  const [locationPref, setLocationPref] = useState<string | null>(null);
  const [wbgt, setWbgt] = useState<number | null>(null);
  const [publishedAtJst, setPublishedAtJst] = useState<string | null>(null);
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
        // coords: { latitude, longitude },
      } = geocordResult.data;

      // 位置情報設定
      setLocationPref(`${pref} ${city}`);

      // 時刻取得
      const { date, time } = utils.getLatestWbgtDateTime();

      // WBGT情報取得
      const wbgtResult = await WeatherService.fetchWbgtLatestWithCache(
        pref,
        city,
        time
      );
      if (!wbgtResult.ok) {
        setErrorMsg(wbgtResult.message);
        return;
      }

      // WBGTと設定
      setWbgt(wbgtResult.wbgt);
      setPublishedAtJst(wbgtResult.publishedAtJst);
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
          <Text style={styles.time}>{`（${
            publishedAtJst ? utils.formatPublishedAtJst(publishedAtJst) : "----"
          } 発表）`}</Text>
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
