"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface HistoricalPoint {
  timestamp: string;
  price: number;
}

interface HistoricalData {
  btc: HistoricalPoint[];
  eth: HistoricalPoint[];
  sp500: HistoricalPoint[];
  sse: HistoricalPoint[];
  hsi: HistoricalPoint[];
  hstech: HistoricalPoint[];
  timestamp: string;
}

interface AssetConfig {
  key: keyof Pick<HistoricalData, "btc" | "eth" | "sp500" | "sse" | "hsi" | "hstech">;
  label: string;
  formatPrice: (price: number) => string;
}

const ASSETS: AssetConfig[] = [
  {
    key: "btc",
    label: "比特币 BTC",
    formatPrice: (p) =>
      `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  {
    key: "eth",
    label: "以太坊 ETH",
    formatPrice: (p) =>
      `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  {
    key: "sp500",
    label: "美股 S&P 500",
    formatPrice: (p) =>
      `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  {
    key: "sse",
    label: "A股 上证指数",
    formatPrice: (p) =>
      `${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 点`,
  },
  {
    key: "hsi",
    label: "港股 恒生指数",
    formatPrice: (p) =>
      `${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 点`,
  },
  {
    key: "hstech",
    label: "恒生科技",
    formatPrice: (p) =>
      `${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 点`,
  },
];

function ChartCard({ asset, data }: { asset: AssetConfig; data: HistoricalPoint[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const firstPrice = data[0]?.price ?? 0;
  const lastPrice = data[data.length - 1]?.price ?? 0;
  const changePercent = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const isPositive = changePercent >= 0;
  const lineColor = isPositive ? "#10b981" : "#ef4444";

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;
    const prices = data.map((p) => p.price);
    const timestamps = data.map((p) => p.timestamp);

    const option: any = {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const param = params[0];
          const date = param.name;
          return `${date}<br/>${asset.formatPrice(param.value)}`;
        },
      },
      grid: {
        left: 0,
        right: 0,
        top: 8,
        bottom: 20,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: timestamps,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 10,
          color: "#9ca3af",
          interval: (index: number) => {
            if (index === 0) return true;
            const prev = timestamps[index - 1];
            const curr = timestamps[index];
            if (!prev || !curr) return false;
            const prevMonth = parseInt(prev.split("-")[1], 10);
            const currMonth = parseInt(curr.split("-")[1], 10);
            return currMonth !== prevMonth && currMonth % 2 === 1;
          },
          formatter: (value: string) => {
            const month = parseInt(value.split("-")[1], 10);
            return `${month}月`;
          },
        },
      },
      yAxis: {
        type: "value",
        show: false,
        scale: true,
      },
      series: [
        {
          type: "line",
          data: prices,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: lineColor, width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: isPositive ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)",
              },
              {
                offset: 1,
                color: isPositive ? "rgba(16, 185, 129, 0)" : "rgba(239, 68, 68, 0)",
              },
            ]),
          },
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data, asset]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900/60 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{asset.label}</div>
          <div className="text-sm font-bold tabular-nums">{asset.formatPrice(lastPrice)}</div>
        </div>
        <div
          className={`text-xs font-medium tabular-nums px-1.5 py-0.5 rounded ${
            isPositive
              ? "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30"
              : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
          }`}
        >
          {isPositive ? "+" : ""}
          {changePercent.toFixed(2)}%
        </div>
      </div>
      <div ref={chartRef} style={{ width: "100%", height: "160px" }} />
    </div>
  );
}

export function MarketCharts() {
  const [data, setData] = useState<HistoricalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/market/historical");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("获取历史数据失败:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 rounded-xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900/60 rounded-xl p-3 animate-pulse"
            >
              <div className="flex justify-between mb-2">
                <div>
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="h-[160px] bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 rounded-xl p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ASSETS.map((asset) => (
          <ChartCard key={asset.key} asset={asset} data={data[asset.key] || []} />
        ))}
      </div>
    </div>
  );
}
