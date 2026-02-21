"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { TimeSeriesRanking } from "@/types/llm";

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

interface UsageTrendsChartProps {
  data: TimeSeriesRanking[];
  modelNames: { [key: string]: string }; // modelId -> modelName
  title?: string;
}

export function UsageTrendsChart({
  data,
  modelNames,
  title = "使用量趋势（最近30天）",
}: UsageTrendsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    // 提取时间戳
    const timestamps = data.map((d) => d.timestamp);

    // 提取所有模型ID并按最新使用量排序（取前10）
    const latestRankings = data[data.length - 1].rankings;
    const topModelIds = Object.entries(latestRankings)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id);

    // 为每个模型生成系列数据
    const series = topModelIds.map((modelId, index) => {
      const values = data.map((d) => (d.rankings[modelId] || 0) / 1e9); // 转换为十亿单位

      // 生成颜色
      const colors = [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
        "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
      ];

      return {
        name: modelNames[modelId] || modelId,
        type: "line",
        data: values,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        itemStyle: { color: colors[index % colors.length] },
      };
    });

    const option: any = {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "transparent",
        textStyle: { color: "#fff" },
        formatter: (params: any) => {
          const date = params[0].name;
          let html = `<div style="font-weight: bold; margin-bottom: 4px;">${date}</div>`;
          params.forEach((param: any) => {
            html += `<div style="display: flex; align-items: center; margin-top: 2px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${param.color}; margin-right: 6px;"></span>
              <span style="flex: 1;">${param.seriesName}</span>
              <span style="font-weight: bold; margin-left: 12px;">${param.value.toFixed(1)}B</span>
            </div>`;
          });
          return html;
        },
      },
      legend: {
        top: 10,
        textStyle: {
          color: "#9ca3af",
        },
        type: "scroll",
      },
      grid: {
        left: 60,
        right: 40,
        top: 60,
        bottom: 80,
      },
      xAxis: {
        type: "category",
        data: timestamps,
        axisLine: { lineStyle: { color: "#374151" } },
        axisLabel: {
          color: "#9ca3af",
          formatter: (value: string) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          },
        },
      },
      yAxis: {
        type: "value",
        name: "使用量 (B Tokens)",
        nameTextStyle: { color: "#9ca3af" },
        axisLine: { lineStyle: { color: "#374151" } },
        axisLabel: { color: "#9ca3af" },
        splitLine: { lineStyle: { color: "#374151", type: "dashed" } },
      },
      dataZoom: [
        {
          type: "slider",
          start: 0,
          end: 100,
          height: 20,
          bottom: 20,
          borderColor: "transparent",
          backgroundColor: "#1f2937",
          fillerColor: "rgba(59, 130, 246, 0.2)",
          handleStyle: { color: "#3b82f6" },
          textStyle: { color: "#9ca3af" },
        },
      ],
      series,
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data, modelNames]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900/60 rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div ref={chartRef} style={{ width: "100%", height: "400px" }} />
    </div>
  );
}
