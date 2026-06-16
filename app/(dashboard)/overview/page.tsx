"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  cover_image_url?: string | null;
};

type Expense = {
  id: string;
  trip_id: string;
  category: string | null;
  amount: number | string;
  description: string | null;
  created_at: string;
};

type CoverImageItem = {
  trip_id: string;
  image_url: string | null;
  day_number: number | null;
  time: string | null;
  created_at: string;
};

type TripStatus = "未开始" | "旅行中" | "已完成" | "待完善";

function getTripStatus(trip: Trip): TripStatus {
  if (!trip.start_date || !trip.end_date) {
    return "待完善";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(`${trip.start_date}T00:00:00`);
  const endDate = new Date(`${trip.end_date}T23:59:59`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "待完善";
  }

  if (today < startDate) return "未开始";
  if (today > endDate) return "已完成";

  return "旅行中";
}

function getStatusClass(status: TripStatus) {
  if (status === "旅行中") {
    return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  }

  if (status === "未开始") {
    return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  }

  if (status === "已完成") {
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  }

  return "bg-zinc-700/50 text-zinc-300 border-zinc-600";
}

function formatMoney(value: number | string | null | undefined) {
  return `¥${Number(value || 0).toLocaleString("zh-CN")}`;
}

function formatDateRange(trip: Trip) {
  if (!trip.start_date && !trip.end_date) return "未填写日期";
  if (trip.start_date && !trip.end_date) return `${trip.start_date} 出发`;
  if (!trip.start_date && trip.end_date) return `${trip.end_date} 结束`;
  return `${trip.start_date} 至 ${trip.end_date}`;
}

export default function OverviewPage() {
  const router = useRouter();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initPage();
  }, []);

  async function initPage() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/");
      return;
    }

    await fetchOverviewData(data.user.id);
    setLoading(false);
  }

  async function fetchOverviewData(currentUserId: string) {
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (tripError) {
      alert(tripError.message);
      return;
    }

    const tripList = tripData || [];
    const tripIds = tripList.map((trip) => trip.id);

    if (tripIds.length === 0) {
      setTrips([]);
      setExpenses([]);
      return;
    }

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .select("*")
      .in("trip_id", tripIds)
      .order("created_at", { ascending: false });

    if (expenseError) {
      console.error(expenseError);
    }

    const { data: imageData, error: imageError } = await supabase
      .from("itinerary_items")
      .select("trip_id, image_url, day_number, time, created_at")
      .in("trip_id", tripIds)
      .not("image_url", "is", null)
      .order("day_number", { ascending: true })
      .order("time", { ascending: true });

    if (imageError) {
      console.error(imageError);
    }

    const coverMap: Record<string, string> = {};

    (imageData || []).forEach((item: CoverImageItem) => {
      if (!item.image_url) return;

      if (!coverMap[item.trip_id]) {
        coverMap[item.trip_id] = item.image_url;
      }
    });

    const tripsWithCover = tripList.map((trip) => ({
      ...trip,
      cover_image_url: coverMap[trip.id] || null,
    }));

    setTrips(tripsWithCover);
    setExpenses(expenseData || []);
  }

  const totalBudget = trips.reduce((sum, trip) => {
    return sum + Number(trip.budget || 0);
  }, 0);

  const totalSpent = expenses.reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);

  const remainingBudget = totalBudget - totalSpent;

  const countryCount = new Set(
    trips.map((trip) => trip.country).filter(Boolean)
  ).size;

  const cityCount = new Set(trips.map((trip) => trip.city).filter(Boolean))
    .size;

  const activeCount = trips.filter(
    (trip) => getTripStatus(trip) === "旅行中"
  ).length;

  const upcomingCount = trips.filter(
    (trip) => getTripStatus(trip) === "未开始"
  ).length;

  const completedCount = trips.filter(
    (trip) => getTripStatus(trip) === "已完成"
  ).length;

  const pendingCount = trips.filter(
    (trip) => getTripStatus(trip) === "待完善"
  ).length;

  const recentTrips = trips.slice(0, 4);
  const latestTrip = trips[0] || null;

  if (loading) {
    return (
      <main className="p-4 text-white sm:p-8">
        <p className="text-zinc-400">正在加载总览...</p>
      </main>
    );
  }

  return (
    <main className="p-4 text-white sm:p-8">
      <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_35%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(135deg,_#18181b,_#09090b)]" />

          <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.45fr_0.95fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
                Trace Travel Archive
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                旅行人生档案馆
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                你已经记录了{" "}
                <span className="font-bold text-cyan-300">{trips.length}</span>{" "}
                趟旅行，去过{" "}
                <span className="font-bold text-cyan-300">
                  {countryCount}
                </span>{" "}
                个国家、{" "}
                <span className="font-bold text-cyan-300">{cityCount}</span>{" "}
                个城市。这里不做照片墙，而是整理你的计划、行程、预算和旅行足迹。
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/trips"
                  className="rounded-2xl bg-cyan-500 px-5 py-4 text-center text-sm font-black text-black hover:bg-cyan-400"
                >
                  管理我的旅行
                </Link>

                <Link
                  href="/map"
                  className="rounded-2xl bg-zinc-800 px-5 py-4 text-center text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  查看旅行足迹
                </Link>

                <Link
                  href="/analytics"
                  className="rounded-2xl bg-zinc-800 px-5 py-4 text-center text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  查看数据分析
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-500/20 bg-black/30 p-5 backdrop-blur">
              <p className="text-sm text-zinc-400">旅行状态</p>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-zinc-900 p-4">
                  <p className="text-2xl font-black text-blue-300">
                    {upcomingCount}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">未开始</p>
                </div>

                <div className="rounded-2xl bg-zinc-900 p-4">
                  <p className="text-2xl font-black text-cyan-300">
                    {activeCount}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">旅行中</p>
                </div>

                <div className="rounded-2xl bg-zinc-900 p-4">
                  <p className="text-2xl font-black text-emerald-300">
                    {completedCount}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">已完成</p>
                </div>
              </div>

              {latestTrip ? (
                <Link
                  href={`/trips/${latestTrip.id}`}
                  className="mt-4 block rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 transition hover:border-cyan-500/40"
                >
                  <p className="text-xs text-zinc-500">最近创建</p>
                  <p className="mt-1 line-clamp-1 font-bold">
                    {latestTrip.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {latestTrip.country || "未填写国家"} ·{" "}
                    {latestTrip.city || "未填写城市"}
                  </p>
                </Link>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-500">
                  创建第一趟旅行后，这里会显示你的最新旅行档案。
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">总旅行</p>
          <h2 className="mt-2 text-3xl font-black">{trips.length}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">国家</p>
          <h2 className="mt-2 text-3xl font-black">{countryCount}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">城市</p>
          <h2 className="mt-2 text-3xl font-black">{cityCount}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">总预算</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            {formatMoney(totalBudget)}
          </h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">已记录花费</p>
          <h2 className="mt-2 text-2xl font-black text-cyan-300 sm:text-3xl">
            {formatMoney(totalSpent)}
          </h2>
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">最近旅行</h2>
              <p className="mt-1 text-sm text-zinc-500">
                继续完善你的旅行计划、每日行程和预算记录。
              </p>
            </div>

            <Link href="/trips" className="text-sm text-cyan-400">
              查看全部 →
            </Link>
          </div>

          {recentTrips.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-cyan-500/25 bg-cyan-500/5 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-2xl">
                🧭
              </div>

              <h3 className="mt-5 text-xl font-bold">还没有旅行档案</h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                先创建第一趟旅行，Trace 会帮你整理时间线、预算、足迹和旅行回忆。
              </p>

              <Link
                href="/trips"
                className="mt-6 inline-block rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-black hover:bg-cyan-400"
              >
                ＋ 创建第一趟旅行
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recentTrips.map((trip) => {
                const status = getTripStatus(trip);

                return (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 transition hover:-translate-y-1 hover:border-cyan-500/40"
                  >
                    <div className="relative h-40 bg-zinc-900">
                      {trip.cover_image_url ? (
                        <img
                          src={trip.cover_image_url}
                          alt={`${trip.title} 的封面`}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_35%),linear-gradient(135deg,_#18181b,_#09090b)]">
                          <div className="text-center">
                            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 font-black text-cyan-300">
                              T
                            </div>
                            <p className="text-xs text-zinc-500">
                              暂无封面
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                      <span
                        className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>

                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="line-clamp-1 text-xl font-black">
                          {trip.title}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-300">
                          {trip.country || "未填写国家"} ·{" "}
                          {trip.city || "未填写城市"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-4 text-xs">
                      <div className="rounded-2xl bg-zinc-900 p-3">
                        <p className="text-zinc-500">预算</p>
                        <p className="mt-1 font-bold text-zinc-200">
                          {trip.budget ? formatMoney(trip.budget) : "未填写"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-zinc-900 p-3">
                        <p className="text-zinc-500">日期</p>
                        <p className="mt-1 line-clamp-1 font-bold text-zinc-200">
                          {formatDateRange(trip)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">预算状态</h2>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-zinc-950/70 p-4">
                <p className="text-sm text-zinc-500">剩余预算</p>
                <p
                  className={`mt-2 text-3xl font-black ${
                    remainingBudget >= 0 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {formatMoney(remainingBudget)}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950/70 p-4">
                <p className="text-sm text-zinc-500">待完善旅行</p>
                <p className="mt-2 text-3xl font-black text-cyan-300">
                  {pendingCount}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-zinc-900">
            <div className="bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_40%),linear-gradient(135deg,_rgba(24,24,27,1),_rgba(9,9,11,1))] p-5 sm:p-6">
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                Coming Soon
              </span>

              <h2 className="mt-4 text-2xl font-black">旅行社区</h2>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                这里未来可以做成类似小红书的旅行分享社区：发布旅行笔记、城市攻略、路线收藏和灵感推荐。
              </p>

              <div className="mt-5 grid gap-3 text-sm">
                <div className="rounded-2xl bg-black/30 p-4">
                  ✨ 旅行笔记分享
                </div>
                <div className="rounded-2xl bg-black/30 p-4">
                  🗺️ 城市攻略与路线
                </div>
                <div className="rounded-2xl bg-black/30 p-4">
                  🤝 发现同频旅行者
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        <Link
          href="/trips"
          className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40"
        >
          <p className="text-sm text-cyan-400">Trips</p>
          <h2 className="mt-2 text-xl font-bold">管理旅行</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            新建旅行、查看封面、编辑行程和预算。
          </p>
        </Link>

        <Link
          href="/planner"
          className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40"
        >
          <p className="text-sm text-cyan-400">Planner</p>
          <h2 className="mt-2 text-xl font-bold">规划中心</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            查看最近计划和旅行安排，让行程更清晰。
          </p>
        </Link>

        <Link
          href="/map"
          className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40"
        >
          <p className="text-sm text-cyan-400">Map</p>
          <h2 className="mt-2 text-xl font-bold">足迹地图</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            查看你去过的城市和国家，把旅行轨迹点亮。
          </p>
        </Link>

        <Link
          href="/analytics"
          className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40"
        >
          <p className="text-sm text-cyan-400">Analytics</p>
          <h2 className="mt-2 text-xl font-bold">旅行分析</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            查看旅行预算、花费结构和旅行数据统计。
          </p>
        </Link>
      </section>
    </main>
  );
}