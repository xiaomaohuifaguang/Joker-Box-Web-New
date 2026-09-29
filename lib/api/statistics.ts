import { api } from "@/lib/api";
import type { ChartData, PeopleCount } from "@/types";

// 统计中心（/statisticalCenter/*）：数据展板数据源，三个接口均为无参 POST。

// 用户统计：系统总用户数 + 今日注册数。
export async function getPeopleCount(): Promise<PeopleCount> {
  const { data } = await api.post<PeopleCount>("/statisticalCenter/peopleCount");
  return data;
}

// 近 7 天新注册用户数：xdata=日期，ydata=注册数。
export async function getPeopleCreateByDay(): Promise<ChartData> {
  const { data } = await api.post<ChartData>(
    "/statisticalCenter/peopleCreateByDay",
  );
  return data;
}

// API 请求统计 TOP10：xdata=接口名，ydata=请求次数。
export async function getApiReqTotal(): Promise<ChartData> {
  const { data } = await api.post<ChartData>("/statisticalCenter/apiReqTotal");
  return data;
}
