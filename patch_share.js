const fs = require('fs');
let content = fs.readFileSync('components/idea/ShareDialog.tsx', 'utf8');

content = content.replace(
  'import { useOverlay } from "@/lib/ui/dialogs";',
  'import { useOverlay } from "@/lib/ui/dialogs";\nimport { useTranslation } from "@/lib/ui/useTranslation";'
);

content = content.replace(
  'export function ShareDialog({ idea, open, onClose, eyebrow }: ShareDialogProps) {\n  const [copiedLink, setCopiedLink] = useState(false);\n  const [copiedText, setCopiedText] = useState(false);\n  const [isExporting, setIsExporting] = useState(false);',
  'export function ShareDialog({ idea, open, onClose, eyebrow }: ShareDialogProps) {\n  const [copiedLink, setCopiedLink] = useState(false);\n  const [copiedText, setCopiedText] = useState(false);\n  const [isExporting, setIsExporting] = useState(false);\n  const { t } = useTranslation();'
);

content = content.replace(
  'toast("ĐÃ SAO CHÉP ĐƯỜNG LINK", { detail: url });',
  'toast(t("share_link_copied"), { detail: url });'
);

content = content.replace(
  'toast("ĐÃ SAO CHÉP TÓM TẮT", { detail: "Sẵn sàng để dán vào tin nhắn" });',
  'toast(t("share_summary_copied"), { detail: t("share_summary_detail") });'
);

content = content.replace(
  'toast("ĐÃ TẢI XUỐNG ẢNH POSTER", { detail: "Độ phân giải cao 1080×1350 PNG" });',
  'toast(t("poster_downloaded"), { detail: t("poster_detail") });'
);

content = content.replace(
  'title={`CHIA SẺ // ${idea.concept.name}`}',
  'title={`${t("share_title")} ${idea.concept.name}`}'
);

content = content.replace(
  'ĐANG TẠO ẢNH POSTER…',
  '{t("generating_poster")}'
);

content = content.replace(
  '<span className="text-xs font-mono text-muted uppercase">LINK CHIA SẺ TRỰC TIẾP</span>',
  '<span className="text-xs font-mono text-muted uppercase">{t("direct_link")}</span>'
);

content = content.replace(
  '{copiedLink ? "ĐÃ SAO CHÉP ✓" : "SAO CHÉP"}',
  '{copiedLink ? t("copied_ok") : t("copy")}'
);

content = content.replace(
  'TẢI XUỐNG ẢNH POSTER (PNG)',
  '{t("download_poster")}'
);

content = content.replace(
  '{copiedText ? "ĐÃ SAO CHÉP ✓" : "SAO CHÉP VĂN BẢN TÓM TẮT"}',
  '{copiedText ? t("copied_ok") : t("copy_text_summary")}'
);

content = content.replace(
  'CHIA SẺ LÊN ỨNG DỤNG KHÁC…',
  '{t("share_other_apps")}'
);

fs.writeFileSync('components/idea/ShareDialog.tsx', content);
