// WeatherDetailScreen.tsx（グラフまわりリファクタ済み）
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { GeoService } from "@/services/GeoService";
import { WeatherService } from "@/services/WeatherService";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/* =========================
 * 定数（見た目・幾何の単一の真実）
 * ========================= */
const SCREEN_WIDTH = Dimensions.get("window").width;

const CHART_HEIGHT = 240; // グラフの高さ（グリッド含む）
const PADDING_TOP = 17; // chart-kit 内部の上側余白（経験値）
const X_LABEL_HEIGHT = 30; // X軸ラベル相当の高さ（端末で微差が出る時は±調整）
const CHART_MARGIN_TOP = 25; // グラフ外側の上マージン（ラベル逃がし）
const FIXED_Y_WIDTH = 44; // 固定Y軸の横幅
const WEATHER_ICON_MARGIN_LEFT = -19; // グラフ上のお天気アイコンの左マージン
const STEP_WIDTH = 20; // 1時間データを何pxで表現するか（横密度）

const CHART_MARGIN_LEFT = -(FIXED_Y_WIDTH + 10); // 横の平行移動
const LEFT_OVERLAP = Math.max(0, -CHART_MARGIN_LEFT); // 右端が切れないよう、左に寄せたぶん実効幅を足す

/* =========================
 * 型メモ（必要最低限）
 * ========================= */
type HourlyData = {
  time: string[]; // ISO-like "YYYY-MM-DDTHH:mm"
  temperature_2m: number[];
  precipitation: number[];
};
type DailyData = {
  time: string[];
  weathercode: number[];
  temperature_2m_min: number[];
  temperature_2m_max: number[];
  precipitation_sum: number[];
};

export default function WeatherDetailScreen() {
  const [hourlyData, setHourlyData] = useState<HourlyData | null>(null);
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [location, setLocation] = useState<string>("");

  /* =========================
   * 初期ロード（位置→天気）
   * ========================= */
  useEffect(() => {
    (async () => {
      // 位置情報取得
      const geo = await GeoService.getGeocode();
      if (!geo.ok) return setErrorMsg(geo.message);

      const { coords, city, pref } = geo.data;
      setLocation(`${pref} ${city}`);

      // 時間ごとの天気取得
      const h = await WeatherService.getHourlyWeather(
        coords.latitude,
        coords.longitude
      );
      if (!h.ok) return setErrorMsg(h.message);
      setHourlyData(h.data);

      // 週間天気取得
      const d = await WeatherService.getDailyWeather(
        coords.latitude,
        coords.longitude
      );
      if (!d.ok) return setErrorMsg(d.message);
      setDailyData(d.data);
    })();
  }, []);

  /* =========================
   * スクロール同期（片方向：グラフ → アイコン）
   * ========================= */
  const chartScrollRef = useRef<ScrollView>(null);
  const iconScrollRef = useRef<ScrollView>(null);
  const syncFromChart = (x: number) => {
    // グラフのスクロール量 x をアイコン帯に“追従”させる
    iconScrollRef.current?.scrollTo({ x, animated: false });
  };

  /* =========================
   * ユーティリティ：曜日・日付
   * ========================= */
  const YOUbi = ["日", "月", "火", "水", "木", "金", "土"];
  const formatDate = (s: string) => {
    const d = new Date(s + "T00:00:00");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const w = YOUbi[d.getDay()];
    return `${mm}/${dd} (${w})`;
  };
  const weekendStyle = (s: string) => {
    const day = new Date(s + "T00:00:00").getDay();
    if (day === 0) return styles.sun; // 日
    if (day === 6) return styles.sat; // 土
    return null;
  };

  /* =========================
   * ビュー用の整形値
   * ========================= */
  const view = useMemo(() => {
    if (!hourlyData) {
      return {
        labels: [] as string[],
        temps: [] as number[],
        threeHourly: [] as {
          i: number;
          hh: string;
          temp: number;
          precip: number;
        }[],
        chartWidth: SCREEN_WIDTH,
        effectiveWidth: SCREEN_WIDTH,
      };
    }

    const times = hourlyData.time;
    const temps = hourlyData.temperature_2m;
    const precs = hourlyData.precipitation;

    // X軸：3時間ごとだけ “HH” を表示（それ以外は空文字） 2025-08-10 11
    // const labels = times.map((t, i) => (i % 3 === 0 ? t.slice(11, 13) : ""));
    const labels = times.map((t, i) => {
      if (i % 3 !== 0) return "";
      else {
        const hh = t.slice(11, 13);
        if (hh === "00" && i !== 0) {
          return formatDate(t.split("T")[0]);
        } else {
          return hh;
        }
      }
    });

    // 可変幅：データ数 × コマ幅。右端余白セルもここで反映（3帯で同じ値を使う）
    const chartWidth = Math.max(SCREEN_WIDTH, times.length * STEP_WIDTH);
    // const effectiveWidth = chartWidth + RIGHT_PAD_CELLS * STEP_WIDTH;
    const effectiveWidth = chartWidth + LEFT_OVERLAP;

    // 上のアイコン帯は 3時間ごとに表示
    const threeHourly = times
      .map((t, i) => ({
        i,
        hh: t.slice(11, 13),
        temp: temps[i],
        precip: precs[i],
      }))
      .filter((d) => d.i % 3 === 0);

    return { labels, temps, threeHourly, chartWidth, effectiveWidth };
  }, [hourlyData]);

  /* =========================
   * ユーティリティ：降水→アイコン
   * ========================= */
  const precipToIcon = (p: number, t: number) => {
    if (p <= 0.05) return "weather-sunny"; // ほぼ降らない
    if (t <= 1 && p > 0) return "weather-snowy"; // 簡易雪判定
    if (p < 3) return "umbrella-closed-outline"; // 0.1–2.9mm
    return "umbrella-outline"; // 3mm以上
  };

  /* =========================
   * 固定Y軸ラベル（データ範囲から自動生成）
   * * ラベルの温度は等間隔
   * * かならず10の倍数温度を含む
   * ========================= */
  const yAxis = useMemo(() => {
    if (!hourlyData)
      return { ticks: [] as number[], labels: [] as string[], segments: 5 };

    const raw = hourlyData.temperature_2m;
    let dataMin = Math.min(...raw);
    let dataMax = Math.max(...raw);

    // すべて同じ値への対策（±2℃ でレンジを作る）
    if (dataMin === dataMax) {
      dataMin -= 2;
      dataMax += 2;
    }

    const desiredTicks = 6; // 表示本数（横線の数）= 6 → segments は 5
    const niceStep = (roughStep: number) => {
      const pow10 = Math.pow(10, Math.floor(Math.log10(roughStep)));
      const n = roughStep / pow10;
      const base = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
      return base * pow10; // 1,2,5 系
    };

    const ceilTo = (x: number, step: number) => Math.ceil(x / step) * step;
    const floorTo = (x: number, step: number) => Math.floor(x / step) * step;

    // ① 粗いステップをナイス化（1,2,5 系）
    const rough = (dataMax - dataMin) / (desiredTicks - 1);
    let step = niceStep(rough);

    // ② 端点をステップに合わせて丸める（最低/最高“を含む”レンジに）
    let minTick = floorTo(dataMin, step);
    let maxTick = ceilTo(dataMax, step);

    // ③ 目盛本数を desiredTicks に近づける（±1 程度で微調整）
    const adjust = () => {
      let count = Math.round((maxTick - minTick) / step) + 1;
      if (count > desiredTicks + 1) {
        step = step * 2;
        minTick = floorTo(dataMin, step);
        maxTick = ceilTo(dataMax, step);
      } else if (count < desiredTicks - 1) {
        step = step / 2;
        minTick = floorTo(dataMin, step);
        maxTick = ceilTo(dataMax, step);
      }
    };
    adjust();

    // ④ 10 の倍数を少なくとも 1 つ含める（なければレンジを拡げる）
    const hasMultipleOf10 = (a: number, b: number) => {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const first = Math.ceil(lo / 10) * 10;
      return first <= hi;
    };
    if (!hasMultipleOf10(minTick, maxTick)) {
      // 近い方に 10 の倍数が入るまで拡げる（表示本数が増えすぎないよう片側だけ）
      const down = Math.floor(minTick / 10) * 10;
      const up = Math.ceil(maxTick / 10) * 10;
      // どちらが近いかで選択
      if (minTick - down <= up - maxTick) {
        minTick = down;
      } else {
        maxTick = up;
      }
    }

    // ⑤ 目盛配列作成（等間隔）
    const ticks: number[] = [];
    for (let v = minTick; v <= maxTick + 1e-9; v += step) {
      // 小数揺れ対策
      ticks.push(Math.round(v * 10) / 10);
    }

    // ラベル（上から表示する都合があるなら reverse で並べ替え）
    const labels = [...ticks]
      .reverse()
      .map((v) => `${Number.isInteger(v) ? v : v.toFixed(1)}℃`);

    // LineChart のグリッド本数 = segments（横線本数-1）
    const segments = ticks.length - 1;

    return { ticks, labels, segments };
  }, [hourlyData]);

  /* =========================
   * UI：上の天気/傘アイコン帯（クリップ＋同期）
   * ========================= */
  const renderPrecipIconsRow = () => {
    if (!hourlyData || view.threeHourly.length === 0) return null;
    const itemWidth = STEP_WIDTH * 3; // 3時間ぶんを1アイテム幅に

    return (
      <View
        style={{
          marginLeft: FIXED_Y_WIDTH + WEATHER_ICON_MARGIN_LEFT,
          width: SCREEN_WIDTH - FIXED_Y_WIDTH,
          overflow: "hidden", // 縦軸上に乗らないように切り落とす
        }}
      >
        <ScrollView
          ref={iconScrollRef}
          horizontal
          scrollEnabled={false} // 触れない（グラフに追従のみ）
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            width: view.effectiveWidth,
            paddingLeft: 0,
            paddingRight: 16,
          }}
        >
          <View style={styles.precipRow}>
            {view.threeHourly.map((d) => (
              <View key={d.i} style={[styles.precipItem, { width: itemWidth }]}>
                <MaterialCommunityIcons
                  name={precipToIcon(d.precip, d.temp) as any}
                  size={18}
                  color="#666"
                />
                <Text style={styles.precipText}>{`${d.precip.toFixed(
                  0
                )}mm`}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  /* =========================
   * UI：時間別グラフ（固定Y軸＋横スクロール本体）
   * ========================= */
  const renderHourlyChart = () => {
    if (!hourlyData) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1時間ごとの気温</Text>

        {/* 上：天気/傘アイコン（同期） */}
        {renderPrecipIconsRow()}

        {/* 本体：左に固定Y軸、右に横スクロールのグラフ */}
        <View style={{ flexDirection: "row", alignItems: "stretch" }}>
          {/* 固定Y軸（前面） */}
          <View style={styles.fixedYAxis}>
            {/* chart-kit の内側グリッド領域と高さ・位置を一致させる */}
            <View
              style={{
                height: CHART_HEIGHT - PADDING_TOP - X_LABEL_HEIGHT,
                justifyContent: "space-between",
                transform: [{ translateY: PADDING_TOP }],
              }}
            >
              {yAxis.labels.map((t) => (
                <Text key={t} style={styles.yTickText}>
                  {t}
                </Text>
              ))}
            </View>
          </View>

          {/* グラフ（横スクロール） */}
          <ScrollView
            ref={chartScrollRef}
            horizontal
            scrollEventThrottle={16}
            onScroll={(e) => syncFromChart(e.nativeEvent.contentOffset.x)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ width: view.effectiveWidth }}
            style={{ zIndex: 1 }} // Y軸（zIndex:10）より背面
          >
            {/* ラッパ…上に余白を足す（= ラベル逃がし） */}
            <View style={{ marginTop: CHART_MARGIN_TOP }}>
              {/* 中身…グリッド/線を上に持ち上げて、固定Y軸と“下端”を揃える */}
              <View style={{ transform: [{ translateY: -PADDING_TOP }] }}>
                <LineChart
                  data={{
                    labels: view.labels,
                    datasets: [{ data: view.temps }],
                  }}
                  width={view.effectiveWidth}
                  height={CHART_HEIGHT}
                  withHorizontalLabels={false} // Yラベルは自前で描画
                  withDots={false} // 点は非表示（線を見やすく）
                  withInnerLines // 水平グリッド
                  withOuterLines={false}
                  withVerticalLabels // Xラベル（HH / 3時間ごと）
                  bezier // 線を滑らかに
                  segments={5}
                  xLabelsOffset={0}
                  yLabelsOffset={0}
                  transparent
                  chartConfig={{
                    backgroundGradientFrom: "#fff",
                    backgroundGradientTo: "#fff",
                    decimalPlaces: 0,
                    color: (o = 1) => `rgba(255,99,132,${o})`,
                    labelColor: () => "#666",
                    propsForBackgroundLines: {
                      strokeDasharray: "0",
                      stroke: "#eee",
                    },
                    propsForVerticalLabels: { fontSize: 11 },
                    propsForDots: { r: "0" },
                  }}
                  style={{ marginLeft: CHART_MARGIN_LEFT, padding: 0 }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  /* =========================
   * UI：週間予報
   * ========================= */
  const weatherCodeToIcon = (code: number) => {
    if (code === 0) return "weather-sunny";
    if ([1, 2, 3].includes(code)) return "weather-partly-cloudy";
    if ([45, 48].includes(code)) return "weather-fog";
    if ([51, 53, 55, 56, 57].includes(code)) return "weather-rainy";
    if ([61, 63, 65, 66, 67].includes(code)) return "weather-pouring";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "weather-snowy";
    if ([80, 81, 82].includes(code)) return "weather-lightning-rainy";
    if ([95, 96, 99].includes(code)) return "weather-lightning";
    return "weather-cloudy";
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

  /* =========================
   * ルート描画
   * ========================= */
  return (
    <ScrollView contentContainerStyle={styles.container}>
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

/* =========================
 * スタイル
 * ========================= */
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

  // 上のアイコン帯
  precipRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  precipItem: { alignItems: "center", justifyContent: "center" },
  precipText: { fontSize: 10, color: "#666", marginTop: 2 },

  // 固定Y軸（前面に出す）
  fixedYAxis: {
    width: FIXED_Y_WIDTH,
    paddingRight: 4,
    alignItems: "flex-end",
    zIndex: 10,
    elevation: 10,
  },
  yTickText: { fontSize: 11, color: "#666" },
});
