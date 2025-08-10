type WbgtTime = "05" | "10" | "17";
type WbgtMap = Record<string, number>;

interface WbgtData {
  areaCode: string;
  areaDisplayNumber: string;
  areaDisplaySubNumber: string;
  areaName: string;
  maxWbgt5: WbgtMap;
  maxWbgt10: WbgtMap;
  maxWbgt17: WbgtMap;
  prefectureCode: string;
  prefectureName: string;
  targetDate1Flag: string;
  targetDate2Flag: string;
}
