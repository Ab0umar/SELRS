export interface ReadyTestTemplateItem {
  testId: number;
  testName: string;
  notes: string;
}

export interface ReadyTestTemplate {
  id: string;
  name: string;
  sourceFile: string;
  items: ReadyTestTemplateItem[];
}

export const READY_TEST_TEMPLATES: ReadyTestTemplate[] = [];
