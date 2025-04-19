"use client";
import React, { FC, useRef, useEffect, useState } from "react";
import "../app/globals.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
  ScriptableContext,
  Plugin,
  ChartType,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { motion } from "framer-motion";

// -----------------------------------------------------------
// 1) REGISTER BASE COMPONENTS
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// -----------------------------------------------------------
// 2) CREATE A "GLOW SHADOW" PLUGIN
const glowLinePlugin: Plugin<ChartType> = {
  id: "glowLine",
  beforeDatasetsDraw: (chart) => {
    const { ctx } = chart;
    // Force-cast to any so TS doesn't complain about apply(...) usage
    // const originalStroke = ctx.stroke as any;
    
    // capture the original stroke function with correct typing
    const originalStroke = ctx.stroke.bind(ctx);
    
    // override `stroke` using the exact parameter tuple
    // ctx.stroke = function (...args: any[]) {
      ctx.stroke = function (this: CanvasRenderingContext2D, path?: Path2D) {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      //originalStroke.apply(this, args);
      if (path instanceof Path2D) {
        // draw the given Path2D
        originalStroke(path);
      } else {
        // draw the current path
        originalStroke();
      }
        ctx.restore();
    };
  },
};

ChartJS.register(glowLinePlugin);

// -----------------------------------------------------------
// 3) ChartProps interface
interface ChartProps {
  data: number[];
  label: string;
  xLabels?: (string | number)[];
  yAxisLabel?: string;
  xAxisLabel?: string;
  darkMode?: boolean;
}

// -----------------------------------------------------------
// 4) The Enhanced Chart Component
const Chart: FC<ChartProps> = ({
  data,
  label,
  xLabels,
  yAxisLabel,
  xAxisLabel,
  darkMode,
}) => {
  const chartRef = useRef<ChartJS<"line">>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // -----------------------------------------------------------
  // A) CHOOSE COLORS & GRADIENTS (multi-stop, dark-mode aware)
  const getColorScheme = () => {
    if (label.includes("Transfer")) {
      return {
        primary: darkMode ? "rgba(99,102,241,1)" : "rgba(99,102,241,0.8)",
        gradient: {
          start: "rgba(99,102,241,0.5)",
          mid: "rgba(99,102,241,0.3)",
          end: "rgba(99,102,241,0)",
        },
      };
    } else if (label.includes("Fee")) {
      return {
        primary: darkMode ? "rgba(14,165,233,1)" : "rgba(14,165,233,0.8)",
        gradient: {
          start: "rgba(14,165,233,0.5)",
          mid: "rgba(14,165,233,0.3)",
          end: "rgba(14,165,233,0)",
        },
      };
    } else {
      return {
        primary: darkMode ? "rgba(168,85,247,1)" : "rgba(168,85,247,0.8)",
        gradient: {
          start: "rgba(168,85,247,0.5)",
          mid: "rgba(168,85,247,0.3)",
          end: "rgba(168,85,247,0)",
        },
      };
    }
  };

  const colorScheme = getColorScheme();

  // B) Create multi-stop gradient fill
  const createFillGradient = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, colorScheme.gradient.start);
    gradient.addColorStop(0.5, colorScheme.gradient.mid);
    gradient.addColorStop(1, colorScheme.gradient.end);
    return gradient;
  };

  // C) Create a gradient stroke that transitions horizontally
  const createStrokeGradient = (
    ctx: CanvasRenderingContext2D,
    chartArea: { left: number; right: number }
  ) => {
    const gradient = ctx.createLinearGradient(
      chartArea.left,
      0,
      chartArea.right,
      0
    );
    gradient.addColorStop(0, colorScheme.primary);
    // We can pick a second color for the stroke's end if desired:
    gradient.addColorStop(
      1,
      darkMode ? "rgba(14,165,233,1)" : "rgba(14,165,233,0.8)"
    );
    return gradient;
  };

  // -----------------------------------------------------------
  // D) BUILD THE CHART DATA
  const chartLabels =
    xLabels && xLabels.length === data.length
      ? [...xLabels]
      : data.map((_, i) => i + 1);
  const chartDatasetData = [...data];
  const chartData: ChartData<"line"> = {
    labels: chartLabels,
    datasets: [
      {
        label: label,
        data: chartDatasetData,
        // gradient stroke
        borderColor: (ctx: ScriptableContext<"line">) => {
          const { chart } = ctx;
          const chartArea = chart.chartArea;
          if (!chartArea) return colorScheme.primary; // fallback
          return createStrokeGradient(chart.ctx, chartArea);
        },
        // gradient fill
        backgroundColor: (ctx: ScriptableContext<"line">) => {
          return createFillGradient(ctx.chart.ctx);
        },
        fill: true,
        pointBackgroundColor: colorScheme.primary,
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 10,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  // -----------------------------------------------------------
  // E) DETERMINE DYNAMIC Y-AXIS SCALING IF label.includes("Fee")
  // let yScaleOptions: any = {
  //   beginAtZero: true,
  //   grid: {
  //     color: darkMode ? "rgba(255,255,255,0.05)" : "rgba(107,114,128,0.1)",
  //   },
  //   border: { display: false },
  //   ticks: {
  //     font: {
  //       size: 11,
  //       family: "'Inter', system-ui, sans-serif",
  //     },
  //     color: darkMode ? "rgba(200,200,200,0.7)" : "rgba(107,114,128,1)",
  //     padding: 8,
  //   },
  //   format: {
  //     style: "decimal",
  //     notation: "standard", // prevents e-notation
  //     maximumSignificantDigits: 7, // up to 7 digits
  //   },
  //   title: {
  //     display: !!yAxisLabel,
  //     text: yAxisLabel,
  //     font: {
  //       size: 12,
  //       family: "'Inter', system-ui, sans-serif",
  //       weight: 500,
  //     },
  //     padding: { bottom: 8 },
  //     color: darkMode ? "#fff" : "#111",
  //   },
  //   type: "logarithmic",
  // };

  // if (label.includes("Fee")) {
  //   // We want to emphasize small changes in fee data
  //   // Compute min & max, add padding so it doesn't look flat
  //   const dataMin = Math.min(...data);
  //   const dataMax = Math.max(...data);
  //   const range = dataMax - dataMin;
  //   // If range is extremely small, we can set a fallback
  //   const minRange = 0.1; // ensure some minimal range
  //   const actualRange = Math.max(range, minRange);
  //   const padding = actualRange * 0.5;

  //   yScaleOptions.beginAtZero = false;
  //   yScaleOptions.min = dataMin - padding;
  //   yScaleOptions.max = dataMax + padding;
  // }

  // -----------------------------------------------------------
  // F) CHART OPTIONS
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 20, bottom: 20, left: 10, right: 10 },
    },
    animation: {
      duration: 1500,
      easing: "easeInOutQuad",
    },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: label,
        padding: { bottom: 16 },
        font: {
          size: 16,
          family: "'Inter', system-ui, sans-serif",
          weight: 600,
        },
        color: darkMode ? "#fff" : "#111",
      },
      tooltip: {
        backgroundColor: darkMode
          ? "rgba(17, 24, 39, 0.9)"
          : "rgba(0, 0, 0, 0.7)",
        titleFont: {
          size: 13,
          family: "'Inter', system-ui, sans-serif",
          weight: 600,
        },
        bodyFont: {
          size: 12,
          family: "'Inter', system-ui, sans-serif",
        },
        padding: 12,
        cornerRadius: 8,
        usePointStyle: true,
        callbacks: {
          title: (items) => `Block #${items[0].label}`,
          label: (context) => {
            const value = context.parsed.y;
            if (label.includes("Fee")) {
              return `${value.toFixed(2)} Gwei`;
            }
            if (label.includes("Gas")) {
              return `${value.toFixed(2)}%`;
            }
            return value.toFixed(2);
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          font: { size: 11, family: "'Inter', system-ui, sans-serif" },
          color: darkMode ? "rgba(200,200,200,0.7)" : "rgba(107,114,128,1)",
        },
        title: {
          display: !!xAxisLabel,
          text: xAxisLabel || "",
          font: {
            size: 12,
            family: "'Inter', system-ui, sans-serif",
            weight: 500,
          },
          padding: 8,
          color: darkMode ? "#fff" : "#111",
        },
      },
      y: {
          type: "logarithmic",
          // set your floor or dynamic Fee min/max right inline
          min: label.includes("Fee")
          ? Math.min(...data) - Math.max((Math.max(...data) - Math.min(...data)), 0.1) * 0.5
            : 1,
          suggestedMin: 1,
          grid: {
            color: darkMode ? "rgba(255,255,255,0.05)" : "rgba(107,114,128,0.1)",
          },
          ticks: {
            font: { size: 11, family: "'Inter', system-ui, sans-serif" },
            color: darkMode ? "rgba(200,200,200,0.7)" : "rgba(107,114,128,1)",
            padding: 8,
          },
          title: {
            display: !!yAxisLabel,
            text: yAxisLabel || "",
            font: { size: 12, family: "'Inter', system-ui, sans-serif", weight: 500 },
            padding: 8,
            color: darkMode ? "#fff" : "#111",
          },
        },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
    elements: {
      line: { borderJoinStyle: "round", borderCapStyle: "round" },
    },
  };

  // -----------------------------------------------------------
  // G) RETURN THE MOTION-WRAPPED CHART
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.5 }}
      className="w-full h-[300px] p-4 rounded-xl
                 bg-white/80 dark:bg-gray-800/50
                 backdrop-blur-sm border border-gray-200
                 dark:border-gray-700/50 shadow-lg"
    >
      <Line ref={chartRef} data={chartData} options={options} />
    </motion.div>
  );
};

export default Chart;
