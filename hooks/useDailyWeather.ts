import { useQuery } from "@tanstack/react-query";
import { WeatherService } from "@/services/WeatherService";

export function useDailyWeather(
  latitude: number | undefined,
  longitude: number | undefined
) {
  return useQuery({
    queryKey: ["weather", "daily", latitude, longitude],
    queryFn: async () => {
      const result = await WeatherService.getDailyWeather(
        latitude!,
        longitude!
      );
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    enabled: latitude !== undefined && longitude !== undefined,
  });
}
