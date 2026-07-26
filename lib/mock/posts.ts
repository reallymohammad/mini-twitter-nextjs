export interface MockPost {
  id: string;
  name: string;
  handle: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  reposts: number;
  avatarColor: string;
}

export const MOCK_POSTS: MockPost[] = [
  {
    id: "1",
    name: "Sara Ahmadi",
    handle: "@sara.dev",
    time: "2h",
    content:
      "Shipped the new dashboard redesign today. Small details make a huge difference in perceived quality ✨",
    likes: 128,
    comments: 12,
    reposts: 8,
    avatarColor: "from-violet-500 to-fuchsia-500",
  },
  {
    id: "2",
    name: "Daniel Cho",
    handle: "@danielc",
    time: "4h",
    content:
      "Server Components + streaming is genuinely changing how I think about data loading. Writing a deep dive soon.",
    likes: 342,
    comments: 41,
    reposts: 27,
    avatarColor: "from-sky-500 to-cyan-400",
  },
  {
    id: "3",
    name: "Mina Rezaei",
    handle: "@mina_r",
    time: "6h",
    content: "کاش هر روز صبح این‌قدر انگیزه‌بخش شروع می‌شد 😄",
    likes: 76,
    comments: 5,
    reposts: 2,
    avatarColor: "from-amber-400 to-orange-500",
  },
  {
    id: "4",
    name: "Leo Martins",
    handle: "@leomartins",
    time: "9h",
    content:
      "Design systems aren't about pixel-perfect components — they're about consistent decisions at scale.",
    likes: 210,
    comments: 19,
    reposts: 15,
    avatarColor: "from-emerald-500 to-teal-400",
  },
];
