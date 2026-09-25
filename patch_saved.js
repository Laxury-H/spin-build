const fs = require('fs');
let content = fs.readFileSync('app/saved/page.tsx', 'utf8');

const tHelper = `
const PAGE_T = {
  vi: {
    json_exported: "ĐÃ XUẤT FILE JSON", json_detail: "ý tưởng đã được tải về",
    csv_exported: "ĐÃ XUẤT FILE CSV", csv_detail: "ý tưởng sẵn sàng mở bằng Excel / Google Sheets",
    collection: "BỘ SƯU TẬP Ý TƯỞNG //",
    worth: "ĐÁNG GIỮ",
    keeping: "LẠI.",
    tab_saved: "ĐÃ LƯU",
    tab_history: "LỊCH SỬ QUAY",
    export_json: "Xuất JSON",
    export_csv: "Xuất CSV",
    local_only: "Chỉ lưu cục bộ trên trình duyệt",
    confirm_clear: "Xác nhận xóa?",
    history_cleared: "ĐÃ XÓA LỊCH SỬ", history_detail: "Các mục đã lưu vẫn được giữ nguyên",
    clear_all: "Xóa hết",
    cancel: "Hủy",
    clear_history: "Xóa lịch sử",
    search_placeholder: "Tìm theo tên, lĩnh vực, đối tượng, xu hướng...",
    no_match: "Không tìm thấy ý tưởng khớp với từ khóa.",
    no_saved: "CHƯA LƯU Ý TƯỞNG NÀO.",
    no_history: "CHƯA QUAY LẦN NÀO.",
    hint_search: "Thử tìm kiếm bằng tên danh mục hoặc xóa bộ lọc.",
    hint_saved: "Khi gặp ý tưởng xuất sắc trong phòng Lab, hãy bấm nút Lưu (hoặc nhấn phím S).",
    hint_history: "Hãy quay một vòng tại trang chủ để lưu lại dấu vết sáng tạo.",
    back_to_lab: "VỀ VÒNG QUAY LAB →",
    open_in_lab: "Mở trong Lab",
    saved: "Đã lưu",
    save: "Lưu",
    link_copied: "ĐÃ SAO CHÉP LIÊN KẾT",
    link_failed: "KHÔNG THỂ SAO CHÉP LIÊN KẾT",
    copy_link: "Chép link",
    remove_from_list: "Xóa khỏi danh sách",
    remove: "Xóa"
  },
  en: {
    json_exported: "JSON EXPORTED", json_detail: "ideas downloaded",
    csv_exported: "CSV EXPORTED", csv_detail: "ideas ready for spreadsheet",
    collection: "IDEA COLLECTION //",
    worth: "WORTH",
    keeping: "KEEPING.",
    tab_saved: "SAVED",
    tab_history: "SPIN HISTORY",
    export_json: "Export JSON",
    export_csv: "Export CSV",
    local_only: "Browser local storage only",
    confirm_clear: "Confirm clear?",
    history_cleared: "HISTORY CLEARED", history_detail: "Saved items are kept intact",
    clear_all: "Clear all",
    cancel: "Cancel",
    clear_history: "Clear history",
    search_placeholder: "Search names, domains, targets, trends...",
    no_match: "No matching ideas found.",
    no_saved: "NO SAVED IDEAS YET.",
    no_history: "NO SPIN HISTORY YET.",
    hint_search: "Try searching by category or clear filters.",
    hint_saved: "When you find a great idea in the Lab, click Save (or press S).",
    hint_history: "Spin the wheel to leave your creative footprint.",
    back_to_lab: "BACK TO LAB →",
    open_in_lab: "Open in Lab",
    saved: "Saved",
    save: "Save",
    link_copied: "LINK COPIED",
    link_failed: "FAILED TO COPY LINK",
    copy_link: "Copy link",
    remove_from_list: "Remove from list",
    remove: "Remove"
  }
};
`;

content = content.replace(
  'import { useSpin, selectSavedCount } from "@/lib/store";',
  'import { useSpin, selectSavedCount } from "@/lib/store";\nimport { useTranslation } from "@/lib/ui/useTranslation";\n' + tHelper
);

content = content.replace(
  'export default function SavedPage() {',
  'export default function SavedPage() {\n  const { lang } = useTranslation();\n  const tPage = (key: keyof typeof PAGE_T.vi) => PAGE_T[lang][key] ?? PAGE_T.vi[key];'
);

content = content.replace(/toast\("ĐÃ XUẤT FILE JSON", \{ detail: `\$\{currentList\.length\} ý tưởng đã được tải về` \}\);/, 'toast(tPage("json_exported"), { detail: `${currentList.length} ${tPage("json_detail")}` });');
content = content.replace(/toast\("ĐÃ XUẤT FILE CSV", \{ detail: `\$\{currentList\.length\} ý tưởng sẵn sàng mở bằng Excel \/ Google Sheets` \}\);/, 'toast(tPage("csv_exported"), { detail: `${currentList.length} ${tPage("csv_detail")}` });');
content = content.replace(/>BỘ SƯU TẬP Ý TƯỞNG \/\/</, '>{tPage("collection")}<');
content = content.replace(/>ĐÁNG GIỮ</, '>{tPage("worth")}<');
content = content.replace(/>LẠI\.</, '>{tPage("keeping")}<');
content = content.replace(/\["saved", `ĐÃ LƯU \(\$\{saved\.length\}\)`\],/, '["saved", `${tPage("tab_saved")} (${saved.length})`],');
content = content.replace(/\["history", `LỊCH SỬ QUAY \(\$\{history\.length\}\)`\],/, '["history", `${tPage("tab_history")} (${history.length})`],');
content = content.replace(/>Xuất JSON</, '>{tPage("export_json")}<');
content = content.replace(/>Xuất CSV</, '>{tPage("export_csv")}<');
content = content.replace(/>Chỉ lưu cục bộ trên trình duyệt</, '>{tPage("local_only")}<');
content = content.replace(/>Xác nhận xóa\?</, '>{tPage("confirm_clear")}<');
content = content.replace(/toast\("ĐÃ XÓA LỊCH SỬ", \{ detail: "Các mục đã lưu vẫn được giữ nguyên" \}\);/, 'toast(tPage("history_cleared"), { detail: tPage("history_detail") });');
content = content.replace(/>Xóa hết</, '>{tPage("clear_all")}<');
content = content.replace(/>Hủy</, '>{tPage("cancel")}<');
content = content.replace(/>Xóa lịch sử</, '>{tPage("clear_history")}<');
content = content.replace(/placeholder="Tìm theo tên, lĩnh vực, đối tượng, xu hướng\.\.\."/, 'placeholder={tPage("search_placeholder")}');
content = content.replace(/\? "Không tìm thấy ý tưởng khớp với từ khóa\."/, '? tPage("no_match")');
content = content.replace(/\? "CHƯA LƯU Ý TƯỞNG NÀO\."/, '? tPage("no_saved")');
content = content.replace(/: "CHƯA QUAY LẦN NÀO\."\}/, ': tPage("no_history")}');
content = content.replace(/\? "Thử tìm kiếm bằng tên danh mục hoặc xóa bộ lọc\."/, '? tPage("hint_search")');
content = content.replace(/\? "Khi gặp ý tưởng xuất sắc trong phòng Lab, hãy bấm nút Lưu \(hoặc nhấn phím S\)\."/, '? tPage("hint_saved")');
content = content.replace(/: "Hãy quay một vòng tại trang chủ để lưu lại dấu vết sáng tạo\."\}/, ': tPage("hint_history")}');
content = content.replace(/>VỀ VÒNG QUAY LAB →</, '>{tPage("back_to_lab")}<');
content = content.replace(/>Mở trong Lab</, '>{tPage("open_in_lab")}<');
content = content.replace(/\{entry\.saved \? "Đã lưu" : "Lưu"\}/, '{entry.saved ? tPage("saved") : tPage("save")}');
content = content.replace(/toast\(ok \? "ĐÃ SAO CHÉP LIÊN KẾT" : "KHÔNG THỂ SAO CHÉP LIÊN KẾT"\);/, 'toast(ok ? tPage("link_copied") : tPage("link_failed"));');
content = content.replace(/>Chép link</, '>{tPage("copy_link")}<');
content = content.replace(/aria-label="Xóa khỏi danh sách"/, 'aria-label={tPage("remove_from_list")}');
content = content.replace(/>Xóa</, '>{tPage("remove")}<');

fs.writeFileSync('app/saved/page.tsx', content);
