import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type {
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { Readable } from "node:stream";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET_NAME!;
const KEY_PREFIX = process.env.OBJECT_KEY_PREFIX ?? "wbgt";

async function streamToString(stream: any): Promise<string> {
  if (typeof stream?.transformToString === "function") {
    return stream.transformToString();
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

const baseHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const handler: APIGatewayProxyHandlerV2 =
  async (): Promise<APIGatewayProxyResultV2> => {
    try {
      const obj = await s3.send(
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: `${KEY_PREFIX}/latest.json`,
        })
      );
      const text = await streamToString(obj.Body);

      return {
        statusCode: 200,
        headers: baseHeaders,
        body: text, // すでにJSON文字列
      };
    } catch (e: any) {
      return {
        statusCode: 500,
        headers: baseHeaders, // 常に同じヘッダを返す
        body: JSON.stringify({
          ok: false,
          message: e?.message ?? "Internal Error",
        }),
      };
    }
  };
