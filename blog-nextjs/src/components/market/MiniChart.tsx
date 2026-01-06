/**
 * 迷你走势图组件
 *
 * 使用 ECharts 绘制价格走势图
 */

"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { PricePoint } from "@/types/market";

// 注册 ECharts 组件
echarts.use([LineChart, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer]);

interface MiniChartProps {
  data: PricePoint[];
  color?: string;
  height?: number;
}

export function MiniChart({ data, color = "#3b82f6", height = 120 }: MiniChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    // 提取时间和价格数据
    const times = data.map((point) => {
      const date = new Date(point.timestamp);
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(
        date.getMinutes()
      ).padStart(2, "0")}`;
    });
    const prices = data.map((point) => point.price);

    // 计算涨跌
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const isPositive = lastPrice >= firstPrice;

    // 配置图表
    const option: any = {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const param = params[0];
          return `${param.name}<br/>价格: $${param.value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
        },
      },
      grid: {
        left: 0,
        right: 0,
        top: 10,
        bottom: 0,
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: times,
        show: false,
      },
      yAxis: {
        type: "value",
        show: false,
        scale: true,
      },
      series: [
        {
          name: "价格",
          type: "line",
          data: prices,
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: isPositive ? "#10b981" : "#ef4444",
            width: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: isPositive ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
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

    // 响应式
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, color]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-muted/20 rounded"
        style={{ height: `${height}px` }}
      >
        <span className="text-xs text-muted-foreground">无数据</span>
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: "100%", height: `${height}px` }} />;
}
