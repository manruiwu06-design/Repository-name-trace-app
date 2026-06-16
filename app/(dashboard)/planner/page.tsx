"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getTripStatus,
  getTripsWithCoversForCurrentUser,
  type Trip,
  type TripStatus,
} from "@/lib/services/trips";

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

function getDaysUntil(date: string | null) {
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${date}T00:00:00`);

  if (Number.isNaN(target.getTime())) return null;

  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function TripPlanCard({
  trip,
  label,
}: {
  trip: Trip;
  label?: string;
}) {
  const status = getTripStatus(trip);
  const daysUntil = getDaysUntil(trip.start_date);

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 transition duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-[0_0_35px_rgba(34,211,238,0.08)]"
    >
      <div className="relative h-40 bg-zinc-900">
        {trip.cover_image_url ? (
          <img
            src={trip.cover_image_url}
            alt={`${trip.title} 的旅行封面`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_35%),linear-gradient(135deg,_#18181b,_#09090b)]">
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-xl font-black text-cyan-300">
                T
              </div>

              <p className="text-xs text-zinc-500">暂无封面</p>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
              status
            )}`}
          >
            {status}
          </span>

          {label && (
            <span className="rounded-full border border-zinc-700 bg-black/40 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
              {label}
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="line-clamp-1 text-xl font-black text-white">
            {trip.title}
          </h3>

          <p className="mt-1 text-sm text-zinc-300">
            {trip.country || "未填写国家"} · {trip.city || "未填写城市"}
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
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

        {status === "未开始" && daysUntil !== null && (
          <div className="mt-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-200">
            {daysUntil > 0
              ? `距离出发还有 ${daysUntil} 天`
              : "今天出发，准备开启旅程"}
          </div>
        )}

        {status === "待完善" && (
          <div className="mt-3 rounded-2xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-400">
            建议补充日期、预算和每日行程，让计划更完整。
          </div>
        )}

        <p className="mt-4 text-sm font-semibold text-cyan-400">
          打开计划 →
        </p>
      </div>
    </Link>
  );
}

export default function PlannerPage() {
  const router = useRouter();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrips();
  }, []);

  async function fetchTrips() {
    try {
      const { userId, trips: tripList } =
        await getTripsWithCoversForCurrentUser();

      if (!userId) {
        router.push("/");
        return;
      }

      setTrips(tripList);
    } catch (error) {
      alert(error instanceof Error ? error.message : "加载旅行规划失败");
    } finally {
      setLoading(false);
    }
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

  const upcomingTrips = trips
    .filter((trip) => getTripStatus(trip) === "未开始")
    .sort((a, b) => {
      const aTime = a.start_date
        ? new Date(`${a.start_date}T00:00:00`).getTime()
        : Infinity;
      const bTime = b.start_date
        ? new Date(`${b.start_date}T00:00:00`).getTime()
        : Infinity;

      return aTime - bTime;
    });

  const activeTrips = trips.filter(
    (trip) => getTripStatus(trip) === "旅行中"
  );

  const pendingTrips = trips.filter(
    (trip) => getTripStatus(trip) === "待完善"
  );

  const completedTrips = trips.filter(
    (trip) => getTripStatus(trip) === "已完成"
  );

  const latestTrips = trips.slice(0, 5);
  const nextTrip = upcomingTrips[0] || null;
  const latestTrip = trips[0] || null;

  if (loading) {
    return (
      <main className="p-4 text-white sm:p-8">
        <p className="text-zinc-400">正在加载旅行规划...</p>
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
                Trace Planning Desk
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                旅行计划工作台
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                把即将出发、正在旅行和待完善的计划集中管理。这里是你开始规划每一趟旅程的地方。
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/trips"
                  className="rounded-2xl bg-cyan-500 px-5 py-4 text-center text-sm font-black text-black hover:bg-cyan-400"
                >
                  ＋ 新建旅行
                </Link>

                <Link
                  href="/trips"
                  className="rounded-2xl bg-zinc-800 px-5 py-4 text-center text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  管理全部旅行
                </Link>

                <Link
                  href="/map"
                  className="rounded-2xl bg-zinc-800 px-5 py-4 text-center text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  查看足迹地图
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-500/20 bg-black/30 p-5 backdrop-blur">
              <p className="text-sm text-zinc-400">下一趟计划</p>

              {nextTrip ? (
                <Link
                  href={`/trips/${nextTrip.id}`}
                  className="mt-4 block rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 transition hover:border-cyan-500/40"
                >
                  <p className="line-clamp-1 text-xl font-black">
                    {nextTrip.title}
                  </p>

                  <p className="mt-2 text-sm text-zinc-400">
                    {nextTrip.country || "未填写国家"} ·{" "}
                    {nextTrip.city || "未填写城市"}
                  </p>

                  <p className="mt-2 text-sm text-cyan-300">
                    {formatDateRange(nextTrip)}
                  </p>
                </Link>
              ) : latestTrip ? (
                <Link
                  href={`/trips/${latestTrip.id}`}
                  className="mt-4 block rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 transition hover:border-cyan-500/40"
                >
                  <p className="text-xs text-zinc-500">最近创建</p>
                  <p className="mt-1 line-clamp-1 text-xl font-black">
                    {latestTrip.title}
                  </p>
                  <p className="mt-2 text-sm text-zinc-400">
                    可以继续完善日期、预算和每日行程。
                  </p>
                </Link>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-500">
                  创建第一趟旅行后，这里会显示你的下一趟出发计划。
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-zinc-900 p-3">
                  <p className="text-2xl font-black text-blue-300">
                    {upcomingTrips.length}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">即将出发</p>
                </div>

                <div className="rounded-2xl bg-zinc-900 p-3">
                  <p className="text-2xl font-black text-cyan-300">
                    {activeTrips.length}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">旅行中</p>
                </div>

                <div className="rounded-2xl bg-zinc-900 p-3">
                  <p className="text-2xl font-black text-zinc-300">
                    {pendingTrips.length}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">待完善</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">旅行计划</p>
          <h2 className="mt-2 text-3xl font-black">{trips.length}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">总预算</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            {formatMoney(totalBudget)}
          </h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">计划国家</p>
          <h2 className="mt-2 text-3xl font-black">{countries.length}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">计划城市</p>
          <h2 className="mt-2 text-3xl font-black">{cities.length}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">已完成</p>
          <h2 className="mt-2 text-3xl font-black text-emerald-300">
            {completedTrips.length}
          </h2>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">计划工作台</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  优先处理正在旅行、即将出发和信息待完善的计划。
                </p>
              </div>

              <Link href="/trips" className="text-sm text-cyan-400">
                管理全部 →
              </Link>
            </div>

            {trips.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-cyan-500/25 bg-cyan-500/5 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-2xl">
                  🧭
                </div>

                <h3 className="mt-5 text-xl font-bold">还没有旅行计划</h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                  先创建第一趟旅行，之后可以继续添加每日行程、预算和费用记录。
                </p>

                <Link
                  href="/trips"
                  className="mt-6 inline-block rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-black hover:bg-cyan-400"
                >
                  ＋ 创建第一趟旅行
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {activeTrips.length > 0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-cyan-300">
                        当前旅行中
                      </h3>
                      <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                        {activeTrips.length} 趟
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {activeTrips.map((trip) => (
                        <TripPlanCard
                          key={trip.id}
                          trip={trip}
                          label="进行中"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {upcomingTrips.length > 0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-blue-300">
                        即将出发
                      </h3>
                      <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                        {upcomingTrips.length} 趟
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {upcomingTrips.slice(0, 4).map((trip) => (
                        <TripPlanCard
                          key={trip.id}
                          trip={trip}
                          label="待出发"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {pendingTrips.length > 0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-zinc-300">
                        待完善旅行
                      </h3>
                      <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                        {pendingTrips.length} 趟
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {pendingTrips.slice(0, 4).map((trip) => (
                        <TripPlanCard
                          key={trip.id}
                          trip={trip}
                          label="待完善"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activeTrips.length === 0 &&
                  upcomingTrips.length === 0 &&
                  pendingTrips.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-zinc-800 bg-black/20 p-8 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-xl">
                        ✅
                      </div>

                      <h3 className="mt-4 text-lg font-bold">
                        当前没有待处理计划
                      </h3>

                      <p className="mt-2 text-sm text-zinc-500">
                        你的旅行计划都已经完成。可以创建下一趟新的旅程。
                      </p>

                      <Link
                        href="/trips"
                        className="mt-5 inline-block rounded-full bg-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
                      >
                        ＋ 新建旅行
                      </Link>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">最近创建</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  快速回到最近编辑的旅行计划。
                </p>
              </div>
            </div>

            {latestTrips.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-6 text-center text-sm text-zinc-500">
                暂无旅行计划。
              </div>
            ) : (
              <div className="space-y-3">
                {latestTrips.map((trip) => {
                  const status = getTripStatus(trip);

                  return (
                    <Link
                      key={trip.id}
                      href={`/trips/${trip.id}`}
                      className="block rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 transition hover:border-cyan-500/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="line-clamp-1 font-bold">
                            {trip.title}
                          </p>

                          <p className="mt-1 text-sm text-zinc-500">
                            {trip.country || "未填写国家"} ·{" "}
                            {trip.city || "未填写城市"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-xs ${getStatusClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </div>

                      <p className="mt-3 text-xs text-zinc-500">
                        {formatDateRange(trip)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">规划流程</h2>

            <div className="mt-5 space-y-3 text-sm text-zinc-300">
              <div className="rounded-2xl bg-zinc-950/70 p-4">
                <p className="font-bold text-white">1. 创建旅行档案</p>
                <p className="mt-1 text-zinc-500">
                  先确定旅行名称、国家、城市和日期。
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950/70 p-4">
                <p className="font-bold text-white">2. 设置预算</p>
                <p className="mt-1 text-zinc-500">
                  给旅行一个预算范围，后续记录费用更清晰。
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950/70 p-4">
                <p className="font-bold text-white">3. 添加每日行程</p>
                <p className="mt-1 text-zinc-500">
                  按天记录景点、美食、住宿和交通安排。
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950/70 p-4">
                <p className="font-bold text-white">4. 记录费用</p>
                <p className="mt-1 text-zinc-500">
                  旅途中随手记录开销，自动形成预算概览。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}