// 数据展板（/console/displayBoard）统计类型，对应后端 /statisticalCenter/*。

// POST /statisticalCenter/peopleCount：用户统计（data 为 Map，key 固定）。
export interface PeopleCount {
  /** 当前系统用户数 */
  total: number;
  /** 今日注册数 */
  todayRegister: number;
}

// 通用图表数据（peopleCreateByDay / apiReqTotal）：x 轴名称集 + y 轴数据集。
// 后端声明 ydata 为 List<Object>，实际为数值，这里收窄为 number（渲染前仍做 Number() 兜底）。
export interface ChartData {
  xdata: string[];
  ydata: number[];
}
