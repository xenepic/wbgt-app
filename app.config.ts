// app.config.ts
import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "wbgt-app",
  slug: config.slug ?? "wbgt-app",
  extra: {
    ...config.extra,
    apiBaseUrl: "https://xh4o6krnn2.execute-api.ap-northeast-1.amazonaws.com",
  },
});
