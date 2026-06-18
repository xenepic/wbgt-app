// src/lambdas/fetch-wbgt.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET_NAME!;
const KEY_PREFIX = process.env.OBJECT_KEY_PREFIX ?? "wbgt";

function toJstDate(d: Date) {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000);
}

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return { y, m, d };
}

function buildCandidateUrls(nowJst: Date) {
  const { y, m, d } = ymd(nowJst);
  // 今日の 17, 10, 05 の順で新しい方からチェック
  const todays = [17, 10, 5].map(
    (h) =>
      `https://www.wbgt.env.go.jp/alert/dl/${y}/alert_${y}${m}${d}_${String(
        h
      ).padStart(2, "0")}.csv`
  );

  // 前日17時も候補に（公開遅延・日跨ぎ対策）
  const prev = new Date(nowJst.getTime() - 24 * 60 * 60 * 1000);
  const { y: py, m: pm, d: pd } = ymd(prev);
  const prev17 = `https://www.wbgt.env.go.jp/alert/dl/${py}/alert_${py}${pm}${pd}_17.csv`;

  return [...todays, prev17];
}

async function tryFetchCsv(url: string): Promise<string | null> {
  const res = await fetch(url);
  if (res.ok) return await res.text();
  if (res.status === 404) return null; // 未公開ならフォールバック
  throw new Error(`WBGT CSV fetch failed: ${res.status} ${res.statusText}`);
}

function extractPublishedAtFromUrl(url: string): {
  publishedAtJst: string | null;
  stamp: string | null;
} {
  // 例: .../alert_20250810_05.csv → 2025-08-10T05:00:00+09:00
  const m = url.match(/alert_(\d{4})(\d{2})(\d{2})_(\d{2})\.csv$/);
  if (!m) return { publishedAtJst: null, stamp: null };
  const [, year, month, day, hour] = m;
  const publishedAtJst = `${year}-${month}-${day}T${hour}:00:00+09:00`;
  const stamp = `${year}${month}${day}_${hour}`;
  return { publishedAtJst, stamp };
}

function csvToJson(csv: string) {
  const rows = csv
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(","));

  const internalFlagIndex = rows.findIndex((r) => r[0] === "InternalFlag");
  if (internalFlagIndex < 0) return [];

  const body = rows.slice(internalFlagIndex + 2).filter((r) => r.length > 2);

  const list = body.map((d) => {
    const result: any = {
      areaName: d[0],
      areaDisplayNumber: d[1],
      areaDisplaySubNumber: d[2],
      areaCode: d[3],
      prefectureName: d[4],
      prefectureCode: d[5],
      targetDate1Flag: d[6],
      targetDate2Flag: d[7],
    };
    // CSVのカラム構成に合わせて 10, 17, 5
    [10, 17, 5].forEach((t, i) => {
      result[`maxWbgt${t}`] = {};
      const cell = d[8 + i];
      if (cell) {
        cell.split("/").forEach((entry: string) => {
          const [place, val] = entry.split(":");
          if (place) result[`maxWbgt${t}`][place] = parseInt(val);
        });
      }
    });
    return result;
  });

  return list;
}

export const handler = async () => {
  const nowJst = toJstDate(new Date());
  const candidates = buildCandidateUrls(nowJst);

  let csv: string | null = null;
  let pickedUrl: string | null = null;

  for (const url of candidates) {
    const t = await tryFetchCsv(url);
    if (t) {
      csv = t;
      pickedUrl = url;
      break;
    }
  }

  if (!csv || !pickedUrl) {
    throw new Error("WBGT CSV not available for any candidate time.");
  }

  const { publishedAtJst, stamp } = extractPublishedAtFromUrl(pickedUrl);
  const items = csvToJson(csv);

  const body = JSON.stringify(
    {
      sourceUrl: pickedUrl,
      publishedAtJst, // ← 公式の“発表日時”（JST）
      updatedAtJst: nowJst.toISOString(), // ← 取得時刻（JST表現のISO）
      items, // ← パース済みデータ
    },
    null,
    2
  );

  const datedKey = `${KEY_PREFIX}/${stamp ?? "unknown"}.json`;
  const latestKey = `${KEY_PREFIX}/latest.json`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: datedKey,
      Body: body,
      ContentType: "application/json",
    })
  );

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: latestKey,
      Body: body,
      ContentType: "application/json",
    })
  );

  return { ok: true, latestKey, publishedAtJst };
};
