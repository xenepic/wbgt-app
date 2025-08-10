export const getShortName = (pref: string) => {
  if (pref === "北海道") {
    return "北海道";
  } else {
    return pref.slice(0, -1);
  }
};

/**
 * 現在時刻に基づいて、最新のWBGT発表時刻と対応日付を計算
 */
export const getLatestWbgtDateTime = (): { date: Date; time: WbgtTime } => {
  const now = new Date();
  const hour = now.getHours();

  // 発表は5時、10時、17時。5時未満は前日17時を参照
  if (hour < 5) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return { date: yesterday, time: "17" };
  } else if (hour < 10) {
    return { date: now, time: "05" };
  } else if (hour < 17) {
    return { date: now, time: "10" };
  } else {
    return { date: now, time: "17" };
  }
};

/**
 * 最新のWBGTデータCSVのURLと対象日・時刻を返す
 */
// export const getLatestWbgtUrl = (): {
//   date: string;
//   time: WbgtTime;
//   url: string;
// } => {
//   const { date, time } = getLatestWbgtDateTime();
//   const pad = (n: number) => n.toString().padStart(2, "0");
//   const dateStr = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
//     date.getDate()
//   )}`;
//   const url = `https://www.wbgt.env.go.jp/alert/dl/${dateStr.slice(
//     0,
//     4
//   )}/alert_${dateStr}_${time}.csv`;

//   return { date: dateStr, time, url };
// };

/**
 * 最新のWBGTデータCSVのURLと対象日・時刻を返す
 */
export const getLatestWbgtUrl = (): {
  date: string;
  time: WbgtTime;
  url: string;
} => {
  const { date, time } = getLatestWbgtDateTime();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate()
  )}`;
  const url = `https://www.wbgt.env.go.jp/alert/dl/${dateStr.slice(
    0,
    4
  )}/alert_${dateStr}_${time}.csv`;

  return { date: dateStr, time, url };
};

/**
 * 最新WBGT発表時刻の人間向け表示用（例: 2025年7月26日 17:00）
 */
export const getDisplayDate = (): string => {
  const { date, time } = getLatestWbgtDateTime();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const timeLabel = `${parseInt(time, 10)}:00`;

  return `${year}年${month}月${day}日 ${timeLabel}`;
};

export const getWbgtLevel = (value: number) => {
  if (value < 21) return { level: "安全", color: "#4CAF50" }; // 緑
  if (value < 25) return { level: "注意", color: "#FFEB3B" }; // 黄
  if (value < 28) return { level: "警戒", color: "#FF9800" }; // オレンジ
  if (value < 31) return { level: "厳重警戒", color: "#F44336" }; // 赤
  return { level: "危険", color: "#9C27B0" }; // 紫
};

export const getForecastLabel = (): string => {
  const now = new Date();
  const { time } = getLatestWbgtDateTime();

  // 今日 or 明日を判断
  const isTomorrow = time === "17";
  const targetDate = new Date();

  if (isTomorrow) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  return `${isTomorrow ? "明日" : "本日"}${month}月${day}日の予報`;
};
