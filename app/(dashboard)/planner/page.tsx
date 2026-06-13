"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Trip = {
  id: string;
  user_id: string | null;
  title: string;
  country: string | null;
  city: string | null;
  budget: number | string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export default function PlannerPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrips();
  }, []);

  async function fetchTrips() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setTrips(data || []);
    setLoading(false);
  }

  const totalBudget = trips.reduce((sum, trip) => {
    return sum + Number(trip.budget || 0);
  }, 0);

  const countries = Array.from(
    new Set(trips.map((trip) => trip.country).filter(Boolean))
  );

  const cities = Array.from(
    new Set(trips.map((trip) => trip.city).filter(Boolean))
  );

  const latestTrip = trips[0];

  if (loading) {
    return (
      <main className="p-8 text-white">
        <p className="text-zinc-400">正在加载旅行规划...</p>
      </main>
    );
  }

  return (
    <main className="p-8 text-white">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">旅行规划</h1>
          <p className="text-zinc-400 mt-2">
            设计你的旅程，管理预算与每日行程
          </p>
        </div>

        <Link
          href="/trips"
          className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black"
        >
          + 新建旅行
        </Link>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">旅行计划</p>
          <h2 className="text-4xl font-bold mt-2">{trips.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">总预算</p>
          <h2 className="text-4xl font-bold mt-2">¥{totalBudget}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">计划国家</p>
          <h2 className="text-4xl font-bold mt-2">{countries.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">计划城市</p>
          <h2 className="text-4xl font-bold mt-2">{cities.length}</h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">我的旅行计划</h2>

            <Link href="/trips" className="text-sm text-cyan-400">
              管理全部
            </Link>
          </div>

          <div className="space-y-4">
            {trips.length === 0 ? (
              <div className="rounded-xl bg-zinc-800 p-6">
                <h3 className="text-xl font-semibold">还没有旅行计划</h3>

                <p className="text-zinc-400 mt-2">
                  点击右上角「新建旅行」，开始设计你的第一趟旅程。
                </p>
              </div>
            ) : (
              trips.map((trip) => (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="block rounded-xl bg-zinc-800 p-5 hover:bg-zinc-700 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">{trip.title}</h3>

                      <p className="text-zinc-400 mt-2">
                        {trip.country || "未填写国家"} ·{" "}
                        {trip.city || "未填写城市"}
                      </p>

                      <p className="text-zinc-500 mt-2">
                        {trip.start_date || "未填写开始日期"} -{" "}
                        {trip.end_date || "未填写结束日期"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-zinc-400 text-sm">预算</p>
                      <p className="text-xl font-bold text-cyan-400">
                        {trip.budget ? `¥${trip.budget}` : "未填写"}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-cyan-400 mt-4">
                    继续规划 →
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold mb-4">最近计划</h2>

            {latestTrip ? (
              <div className="rounded-xl bg-zinc-800 p-5">
                <h3 className="text-2xl font-bold">{latestTrip.title}</h3>

                <p className="text-zinc-400 mt-2">
                  {latestTrip.country || "未填写国家"} ·{" "}
                  {latestTrip.city || "未填写城市"}
                </p>

                <p className="text-zinc-500 mt-2">
                  {latestTrip.start_date || "未填写开始日期"} -{" "}
                  {latestTrip.end_date || "未填写结束日期"}
                </p>

                <Link
                  href={`/trips/${latestTrip.id}`}
                  className="mt-5 inline-block rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black"
                >
                  打开计划
                </Link>
              </div>
            ) : (
              <p className="text-zinc-500">暂无旅行计划</p>
            )}
          </div>

          <div className="rounded-2xl bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold mb-4">规划流程</h2>

            <div className="space-y-4 text-zinc-300">
              <div className="rounded-xl bg-zinc-800 p-4">
                1. 创建旅行计划
              </div>

              <div className="rounded-xl bg-zinc-800 p-4">
                2. 设置预算与日期
              </div>

              <div className="rounded-xl bg-zinc-800 p-4">
                3. 添加每日行程
              </div>

              <div className="rounded-xl bg-zinc-800 p-4">
                4. 记录费用与旅行回忆
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}