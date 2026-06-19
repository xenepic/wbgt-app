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
import { useGeocode } from "@/hooks/useGeocode";
import { useWbgtLatest } from "@/hooks/useWbgtLatest";

export default function HomeScreen() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await GeoService.checkLocationPermission();
      if (!result.ok) {
        setPermissionError(result.message);
        return;
      }
      setPermissionGranted(true);
    })();
  }, []);

  const geocodeQuery = useGeocode(permissionGranted);
  const pref = geocodeQuery.data?.pref;
  const city = geocodeQuery.data?.city;
  const locationPref = pref && city ? `${pref} ${city}` : null;

  const { time } = utils.getLatestWbgtDateTime();
  const wbgtQuery = useWbgtLatest(pref, city, time);

  const wbgt = wbgtQuery.data?.wbgt ?? null;
  const publishedAtJst = wbgtQuery.data?.publishedAtJst ?? null;

  const errorMsg =
    permissionError ??
    (geocodeQuery.isError ? (geocodeQuery.error as Error).message : null) ??
    (wbgtQuery.isError ? (wbgtQuery.error as Error).message : null);

  // 通信が失敗していても直前のデータ（react-queryの永続化キャッシュ）が残っていれば
  // それを優先して表示し、裏で失敗している旨だけ小さく伝える
  const isShowingStaleData = wbgtQuery.isError && wbgt !== null;

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
            {isShowingStaleData && (
              <Text style={styles.staleNotice}>
                最新データの取得に失敗したため、前回取得したデータを表示しています
              </Text>
            )}
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
  staleNotice: {
    fontSize: 12,
    color: "#ffffffcc",
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
