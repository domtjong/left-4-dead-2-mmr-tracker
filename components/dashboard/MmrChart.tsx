"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartData = [
  { match: "M1", mmr: 2100 },
  { match: "M2", mmr: 2140 },
  { match: "M3", mmr: 2090 },
  { match: "M4", mmr: 2185 },
  { match: "M5", mmr: 2210 },
  { match: "M6", mmr: 2170 },
  { match: "M7", mmr: 2265 },
  { match: "M8", mmr: 2240 },
  { match: "M9", mmr: 2315 },
  { match: "M10", mmr: 2290 },
  { match: "M11", mmr: 2360 },
  { match: "M12", mmr: 2420 },
];

const chartConfig = {
  mmr: {
    label: "MMR",
    color: "#8438FF",
  },
} satisfies ChartConfig;

export default function MmrChart() {
  return (
    <ChartContainer config={chartConfig} className="h-[240px] w-full">
      <AreaChart data={chartData} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
        <defs>
          <linearGradient id="fillMmr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-mmr)" stopOpacity={0.5} />
            <stop offset="95%" stopColor="var(--color-mmr)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="match"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
        />
        <YAxis domain={["dataMin - 40", "dataMax + 40"]} hide />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area
          dataKey="mmr"
          type="monotone"
          stroke="var(--color-mmr)"
          strokeWidth={3}
          fill="url(#fillMmr)"
          dot={false}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
