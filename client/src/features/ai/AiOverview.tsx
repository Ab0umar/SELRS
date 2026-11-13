import { Link } from "wouter";
import AiManagement from "../admin/AiManagement";
import { aiSubmodules } from "./navigation";

export default function AiOverview() {
  return (
    <section aria-label="نظرة عامة على AI">
      <AiManagement view="overview" />
      <h2 className="mt-6 mb-3 text-lg font-semibold">الأقسام</h2>
      <ul className="ai-tool-list">
        {aiSubmodules
          .filter((entry) => entry.key !== "core")
          .map((entry) => (
            <li key={entry.home}>
              <Link href={entry.home}>
                <strong>{entry.label}</strong>
                <span>{entry.description}</span>
              </Link>
            </li>
          ))}
      </ul>
    </section>
  );
}
