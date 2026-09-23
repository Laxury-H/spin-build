import type { Sector, SectorId } from "@/types";

/** The 18 wheel sectors, clockwise from 12 o'clock. Order is part of the visual design. */
export const SECTORS: readonly Sector[] = [
  { id: "ai", label: "AI", labelVi: "Trí tuệ AI", icon: "🤖", index: 1 },
  { id: "social", label: "SOCIAL", labelVi: "Mạng xã hội", icon: "💬", index: 2 },
  { id: "productivity", label: "PRODUCTIVITY", labelVi: "Năng suất", icon: "⚡", index: 3 },
  { id: "music", label: "MUSIC", labelVi: "Âm nhạc", icon: "🎵", index: 4 },
  { id: "fashion", label: "FASHION", labelVi: "Thời trang", icon: "👗", index: 5 },
  { id: "food", label: "FOOD", labelVi: "Ẩm thực", icon: "🍜", index: 6 },
  { id: "finance", label: "FINANCE", labelVi: "Tài chính", icon: "💳", index: 7 },
  { id: "education", label: "EDUCATION", labelVi: "Giáo dục", icon: "📚", index: 8 },
  { id: "gaming", label: "GAMING", labelVi: "Trò chơi", icon: "🎮", index: 9 },
  { id: "dating", label: "DATING", labelVi: "Hẹn hò", icon: "💖", index: 10 },
  { id: "fitness", label: "FITNESS", labelVi: "Sức khỏe", icon: "🏃", index: 11 },
  { id: "travel", label: "TRAVEL", labelVi: "Du lịch", icon: "✈️", index: 12 },
  { id: "devtools", label: "DEVELOPER TOOLS", labelVi: "Công cụ Dev", icon: "💻", index: 13 },
  { id: "creator", label: "CREATOR TOOLS", labelVi: "Sáng tạo nội dung", icon: "🎨", index: 14 },
  { id: "marketplace", label: "MARKETPLACE", labelVi: "Sàn thương mại", icon: "🛒", index: 15 },
  { id: "entertainment", label: "ENTERTAINMENT", labelVi: "Giải trí", icon: "🎬", index: 16 },
  { id: "weird", label: "WEIRD INTERNET", labelVi: "Độc lạ mạng", icon: "🔮", index: 17 },
  { id: "utilities", label: "UTILITIES", labelVi: "Tiện ích", icon: "🛠️", index: 18 },
];

export const SECTOR_BY_ID: Readonly<Record<SectorId, Sector>> = Object.fromEntries(
  SECTORS.map((s) => [s.id, s]),
) as Record<SectorId, Sector>;

/** 0-based wheel position of a sector. */
export function sectorPosition(id: SectorId): number {
  return SECTOR_BY_ID[id].index - 1;
}
