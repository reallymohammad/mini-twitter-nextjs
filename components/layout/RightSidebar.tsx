// components/layout/RightSidebar.tsx
import { SearchBox } from "@/components/layout/SearchBox";

interface RightSidebarProps {
  locale: string;
}

export default function RightSidebar({ locale }: RightSidebarProps) {
  return (
    <aside className="w-full p-4 space-y-4">
      {/* Search Box Component */}
      <SearchBox />

      {/* بقیه ویجت‌ها یا بخش‌های سایدبار در صورت نیاز */}
    </aside>
  );
}
