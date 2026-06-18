type HourlyForecast = {
  time: string[];
  temperature_2m: number[];
  precipitation: number[];
  weathercode: number[];
};

type DailyForecast = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  weathercode: number[];
};
