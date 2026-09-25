const fs = require('fs');
let content = fs.readFileSync('components/idea/BuildBriefDialog.tsx', 'utf8');

content = content.replace(
  'import { useOverlay } from "@/lib/ui/dialogs";',
  'import { useOverlay } from "@/lib/ui/dialogs";\nimport { useTranslation } from "@/lib/ui/useTranslation";'
);

content = content.replace(
  'export function BuildBriefDialog({ idea, open, onClose }: { idea: Idea; open: boolean; onClose: () => void }) {\n  const [copiedPrompt, setCopiedPrompt] = useState(false);\n  const [copiedIdea, setCopiedIdea] = useState(false);',
  'export function BuildBriefDialog({ idea, open, onClose }: { idea: Idea; open: boolean; onClose: () => void }) {\n  const [copiedPrompt, setCopiedPrompt] = useState(false);\n  const [copiedIdea, setCopiedIdea] = useState(false);\n  const { t } = useTranslation();'
);

content = content.replace(
  'toast("ĐÃ SAO CHÉP PROMPT CHO AI", {\n      detail: "Dán vào Cursor, Claude, ChatGPT hoặc v0 để bắt đầu lập trình ngay",\n    });',
  'toast(t("copied_prompt"), {\n      detail: t("copied_prompt_detail"),\n    });'
);

content = content.replace(
  'toast("ĐÃ SAO CHÉP TÓM TẮT Ý TƯỞNG", {\n      detail: "Đã lưu vào bộ nhớ tạm của bạn",\n    });',
  'toast(t("copied_summary"), {\n      detail: t("copied_summary_detail"),\n    });'
);

content = content.replace(
  'title={`BẢN ĐẶC TẢ TRIỂN KHAI // ${idea.concept.name}`}',
  'title={`${t("build_brief_title")} ${idea.concept.name}`}'
);

content = content.replace(
  '{copiedIdea ? "ĐÃ SAO CHÉP ✓" : "SAO CHÉP TÓM TẮT"}',
  '{copiedIdea ? t("copied_ok") : t("copy_summary")}'
);

content = content.replace(
  '{copiedPrompt ? "ĐÃ SAO CHÉP PROMPT ✓" : "SAO CHÉP PROMPT CHO AI"}',
  '{copiedPrompt ? t("copied_ok") : t("copy_prompt")}'
);

fs.writeFileSync('components/idea/BuildBriefDialog.tsx', content);
