"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navItems = [
  {
    name: "总览",
    href: "/overview",
  },
  {
    name: "旅行规划",
    href: "/planner",
  },
  {
    name: "我的旅行",
    href: "/trips",
  },
  {
    name: "足迹地图",
    href: "/map",
  },
  {
    name: "数据中心",
    href: "/analytics",
  },
  {
    name: "个人中心",
    href: "/profile",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 p-6 flex flex-col">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white">TRACE</h1>

        <p className="text-xs text-zinc-500 mt-1">
          旅行人生档案馆
        </p>
      </div>

      <nav className="space-y-2 flex-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "block rounded-lg px-4 py-3 bg-cyan-500 text-black font-semibold"
                  : "block rounded-lg px-4 py-3 text-zinc-300 hover:bg-zinc-800"
              }
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 pt-4">
        <button
          onClick={logout}
          className="w-full rounded-lg px-4 py-3 text-left text-red-400 hover:bg-red-500/10"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}