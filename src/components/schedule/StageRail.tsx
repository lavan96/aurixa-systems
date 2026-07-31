import { Check } from "lucide-react";

export type StageState = "complete" | "current" | "upcoming";

export type Stage = {
  /** Two-digit stage number, e.g. "01". */
  number: string;
  name: string;
  state: StageState;
};

const STATUS_LABEL: Record<StageState, string> = {
  complete: "Completed",
  current: "In progress",
  upcoming: "Not started",
};

/**
 * The application path across the top of Stage 3.
 *
 * Markers sit on one axis with the connector drawn between their centres, so
 * the rail stays aligned at any width instead of relying on a fixed offset.
 * Below 640px the same markup becomes a vertical rail.
 */
export function StageRail({ stages }: { stages: readonly Stage[] }) {
  const currentIndex = Math.max(stages.findIndex((stage) => stage.state === "current"), 0);
  const completed = stages.filter((stage) => stage.state === "complete").length;

  return (
    <nav className="stage-rail" aria-label="Application stages">
      <div className="stage-rail__meta">
        <span>APPLICATION PATH</span>
        <i aria-hidden="true" />
        <span>STAGE {stages[currentIndex]?.number ?? "01"} OF {String(stages.length).padStart(2, "0")}</span>
      </div>
      <ol className="stage-rail__stages">
        {stages.map((stage, index) => (
          <li
            key={stage.number}
            className={`stage-rail__stage is-${stage.state}`}
            aria-current={stage.state === "current" ? "step" : undefined}
          >
            {index > 0 && <i className={`stage-rail__link ${index <= completed ? "is-filled" : ""}`} aria-hidden="true" />}
            <span className="stage-rail__marker" aria-hidden="true">
              {stage.state === "complete" ? <Check /> : <b />}
            </span>
            <span className="stage-rail__number">STAGE {stage.number}</span>
            <span className="stage-rail__name">{stage.name}</span>
            <span className="stage-rail__status">{STATUS_LABEL[stage.state]}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
