import { useQuery } from "@tanstack/react-query";
import { WeatherService } from "@/services/WeatherService";

export function useHourlyWeather(
  latitude: number | undefined,
  longitude: number | undefined
) {
  return useQuery({
    queryKey: ["weather", "hourly", latitude, longitude],
    queryFn: async () => {
      const result = await WeatherService.getHourlyWeather(
        latitude!,
        longitude!
      );
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    enabled: latitude !== undefined && longitude !== undefined,
  });
}
