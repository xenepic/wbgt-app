import { Stack, StackProps, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";

export class WbgtCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 1) バケット
    const bucket = new s3.Bucket(this, "WbgtDataBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN, // 本番はRETAIN推奨
      autoDeleteObjects: false,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ["*"], // 必要に応じて限定
          allowedHeaders: ["*"],
        },
      ],
    });

    // 共通環境変数
    const commonEnv = {
      BUCKET_NAME: bucket.bucketName,
      OBJECT_KEY_PREFIX: "wbgt",
    };

    // 2) 取得バッチLambda
    const fetchFn = new nodejs.NodejsFunction(this, "FetchWbgtFn", {
      entry: "src/lambdas/fetch-wbgt.ts",
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: Duration.seconds(30),
      environment: commonEnv,
    });
    bucket.grantWrite(fetchFn);

    // 3) API Lambda
    const apiFn = new nodejs.NodejsFunction(this, "GetWbgtFn", {
      entry: "src/lambdas/get-wbgt.ts",
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: Duration.seconds(15),
      environment: commonEnv,
    });
    bucket.grantRead(apiFn);

    // 4) EventBridge で 1日3回（05,11,17 JST）に相当するUTCを指定
    // JST(UTC+9) → UTCは -9時間
    // 05:00 JST = 前日 20:00 UTC, 11:00 JST = 02:00 UTC, 17:00 JST = 08:00 UTC
    new events.Rule(this, "FetchScheduleRule", {
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "20,2,8", // UTC
        day: "*",
        month: "*",
        year: "*",
      }),
      targets: [new targets.LambdaFunction(fetchFn)],
    });

    // 5) API Gateway HTTP API（安価）
    const httpApi = new apigwv2.HttpApi(this, "WbgtHttpApi");
    httpApi.addRoutes({
      path: "/wbgt/latest",
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        "GetWbgtIntegration",
        apiFn
      ),
    });

    // 追加: v1 付き
    httpApi.addRoutes({
      path: "/wbgt/v1/latest",
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        "GetWbgtV1Integration",
        apiFn
      ),
    });

    // 出力（デプロイ後にコンソールに表示）
    new (require("aws-cdk-lib").CfnOutput)(this, "ApiUrl", {
      value: httpApi.apiEndpoint + "/wbgt/v1/latest",
    });
  }
}
