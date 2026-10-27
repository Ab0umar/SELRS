import { Link } from "wouter";
import AiManagement from "../admin/AiManagement";
import { aiPages } from "./navigation";

export default function AiOverview() {
  return (
    <section aria-label="نظرة عامة على الذكاء الاصطناعي">
      <AiManagement view="overview" />
      <h2 className="mt-6 mb-3 text-lg font-semibold">أدوات الموديول</h2>
      <ul className="ai-tool-list">
        {aiPages.slice(1).map((page) => (
          <li key={page.path}>
            <Link href={page.path}>
              <strong>{page.label}</strong>
              <span>{page.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
