import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function AboutPage() {
  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 flex flex-col gap-10">
      {/* Hero */}
      <div className="flex flex-col gap-3 border-b border-line pb-6">
        <span className="text-xs font-mono text-muted uppercase">GIỚI THIỆU HỆ THỐNG</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-fg leading-tight">
          BIẾN Ý TƯỞNG THÀNH SẢN PHẨM ĐÁNG XÂY DỰNG.
        </h1>
        <p className="text-base text-muted max-w-2xl leading-relaxed">
          SPIN//BUILD là công cụ vòng quay ý tưởng thế hệ mới dành cho lập trình viên, nhà thiết kế và các nhà sáng lập độc lập (indie hacker). Không phải đánh bạc, không phải template mẫu thông thường — đây là công cụ kết hợp ngẫu nhiên có kiểm soát để tìm ra những ý tưởng đột phá chưa ai làm.
        </p>
      </div>

      {/* The Formula */}
      <div className="flex flex-col gap-4 border border-line bg-surface/90 p-6 sm:p-8 rounded-2xl">
        <span className="text-xs font-mono text-muted uppercase">CÔNG THỨC 6 MẢNH GHÉP (GENETIC RECIPE)</span>
        <div className="font-mono text-xs sm:text-sm font-bold text-fg tracking-tight flex flex-wrap gap-2 items-center">
          <span className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">LĨNH VỰC</span>
          <span>×</span>
          <span className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300">ĐỐI TƯỢNG</span>
          <span>×</span>
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">CƠ CHẾ</span>
          <span>×</span>
          <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">XU HƯỚNG</span>
          <span>×</span>
          <span className="px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">ĐIỂM DỊ</span>
          <span>×</span>
          <span className="px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300">RÀNG BUỘC</span>
        </div>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          Mỗi sản phẩm đều được tạo thành từ 6 mảnh ghép. Thuật toán tự động phát hiện các ý tưởng nhàm chán (như ứng dụng ghi chú hoặc todo app đơn thuần) và biến đổi chúng thành các sản phẩm có cá tính riêng biệt và cuốn hút.
        </p>
      </div>

      {/* Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2 p-5 rounded-2xl border border-line bg-surface/90">
          <span className="text-xs font-mono text-fg font-bold">01 // QUAY NGAY KHÔNG CẦN CHỜ</span>
          <p className="text-xs text-muted leading-relaxed">
            Không cần đăng nhập, không quảng cáo, không pop-up phiền toái. Chỉ cần nhấn SPACE là bánh xe bắt đầu quay.
          </p>
        </div>

        <div className="flex flex-col gap-2 p-5 rounded-2xl border border-line bg-surface/90">
          <span className="text-xs font-mono text-fg font-bold">02 // ĐỒNG BỘ THEO MÃ SEED</span>
          <p className="text-xs text-muted leading-relaxed">
            Mọi ý tưởng đều có mã số riêng. Bạn có thể chia sẻ đường link hoặc mã seed cho bạn bè để cùng xem đúng ý tưởng đó.
          </p>
        </div>

        <div className="flex flex-col gap-2 p-5 rounded-2xl border border-line bg-surface/90">
          <span className="text-xs font-mono text-fg font-bold">03 // TẠO PROMPT CHO AI CODE</span>
          <p className="text-xs text-muted leading-relaxed">
            Tự động soạn sẵn bản đặc tả kiến trúc, cơ sở dữ liệu và prompt chi tiết để bạn copy paste vào Cursor, Claude, ChatGPT hoặc v0 để code ngay.
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-line pt-6 flex items-center justify-between">
        <span className="font-mono text-xs text-muted">
          PHIÊN BẢN 1.0.0 // TỰ ĐỘNG HÓA Ý TƯỞNG
        </span>
        <Link href="/">
          <Button variant="solid" className="gap-2">
            <span>VÀO VÒNG QUAY NGAY</span>
            <span>→</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
