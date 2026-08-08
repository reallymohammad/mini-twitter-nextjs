// components/layout/RightSidebar.tsx
"use client";

import { Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RightSidebarProps {
  locale: string;
}

export default function RightSidebar({ locale }: RightSidebarProps) {
  // Mock trends data
  const trends = [
    { category: "Technology", topic: "#NextJS", posts: "125K" },
    { category: "Programming", topic: "#TypeScript", posts: "89K" },
    { category: "Web Development", topic: "#TailwindCSS", posts: "67K" },
    { category: "Trending", topic: "#AI", posts: "234K" },
  ];

  const whoToFollow = [
    { name: "User One", username: "userone", followers: "2.5K" },
    { name: "User Two", username: "usertwo", followers: "1.8K" },
    { name: "User Three", username: "userthree", followers: "3.2K" },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Search Box */}
      <div className="sticky top-0 bg-background pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-12 rounded-full bg-muted"
          />
        </div>
      </div>

      {/* Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Trends for you
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {trends.map((trend, index) => (
            <div
              key={index}
              className="hover:bg-accent p-3 -mx-3 rounded-lg cursor-pointer transition-colors"
            >
              <p className="text-xs text-muted-foreground">{trend.category}</p>
              <p className="font-bold">{trend.topic}</p>
              <p className="text-xs text-muted-foreground">
                {trend.posts} posts
              </p>
            </div>
          ))}
          <button className="text-primary hover:underline text-sm">
            Show more
          </button>
        </CardContent>
      </Card>

      {/* Who to Follow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Who to follow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {whoToFollow.map((user, index) => (
            <div
              key={index}
              className="flex items-center justify-between hover:bg-accent p-3 -mx-3 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div>
                  <p className="font-bold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    @{user.username}
                  </p>
                </div>
              </div>
              <button className="px-4 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90">
                Follow
              </button>
            </div>
          ))}
          <button className="text-primary hover:underline text-sm">
            Show more
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
