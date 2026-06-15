"use client";

import { useEffect, useMemo, useState } from "react";
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

type ItineraryImageItem = {
  id: string;
  trip_id: string;
  title: string;
  category: string | null;
  day_number: number | null;
  time: string | null;
  image_url: string | null;
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

  if (today < startDate) {
    return "未开始";
  }

  if (today > endDate) {
    return "已完成";
  }

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

export default function OverviewPage() {
  const router = useRouter();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [photos, setPhotos] = useState<ItineraryImageItem[]>([]);
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
      setPhotos([]);
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
      .select("id, trip_id, title, category, day_number, time, image_url, created_at")
      .in("trip_id", tripIds)
      .not("image_url", "is", null)
      .order("created_at", { ascending: false });

    if (imageError) {
      console.error(imageError);
    }

    const imageList = imageData || [];
    const coverMap: Record<string, string> = {};

    imageList.forEach((item) => {
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
    setPhotos(imageList);
  }

  const tripTitleMap = useMemo(() => {
    const map: Record<string, string> = {};

    trips.forEach((trip) => {
      map[trip.id] = trip.title;
    });

    return map;
  }, [trips]);

  const totalBudget = trips.reduce((sum, trip) => {
    return sum + Number(trip.budget || 0);
  }, 0);

  const totalSpent = expenses.reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);

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

  const recentTrips = trips.slice(0, 4);
  const recentPhotos = photos.slice(0, 8);

  if (loading) {
    return (
      <main className="p-4 text-white sm:p-8">
        <p className="text-zinc-400">正在加载总览...</p>
      </main>
    );
  }

  return (
    <main className="p-4 text-white sm:p-8">
      <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div>
            <p className="text-sm font-medium text-cyan-400">Trace</p>

            <h1 className="mt-3 text-3xl font-bold sm:text-5xl">
              欢迎回到你的旅行人生档案馆
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-400">
              你已经记录了 {trips.length} 趟旅行，去过 {countryCount} 个国家、
              {cityCount} 个城市。这里会自动整理你的计划、预算、行程和旅行照片。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/trips"
                className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-400"
              >
                管理我的旅行
              </Link>

              <Link
                href="/map"
                className="rounded-xl bg-zinc-800 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700"
              >
                查看旅行足迹
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-black/30 p-5">
            <p className="text-sm text-zinc-400">旅行状态</p>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-zinc-900 p-4">
                <p className="text-2xl font-bold text-blue-300">
                  {upcomingCount}
                </p>
                <p className="mt-1 text-xs text-zinc-500">未开始</p>
              </div>

              <div className="rounded-xl bg-zinc-900 p-4">
                <p className="text-2xl font-bold text-cyan-300">
                  {activeCount}
                </p>
                <p className="mt-1 text-xs text-zinc-500">旅行中</p>
              </div>

              <div className="rounded-xl bg-zinc-900 p-4">
                <p className="text-2xl font-bold text-emerald-300">
                  {completedCount}
                </p>
                <p className="mt-1 text-xs text-zinc-500">已完成</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-sm text-zinc-400">总旅行</p>
          <h2 className="mt-2 text-3xl font-bold">{trips.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-sm text-zinc-400">国家</p>
          <h2 className="mt-2 text-3xl font-bold">{countryCount}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-sm text-zinc-400">城市</p>
          <h2 className="mt-2 text-3xl font-bold">{cityCount}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-sm text-zinc-400">总预算</p>
          <h2 className="mt-2 text-3xl font-bold">¥{totalBudget}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-sm text-zinc-400">已记录花费</p>
          <h2 className="mt-2 text-3xl font-bold text-cyan-400">
            ¥{totalSpent}
          </h2>
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">最近旅行</h2>
              <p className="mt-1 text-sm text-zinc-500">
                继续完善你的旅行计划和记录。
              </p>
            </div>

            <Link href="/trips" className="text-sm text-cyan-400">
              查看全部 →
            </Link>
          </div>

          {recentTrips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-8 text-center">
              <h3 className="text-lg font-semibold">还没有旅行</h3>
              <p className="mt-2 text-sm text-zinc-500">
                先创建第一趟旅行，Trace 会帮你把它变成旅行档案。
              </p>

              <Link
                href="/trips"
                className="mt-5 inline-block rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black"
              >
                去创建旅行
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
                    className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition hover:-translate-y-1 hover:border-cyan-500/40"
                  >
                    <div className="relative h-36 bg-zinc-900">
                      {trip.cover_image_url ? (
                        <img
                          src={trip.cover_image_url}
                          alt={`${trip.title} 的封面`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_35%),linear-gradient(135deg,_#18181b,_#09090b)]">
                          <div className="text-center">
                            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 font-bold text-cyan-300">
                              T
                            </div>
                            <p className="text-xs text-zinc-500">
                              暂无封面
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                      <span
                        className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="p-4">
                      <h3 className="line-clamp-1 text-lg font-bold">
                        {trip.title}
                      </h3>

                      <p className="mt-2 text-sm text-zinc-400">
                        {trip.country || "未填写国家"} ·{" "}
                        {trip.city || "未填写城市"}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-zinc-900 p-3">
                          <p className="text-zinc-500">预算</p>
                          <p className="mt-1 font-semibold text-zinc-200">
                            {trip.budget ? `¥${trip.budget}` : "未填写"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-zinc-900 p-3">
                          <p className="text-zinc-500">开始日期</p>
                          <p className="mt-1 font-semibold text-zinc-200">
                            {trip.start_date || "未填写"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">最近照片</h2>
              <p className="mt-1 text-sm text-zinc-500">
                从每日行程图片自动汇总。
              </p>
            </div>

            <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
              {photos.length} 张
            </span>
          </div>

          {recentPhotos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-8 text-center">
              <p className="text-sm text-zinc-500">
                还没有照片。进入旅行详情页，为每日行程上传图片后，这里会自动展示。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
              {recentPhotos.map((photo) => (
                <Link
                  key={photo.id}
                  href={`/trips/${photo.trip_id}`}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
                >
                  <img
                    src={photo.image_url as string}
                    alt={photo.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
                    <p className="truncate text-sm font-semibold">
                      {photo.title}
                    </p>

                    <p className="mt-1 truncate text-xs text-zinc-300">
                      {tripTitleMap[photo.trip_id] || "旅行"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Link
          href="/trips"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40"
        >
          <p className="text-sm text-cyan-400">Trips</p>
          <h2 className="mt-2 text-xl font-bold">管理旅行</h2>
          <p className="mt-2 text-sm text-zinc-500">
            新建旅行、查看封面、编辑行程和旅行照片。
          </p>
        </Link>

        <Link
          href="/planner"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40"
        >
          <p className="text-sm text-cyan-400">Planner</p>
          <h2 className="mt-2 text-xl font-bold">规划中心</h2>
          <p className="mt-2 text-sm text-zinc-500">
            查看最近计划和旅行安排，让行程更清晰。
          </p>
        </Link>

        <Link
          href="/analytics"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40"
        >
          <p className="text-sm text-cyan-400">Analytics</p>
          <h2 className="mt-2 text-xl font-bold">旅行分析</h2>
          <p className="mt-2 text-sm text-zinc-500">
            查看旅行预算、花费结构和旅行数据统计。
          </p>
        </Link>
      </section>
    </main>
  );
}