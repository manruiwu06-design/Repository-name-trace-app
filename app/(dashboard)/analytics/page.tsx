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
};

type Expense = {
  id: string;
  trip_id: string;
  category: string | null;
  amount: number | string;
  description: string | null;
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

function formatDate(value: string | null | undefined) {
  if (!value) return "未记录日期";

  return value;
}

export default function AnalyticsPage() {
  const router = useRouter();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  async function fetchAnalyticsData() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/");
      return;
    }

    const tripsResult = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (tripsResult.error) {
      alert(tripsResult.error.message);
      setLoading(false);
      return;
    }

    const userTrips = tripsResult.data || [];
    setTrips(userTrips);

    const tripIds = userTrips.map((trip) => trip.id);

    if (tripIds.length === 0) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const expensesResult = await supabase
      .from("expenses")
      .select("*")
      .in("trip_id", tripIds)
      .order("created_at", { ascending: false });

    if (expensesResult.error) {
      alert(expensesResult.error.message);
      setLoading(false);
      return;
    }

    setExpenses(expensesResult.data || []);
    setLoading(false);
  }

  const tripTitleMap = useMemo(() => {
    const map: Record<string, string> = {};

    trips.forEach((trip) => {
      map[trip.id] = trip.title;
    });

    return map;
  }, [trips]);

  const countries = Array.from(
    new Set(
      trips
        .map((trip) => trip.country)
        .filter((country): country is string => Boolean(country))
    )
  );

  const cities = Array.from(
    new Set(
      trips
        .map((trip) => trip.city)
        .filter((city): city is string => Boolean(city))
    )
  );

  const totalBudget = trips.reduce((sum, trip) => {
    return sum + Number(trip.budget || 0);
  }, 0);

  const totalSpent = expenses.reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);

  const remainingBudget = totalBudget - totalSpent;

  const budgetUsedPercent =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const budgetProgressWidth =
    totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  const upcomingTrips = trips.filter(
    (trip) => getTripStatus(trip) === "未开始"
  );

  const activeTrips = trips.filter(
    (trip) => getTripStatus(trip) === "旅行中"
  );

  const completedTrips = trips.filter(
    (trip) => getTripStatus(trip) === "已完成"
  );

  const pendingTrips = trips.filter(
    (trip) => getTripStatus(trip) === "待完善"
  );

  const expenseByCategory = expenses.reduce<Record<string, number>>(
    (result, expense) => {
      const category = expense.category || "其他";
      const amount = Number(expense.amount || 0);

      result[category] = (result[category] || 0) + amount;

      return result;
    },
    {}
  );

  const categoryList = Object.entries(expenseByCategory).sort(
    (a, b) => b[1] - a[1]
  );

  const recentExpenses = expenses.slice(0, 8);

  if (loading) {
    return (
      <main className="p-4 text-white sm:p-8">
        <p className="text-zinc-400">正在加载数据中心...</p>
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
                Trace Analytics
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                旅行数据仪表盘
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                汇总你的旅行数量、足迹范围、预算使用情况和费用结构，让每一趟旅行都变成可回顾的数据档案。
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/trips"
                  className="rounded-2xl bg-cyan-500 px-5 py-4 text-center text-sm font-black text-black hover:bg-cyan-400"
                >
                  管理旅行
                </Link>

                <Link
                  href="/planner"
                  className="rounded-2xl bg-zinc-800 px-5 py-4 text-center text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  规划中心
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
              <p className="text-sm text-zinc-400">预算使用率</p>

              <p className="mt-3 text-5xl font-black text-cyan-300">
                {budgetUsedPercent}%
              </p>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{ width: `${budgetProgressWidth}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-zinc-900 p-4">
                  <p className="text-zinc-500">总预算</p>
                  <p className="mt-1 font-bold">{formatMoney(totalBudget)}</p>
                </div>

                <div className="rounded-2xl bg-zinc-900 p-4">
                  <p className="text-zinc-500">已花费</p>
                  <p className="mt-1 font-bold text-cyan-300">
                    {formatMoney(totalSpent)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">旅行次数</p>
          <h2 className="mt-2 text-3xl font-black">{trips.length}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">国家数量</p>
          <h2 className="mt-2 text-3xl font-black">{countries.length}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">城市数量</p>
          <h2 className="mt-2 text-3xl font-black">{cities.length}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">总预算</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            {formatMoney(totalBudget)}
          </h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">总花费</p>
          <h2 className="mt-2 text-2xl font-black text-cyan-300 sm:text-3xl">
            {formatMoney(totalSpent)}
          </h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">剩余预算</p>

          <h2
            className={`mt-2 text-2xl font-black sm:text-3xl ${
              remainingBudget < 0 ? "text-red-300" : "text-emerald-300"
            }`}
          >
            {formatMoney(remainingBudget)}
          </h2>
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">费用分类统计</h2>
              <p className="mt-1 text-sm text-zinc-500">
                查看餐饮、住宿、交通等开销占比。
              </p>
            </div>

            <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
              {categoryList.length} 类
            </span>
          </div>

          {categoryList.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-cyan-500/25 bg-cyan-500/5 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-2xl">
                💳
              </div>

              <h3 className="mt-5 text-xl font-bold">还没有费用数据</h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                进入旅行详情页添加费用后，这里会自动生成分类统计和预算使用率。
              </p>

              <Link
                href="/trips"
                className="mt-6 inline-block rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-black hover:bg-cyan-400"
              >
                去记录费用
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {categoryList.map(([category, amount]) => {
                const percent =
                  totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;

                return (
                  <div
                    key={category}
                    className="rounded-2xl bg-zinc-950/70 p-4"
                  >
                    <div className="mb-3 flex justify-between gap-4 text-sm">
                      <span className="font-semibold">{category}</span>

                      <span className="text-zinc-400">
                        {formatMoney(amount)} · {percent}%
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">旅行状态统计</h2>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-950/70 p-4">
                <p className="text-sm text-zinc-500">未开始</p>
                <p className="mt-2 text-3xl font-black text-blue-300">
                  {upcomingTrips.length}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950/70 p-4">
                <p className="text-sm text-zinc-500">旅行中</p>
                <p className="mt-2 text-3xl font-black text-cyan-300">
                  {activeTrips.length}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950/70 p-4">
                <p className="text-sm text-zinc-500">已完成</p>
                <p className="mt-2 text-3xl font-black text-emerald-300">
                  {completedTrips.length}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950/70 p-4">
                <p className="text-sm text-zinc-500">待完善</p>
                <p className="mt-2 text-3xl font-black text-zinc-300">
                  {pendingTrips.length}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ["未开始", upcomingTrips.length],
                ["旅行中", activeTrips.length],
                ["已完成", completedTrips.length],
                ["待完善", pendingTrips.length],
              ].map(([status, count]) => {
                const percent =
                  trips.length > 0 ? Math.round((Number(count) / trips.length) * 100) : 0;

                return (
                  <div key={status}>
                    <div className="mb-2 flex justify-between text-sm text-zinc-400">
                      <span>{status}</span>
                      <span>{percent}%</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">预算概览</h2>

            <div className="mt-5 space-y-4 text-sm text-zinc-300">
              <div className="flex justify-between rounded-2xl bg-zinc-950/70 p-4">
                <span className="text-zinc-500">总预算</span>
                <span className="font-bold">{formatMoney(totalBudget)}</span>
              </div>

              <div className="flex justify-between rounded-2xl bg-zinc-950/70 p-4">
                <span className="text-zinc-500">已花费</span>
                <span className="font-bold text-cyan-300">
                  {formatMoney(totalSpent)}
                </span>
              </div>

              <div className="flex justify-between rounded-2xl bg-zinc-950/70 p-4">
                <span className="text-zinc-500">剩余预算</span>

                <span
                  className={`font-bold ${
                    remainingBudget < 0 ? "text-red-300" : "text-emerald-300"
                  }`}
                >
                  {formatMoney(remainingBudget)}
                </span>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-sm text-zinc-400">
                  <span>预算使用率</span>
                  <span>{budgetUsedPercent}%</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-cyan-500"
                    style={{ width: `${budgetProgressWidth}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">最近费用记录</h2>
              <p className="mt-1 text-sm text-zinc-500">
                最近添加的旅行开销。
              </p>
            </div>

            <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
              {recentExpenses.length} 条
            </span>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-black/20 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-xl">
                💰
              </div>

              <h3 className="mt-4 text-lg font-bold">还没有费用记录</h3>

              <p className="mt-2 text-sm text-zinc-500">
                进入旅行详情页添加费用后，这里会显示最近记录。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/trips/${expense.trip_id}`}
                  className="block rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 transition hover:border-cyan-500/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-cyan-400">
                        {expense.category || "其他"}
                      </p>

                      <p className="mt-1 font-semibold">
                        {expense.description || "未填写备注"}
                      </p>

                      <p className="mt-2 text-xs text-zinc-500">
                        {tripTitleMap[expense.trip_id] || "旅行"} ·{" "}
                        {formatDate(expense.created_at?.slice(0, 10))}
                      </p>
                    </div>

                    <p className="shrink-0 font-black text-white">
                      {formatMoney(expense.amount)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">旅行分布</h2>
              <p className="mt-1 text-sm text-zinc-500">
                你记录过的国家和城市。
              </p>
            </div>

            <Link href="/map" className="text-sm text-cyan-400">
              查看地图 →
            </Link>
          </div>

          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm text-zinc-400">国家足迹</p>

              <div className="flex flex-wrap gap-2">
                {countries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-5 text-sm text-zinc-500">
                    还没有国家记录。
                  </div>
                ) : (
                  countries.map((country) => (
                    <span
                      key={country}
                      className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300"
                    >
                      {country}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm text-zinc-400">城市足迹</p>

              <div className="flex flex-wrap gap-2">
                {cities.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-5 text-sm text-zinc-500">
                    还没有城市记录。
                  </div>
                ) : (
                  cities.map((city) => (
                    <span
                      key={city}
                      className="rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300"
                    >
                      {city}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}