import {
  toJstDate,
  buildCandidateUrls,
  extractPublishedAtFromUrl,
  csvToJson,
} from "../src/lambdas/fetch-wbgt";

describe("toJstDate", () => {
  test("UTCに9時間加算する", () => {
    const utc = new Date("2025-08-10T00:00:00Z");
    const jst = toJstDate(utc);
    expect(jst.toISOString()).toBe("2025-08-10T09:00:00.000Z");
  });
});

describe("buildCandidateUrls", () => {
  test("当日17時→10時→5時→前日17時の順で候補を生成する", () => {
    const nowJst = new Date(2025, 7, 10, 12, 0, 0); // 2025-08-10 12:00 (ローカル=JST想定の素朴なDate)
    const urls = buildCandidateUrls(nowJst);
    expect(urls).toEqual([
      "https://www.wbgt.env.go.jp/alert/dl/2025/alert_20250810_17.csv",
      "https://www.wbgt.env.go.jp/alert/dl/2025/alert_20250810_10.csv",
      "https://www.wbgt.env.go.jp/alert/dl/2025/alert_20250810_05.csv",
      "https://www.wbgt.env.go.jp/alert/dl/2025/alert_20250809_17.csv",
    ]);
  });

  test("月初・年初をまたぐ日付でもゼロ詰めされる", () => {
    const nowJst = new Date(2025, 0, 1, 6, 0, 0); // 2025-01-01
    const urls = buildCandidateUrls(nowJst);
    expect(urls[0]).toBe(
      "https://www.wbgt.env.go.jp/alert/dl/2025/alert_20250101_17.csv"
    );
    expect(urls[3]).toBe(
      "https://www.wbgt.env.go.jp/alert/dl/2024/alert_20241231_17.csv"
    );
  });
});

describe("extractPublishedAtFromUrl", () => {
  test("URLから発表日時とstampを抽出する", () => {
    const url =
      "https://www.wbgt.env.go.jp/alert/dl/2025/alert_20250810_05.csv";
    expect(extractPublishedAtFromUrl(url)).toEqual({
      publishedAtJst: "2025-08-10T05:00:00+09:00",
      stamp: "20250810_05",
    });
  });

  test("マッチしないURLはnullを返す", () => {
    expect(extractPublishedAtFromUrl("https://example.com/foo.csv")).toEqual({
      publishedAtJst: null,
      stamp: null,
    });
  });
});

describe("csvToJson", () => {
  test("InternalFlag行以降をパースしてmaxWbgt10/17/5を構築する", () => {
    const csv = [
      "Header1,Header2",
      "InternalFlag,x",
      "SkipThisRow",
      "東京,1,1,44132,東京,13,1,1,東京:28/大手町:27,東京:25/大手町:24,東京:21/大手町:20",
    ].join("\n");

    const result = csvToJson(csv);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      areaName: "東京",
      prefectureName: "東京",
      maxWbgt10: { 東京: 28, 大手町: 27 },
      maxWbgt17: { 東京: 25, 大手町: 24 },
      maxWbgt5: { 東京: 21, 大手町: 20 },
    });
  });

  test("InternalFlag行が無ければ空配列を返す", () => {
    expect(csvToJson("a,b\nc,d")).toEqual([]);
  });
});
