"use client";

import type { TimelinePoint } from "@/types/sky";

export default function TimelineGradient({ timeline }: { timeline: TimelinePoint[] }) {
  const gradient = timeline.length
    ? `linear-gradient(90deg, ${timeline.map((point, index) => `${point.hex} ${(index / Math.max(1, timeline.length - 1)) * 100}%`).join(", ")})`
    : "linear-gradient(90deg, #081226, #5aaee8)";

  return (
    <section className="timelinePanel" aria-label="24 hour sky color timeline">
      <div className="panelTitle">
        <p className="eyebrow">24 hours</p>
        <h2>Sky color gradient</h2>
      </div>
      <div className="timelineBar" style={{ background: gradient }} />
      <div className="timelineTicks">
        {timeline.filter((_, index) => index % 6 === 0).map((point) => (
          <span key={point.hour}>{new Date(point.hour).getHours().toString().padStart(2, "0")}:00</span>
        ))}
      </div>
    </section>
  );
}
