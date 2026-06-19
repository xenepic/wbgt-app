process.env.TZ = "Asia/Tokyo";

import * as utils from "./utils";

function mockNow(isoLocal: string) {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(isoLocal));
}

afterEach(() => {
  jest.useRealTimers();
});

describe("getShortName", () => {
  test("北海道はそのまま返す", () => {
    expect(utils.getShortName("北海道")).toBe("北海道");
  });

  test("末尾の都/道/府/県を1文字削る", () => {
    expect(utils.getShortName("東京都")).toBe("東京");
    expect(utils.getShortName("大阪府")).toBe("大阪");
    expect(utils.getShortName("沖縄県")).toBe("沖縄");
  });
});

describe("getLatestWbgtDateTime", () => {
  test("0〜4時台は前日17時発表分", () => {
    mockNow("2025-08-10T03:00:00");
    const { date, time } = utils.getLatestWbgtDateTime();
    expect(time).toBe("17");
    expect(date.getDate()).toBe(9);
  });

  test("5〜9時台は当日5時発表分", () => {
    mockNow("2025-08-10T07:00:00");
    const { time, date } = utils.getLatestWbgtDateTime();
    expect(time).toBe("05");
    expect(date.getDate()).toBe(10);
  });

  test("10〜16時台は当日10時発表分", () => {
    mockNow("2025-08-10T15:59:00");
    const { time } = utils.getLatestWbgtDateTime();
    expect(time).toBe("10");
  });

  test("17時台以降は当日17時発表分", () => {
    mockNow("2025-08-10T23:00:00");
    const { time } = utils.getLatestWbgtDateTime();
    expect(time).toBe("17");
  });

  test("境界値（5:00, 10:00, 17:00）", () => {
    mockNow("2025-08-10T05:00:00");
    expect(utils.getLatestWbgtDateTime().time).toBe("05");

    mockNow("2025-08-10T10:00:00");
    expect(utils.getLatestWbgtDateTime().time).toBe("10");

    mockNow("2025-08-10T17:00:00");
    expect(utils.getLatestWbgtDateTime().time).toBe("17");
  });
});

describe("formatPublishedAtJst", () => {
  test("ISO8601文字列を日本語表記に変換する", () => {
    expect(utils.formatPublishedAtJst("2025-08-10T17:00:00+09:00")).toBe(
      "2025年8月10日 17:00"
    );
  });

  test("空文字は空文字を返す", () => {
    expect(utils.formatPublishedAtJst("")).toBe("");
  });
});

describe("getWbgtLevel", () => {
  test.each([
    [20, "安全", "#4CAF50"],
    [21, "注意", "#FFEB3B"],
    [24, "注意", "#FFEB3B"],
    [25, "警戒", "#FF9800"],
    [27, "警戒", "#FF9800"],
    [28, "厳重警戒", "#F44336"],
    [30, "厳重警戒", "#F44336"],
    [31, "危険", "#9C27B0"],
    [40, "危険", "#9C27B0"],
  ])("WBGT=%i は level=%s color=%s", (value, level, color) => {
    expect(utils.getWbgtLevel(value)).toEqual({ level, color });
  });
});

describe("getForecastLabel", () => {
  test("当日5時発表分（time=05）は「本日」", () => {
    mockNow("2025-08-10T07:00:00");
    expect(utils.getForecastLabel()).toBe("本日8月10日の予報");
  });

  test("当日10時発表分（time=10）は「本日」", () => {
    mockNow("2025-08-10T12:00:00");
    expect(utils.getForecastLabel()).toBe("本日8月10日の予報");
  });

  test("17時発表分（time=17）は「明日」表記になる（実装上の既知挙動）", () => {
    mockNow("2025-08-10T20:00:00");
    expect(utils.getForecastLabel()).toBe("明日8月11日の予報");
  });
});
