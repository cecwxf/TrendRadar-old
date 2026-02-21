"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { MarketShare } from "@/types/llm";

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

interface MarketShareChartProps {
  data: MarketShare[];
  title?: string;
}

export function MarketShareChart({
  data,
  title = "市场份额（按提供商）",
}: MarketShareChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    const pieData = data.map((item) => ({
      name: item.provider,
      value: item.share_percent,
    }));

    const option: any = {
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "transparent",
        textStyle: { color: "#fff" },
        formatter: (params: any) => {
          const item = data.find((d) => d.provider === params.name);
          return `
            <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
            <div>市场份额: <strong>${params.value.toFixed(1)}%</strong></div>
            <div>Token数: <strong>${(item?.total_tokens || 0) / 1e9}B</strong></div>
            <div>模型数: <strong>${item?.model_count || 0}</strong></div>
          `;
        },
      },
      legend: {
        orient: "vertical",
        right: 20,
        top: "center",
        textStyle: { color: "#9ca3af" },
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          center: ["40%", "50%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: "#1f2937",
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: "{b}: {d}%",
            color: "#9ca3af",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: "bold",
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          data: pieData,
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data]);

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
