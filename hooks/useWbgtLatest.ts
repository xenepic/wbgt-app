import { useQuery } from "@tanstack/react-query";
import { WeatherService } from "@/services/WeatherService";

export function useWbgtLatest(
  pref: string | undefined,
  city: string | undefined,
  time: WbgtTime
) {
  return useQuery({
    queryKey: ["wbgt", "latest", pref, city, time],
    queryFn: async () => {
      const result = await WeatherService.getWbgtLatest(pref!, city!, time);
      if (!result.ok) throw new Error(result.message);
      return { wbgt: result.wbgt, publishedAtJst: result.publishedAtJst };
    },
    enabled: !!pref && !!city,
  });
}
