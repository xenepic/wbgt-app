import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { WbgtCdkStack } from "../lib/wbgt-cdk-stack";

function synth() {
  const app = new cdk.App();
  const stack = new WbgtCdkStack(app, "TestStack");
  return Template.fromStack(stack);
}

test("S3バケットに履歴ファイル用のライフサイクルルールがある", () => {
  const template = synth();
  template.hasResourceProperties("AWS::S3::Bucket", {
    LifecycleConfiguration: {
      Rules: [
        {
          Prefix: "wbgt/history/",
          Status: "Enabled",
        },
      ],
    },
  });
});

test("fetch-wbgt失敗時のCloudWatch Alarmが定義されている", () => {
  const template = synth();
  template.resourceCountIs("AWS::CloudWatch::Alarm", 1);
  template.hasResourceProperties("AWS::CloudWatch::Alarm", {
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    Threshold: 1,
  });
});

test("SNSトピックにメール通知のサブスクリプションがある", () => {
  const template = synth();
  template.hasResourceProperties("AWS::SNS::Subscription", {
    Protocol: "email",
    Endpoint: "xenepic.takku@gmail.com",
  });
});

test("EventBridgeのスケジュールがJST 5/11/17時相当のUTCになっている", () => {
  const template = synth();
  template.hasResourceProperties("AWS::Events::Rule", {
    ScheduleExpression: "cron(0 20,2,8 * * ? *)",
  });
});

test("API Gatewayに/wbgt/latestと/wbgt/v1/latestの両ルートがある", () => {
  const template = synth();
  template.resourceCountIs("AWS::ApiGatewayV2::Route", 2);
});
