"use client";

import Heatmap from "~/components/8starlabs-ui/heatmap";
import type { UsageHeatmapDay } from "#shared/types/usage-stats";

const ORANGE_SCALE = [
  "var(--heatmap-zero)",
  "#fed7aa",
  "#fdba74",
  "#fb923c",
  "#ea580c",
];

export function ProfileActivityHeatmap({ data }: { data: UsageHeatmapDay[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  const startDate = new Date(`${data[0]!.date}T00:00:00`);
  const endDate = new Date(`${data[data.length - 1]!.date}T00:00:00`);

  return (
    <div className="overflow-x-auto">
      <Heatmap
        cellSize={12}
        className="min-w-max"
        colorMode="discrete"
        colorScale={ORANGE_SCALE}
        data={data}
        daysOfTheWeek="MWF"
        displayStyle="bubbles"
        endDate={endDate}
        gap={3}
        startDate={startDate}
        valueDisplayFunction={(value) =>
          value === 1 ? "1 turn" : `${value} turns`
        }
      />
    </div>
  );
}
