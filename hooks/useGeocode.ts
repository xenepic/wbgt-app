import { useQuery } from "@tanstack/react-query";
import { GeoService } from "@/services/GeoService";

export function useGeocode(enabled: boolean) {
  return useQuery({
    queryKey: ["geocode"],
    queryFn: async () => {
      const result = await GeoService.getGeocode();
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    enabled,
    staleTime: Infinity, // 起動中に現在地が変わることは想定しない
  });
}
