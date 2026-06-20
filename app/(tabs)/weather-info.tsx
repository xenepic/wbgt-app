import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LineChart } from "react-native-gifted-charts";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGeocode } from "@/hooks/useGeocode";
import { useHourlyWeather } from "@/hooks/useHourlyWeather";
import { useDailyWeather } from "@/hooks/useDailyWeather";

const CHART_HEIGHT = 200;
const POINT_SPACING = 36; // 1時間データを何pxで表現するか（横密度。日付ラベル"M/D"が収まる幅を確保）
const Y_AXIS_LABEL_WIDTH = 36;
const ICON_LABEL_WIDTH = 36;

const YOUBI = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(s: string) {
  const d = new Date(s + "T00:00:00");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const w = YOUBI[d.getDay()];
  return `${mm}/${dd} (${w})`;
}

// グラフX軸の日付境界ラベル用（短縮形、横スペースが狭いため曜日は省略）
function formatShortDate(s: string) {
  const d = new Date(s + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function weekendStyle(s: string) {
  const day = new Date(s + "T00:00:00").getDay();
  if (day === 0) return styles.sun; // 日
  if (day === 6) return styles.sat; // 土
  return null;
}

function precipToIcon(p: number, t: number) {
  if (p <= 0.05) return "weather-sunny"; // ほぼ降らない
  if (t <= 1 && p > 0) return "weather-snowy"; // 簡易雪判定
  if (p < 3) return "umbrella-closed-outline"; // 0.1–2.9mm
  return "umbrella-outline"; // 3mm以上
}

function weatherCodeToIcon(code: number) {
  if (code === 0) return "weather-sunny";
  if ([1, 2, 3].includes(code)) return "weather-partly-cloudy";
  if ([45, 48].includes(code)) return "weather-fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "weather-rainy";
  if ([61, 63, 65, 66, 67].includes(code)) return "weather-pouring";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "weather-snowy";
  if ([80, 81, 82].includes(code)) return "weather-lightning-rainy";
  if ([95, 96, 99].includes(code)) return "weather-lightning";
  return "weather-cloudy";
}

function HourlyIconLabel({
  precip,
  temp,
}: {
  precip: number;
  temp: number;
}) {
  return (
    <View style={[styles.precipItem, { width: ICON_LABEL_WIDTH }]}>
      <MaterialCommunityIcons
        name={precipToIcon(precip, temp) as any}
        size={18}
        color="#666"
      />
      <Text style={styles.precipText}>{`${precip.toFixed(0)}mm`}</Text>
    </View>
  );
}

export default function WeatherDetailScreen() {
  const geocodeQuery = useGeocode(true);
  const coords = geocodeQuery.data?.coords;
  const location =
    geocodeQuery.data && `${geocodeQuery.data.pref} ${geocodeQuery.data.city}`;

  const hourlyQuery = useHourlyWeather(coords?.latitude, coords?.longitude);
  const dailyQuery = useDailyWeather(coords?.latitude, coords?.longitude);

  const hourlyData = hourlyQuery.data;
  const dailyData = dailyQuery.data;

  const errorMsg = geocodeQuery.isError
    ? (geocodeQuery.error as Error).message
    : hourlyQuery.isError
    ? (hourlyQuery.error as Error).message
    : dailyQuery.isError
    ? (dailyQuery.error as Error).message
    : null;

  const yAxis = useMemo(() => {
    if (!hourlyData) return { yAxisOffset: 0, maxValue: 10, noOfSections: 5 };

    const temps = hourlyData.temperature_2m;
    const margin = 2; // 最低/最高の周囲に余白として数度確保する
    const dataMin = Math.min(...temps);
    const dataMax = Math.max(...temps);

    const niceStep = (roughStep: number) => {
      const pow10 = Math.pow(10, Math.floor(Math.log10(roughStep)));
      const n = roughStep / pow10;
      const base = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
      return base * pow10;
    };

    const desiredSections = 5;
    const rawMin = dataMin - margin;
    const rawMax = dataMax + margin;
    const step = niceStep((rawMax - rawMin) / desiredSections) || 1;

    const yAxisOffset = Math.floor(rawMin / step) * step;
    const noOfSections = Math.ceil((rawMax - yAxisOffset) / step);

    return { yAxisOffset, maxValue: step * noOfSections, noOfSections };
  }, [hourlyData]);

  const chartData = useMemo(() => {
    if (!hourlyData) return [];

    const { time, temperature_2m, precipitation } = hourlyData;

    return time.map((t, i) => {
      const isThreeHourly = i % 3 === 0;
      const hh = t.slice(11, 13);
      const isDayBoundary = hh === "00";
      const label = isThreeHourly
        ? isDayBoundary
          ? formatShortDate(t.split("T")[0])
          : hh
        : "";

      return {
        value: temperature_2m[i],
        label,
        showVerticalLine: isDayBoundary,
        verticalLineColor: "#bbb",
        verticalLineThickness: 1,
        dataPointLabelComponent: isThreeHourly
          ? () => (
              <HourlyIconLabel
                precip={precipitation[i]}
                temp={temperature_2m[i]}
              />
            )
          : undefined,
      };
    });
  }, [hourlyData]);

  const renderHourlyChart = () => {
    if (!hourlyData) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1時間ごとの気温</Text>
        <LineChart
          data={chartData}
          height={CHART_HEIGHT}
          overflowTop={40}
          spacing={POINT_SPACING}
          initialSpacing={8}
          color="rgb(255,99,132)"
          thickness={2}
          curved
          dataPointsRadius={0}
          dataPointsColor="transparent"
          yAxisOffset={yAxis.yAxisOffset}
          maxValue={yAxis.maxValue}
          noOfSections={yAxis.noOfSections}
          yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
          yAxisTextStyle={styles.yTickText}
          yAxisLabelSuffix="℃"
          xAxisLabelTextStyle={styles.xTickText}
          rulesColor="#eee"
          xAxisColor="#ddd"
          yAxisColor="#ddd"
          dataPointLabelShiftY={-10}
        />
      </View>
    );
  };

  const renderDailyTable = () => {
    if (!dailyData) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>週間予報</Text>
        {dailyData.time.map((date, i) => (
          <View key={date} style={styles.card}>
            <Text style={[styles.cardDate, weekendStyle(date)]}>
              {formatDate(date)}
            </Text>

            <MaterialCommunityIcons
              name={weatherCodeToIcon(dailyData.weathercode[i]) as any}
              size={28}
              color="#555"
            />

            {/* 温度は 最高 / 最低 の順に */}
            <Text style={styles.cardTemp}>
              {dailyData.temperature_2m_max[i]}℃ /{" "}
              {dailyData.temperature_2m_min[i]}℃
            </Text>

            <Text style={styles.cardRain}>
              {`${dailyData.precipitation_sum[i].toFixed(1)} mm`}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>気象詳細情報</Text>
      <Text style={styles.subtitle}>{location}</Text>

      {errorMsg ? (
        <Text style={styles.error}>{errorMsg}</Text>
      ) : !hourlyData || !dailyData ? (
        <ActivityIndicator size="large" color="#888" />
      ) : (
        <>
          {renderHourlyChart()}
          {renderDailyTable()}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f7f9fb" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 12 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  error: { fontSize: 16, color: "red", textAlign: "center" },

  // 週間カード
  card: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDate: { fontSize: 14, flex: 2 },
  cardTemp: { fontSize: 16, flex: 3, textAlign: "center" },
  cardRain: { fontSize: 14, flex: 2, textAlign: "right" },
  sat: { color: "#1e88e5" }, // 土: 青
  sun: { color: "#e53935" }, // 日: 赤

  // グラフ上のアイコンラベル
  precipItem: { alignItems: "center", justifyContent: "center" },
  precipText: { fontSize: 10, color: "#666", marginTop: 2 },

  yTickText: { fontSize: 11, color: "#666" },
  xTickText: { fontSize: 11, color: "#666" },
});
