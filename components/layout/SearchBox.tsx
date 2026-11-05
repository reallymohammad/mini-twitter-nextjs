"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, Loader2, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUserSuggestions } from "@/lib/hooks/useUserSuggestions";
import Image from "next/image";

export function SearchBox() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // حداقل ۲ کاراکتر برای شروع جستجو
  const effectiveQuery = query.trim().length >= 2 ? query.trim() : "";
  const { users, loading } = useUserSuggestions(effectiveQuery);

  // مدیریت بستن دراپ‌داون با کلیک بیرون از آن
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ریست کردن ایندکس انتخاب شده با تغییر لیست کاربران
  useEffect(() => {
    setSelectedIndex(-1);
  }, [users]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || users.length === 0) {
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        setIsOpen(false);
        router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < users.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : users.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < users.length) {
        const selectedUser = users[selectedIndex];
        setIsOpen(true); // یا false برای بستن
        router.push(`/${locale}/${selectedUser.username}`);
      } else if (query.trim()) {
        setIsOpen(false);
        router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          className="pl-9 pr-4 rounded-full bg-secondary/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Live Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-2 py-2 bg-background border rounded-xl shadow-lg z-50 overflow-hidden">
          {users.length === 0 && !loading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              No users found.
            </div>
          ) : (
            <div>
              <div className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                People
              </div>
              {users.map((user, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={user.id}
                    // استفاده از mousedown برای جلوگیری از بسته شدن پیش از موعد قبل از کلیک
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsOpen(false);
                      router.push(`/${locale}/${user.username}`);
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="relative w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.username}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                          <UserIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium text-sm truncate">
                        {user.fullName || user.username}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        @{user.username}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
