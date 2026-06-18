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
 * WBGTデータの発表時刻を人間が読みやすい形式に変換
 * @param publishedAtJst ISO8601形式の日時文字列（例: "2025-08-10T17:00:00+09:00"）
 * @returns 例: "2025年8月10日 17:00"
 */
export const formatPublishedAtJst = (publishedAtJst: string): string => {
  if (!publishedAtJst) return "";

  const date = new Date(publishedAtJst);

  // 年月日と時刻を取得
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0始まりなので+1
  const day = date.getDate();

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
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
