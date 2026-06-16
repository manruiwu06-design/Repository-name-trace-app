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

function formatDateRange(trip: Trip) {
  if (!trip.start_date && !trip.end_date) return "未填写日期";
  if (trip.start_date && !trip.end_date) return `${trip.start_date} 出发`;
  if (!trip.start_date && trip.end_date) return `${trip.end_date} 结束`;
  return `${trip.start_date} 至 ${trip.end_date}`;
}

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/");
      return;
    }

    setEmail(userData.user.email || "");
    setMemberSince(userData.user.created_at?.slice(0, 10) || "");

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

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

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

  const completedCount = trips.filter(
    (trip) => getTripStatus(trip) === "已完成"
  ).length;

  const upcomingCount = trips.filter(
    (trip) => getTripStatus(trip) === "未开始"
  ).length;

  const activeCount = trips.filter(
    (trip) => getTripStatus(trip) === "旅行中"
  ).length;

  const pendingCount = trips.filter(
    (trip) => getTripStatus(trip) === "待完善"
  ).length;

  const latestTrip = trips[0] || null;

  const travelerTags = [
    trips.length === 0 ? "新手旅行者" : "Trace 旅行者",
    countries.length >= 3 ? "多国探索者" : "足迹记录中",
    completedCount > 0 ? "有完成旅行" : "计划养成中",
    totalSpent > 0 ? "预算记录者" : "待记录消费",
  ];

  if (loading) {
    return (
      <main className="p-4 text-white sm:p-8">
        <p className="text-zinc-400">正在加载个人中心...</p>
      </main>
    );
  }

  return (
    <main className="p-4 text-white sm:p-8">
      <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_35%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(135deg,_#18181b,_#09090b)]" />

          <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.35fr_0.9fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
                Trace Profile
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                旅行人生档案
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                这里记录你的旅行身份、足迹范围、预算记录和 Trace 使用状态。未来可以继续扩展成完整的个人旅行主页。
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/trips"
                  className="rounded-2xl bg-cyan-500 px-5 py-4 text-center text-sm font-black text-black hover:bg-cyan-400"
                >
                  我的旅行
                </Link>

                <Link
                  href="/map"
                  className="rounded-2xl bg-zinc-800 px-5 py-4 text-center text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  足迹地图
                </Link>

                <button
                  onClick={logout}
                  className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-300 hover:bg-red-500/20"
                >
                  退出登录
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-500/20 bg-black/30 p-5 backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-cyan-500 text-4xl font-black text-black shadow-[0_0_40px_rgba(34,211,238,0.28)]">
                  T
                </div>

                <div className="min-w-0">
                  <h2 className="text-2xl font-black">Trace 用户</h2>

                  <p className="mt-1 truncate text-sm text-zinc-400">
                    {email || "未获取邮箱"}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {memberSince ? `加入于 ${memberSince}` : "Trace 旅行者"}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {travelerTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="mt-5 text-sm leading-6 text-zinc-400">
                Build Your Journey. Preserve Your Story.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">旅行次数</p>
          <h2 className="mt-2 text-3xl font-black">{trips.length}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">访问国家</p>
          <h2 className="mt-2 text-3xl font-black">{countries.length}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">访问城市</p>
          <h2 className="mt-2 text-3xl font-black">{cities.length}</h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">已完成</p>
          <h2 className="mt-2 text-3xl font-black text-emerald-300">
            {completedCount}
          </h2>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <p className="text-xs text-zinc-400">累计花费</p>
          <h2 className="mt-2 text-2xl font-black text-cyan-300 sm:text-3xl">
            {formatMoney(totalSpent)}
          </h2>
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">最近一次旅行</h2>
            <p className="mt-1 text-sm text-zinc-500">
              快速回到你最近创建或编辑的旅行档案。
            </p>
          </div>

          {latestTrip ? (
            <Link
              href={`/trips/${latestTrip.id}`}
              className="block rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 transition hover:border-cyan-500/40"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-black">
                      {latestTrip.title}
                    </h3>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
                        getTripStatus(latestTrip)
                      )}`}
                    >
                      {getTripStatus(latestTrip)}
                    </span>
                  </div>

                  <p className="mt-3 text-zinc-400">
                    {latestTrip.country || "未填写国家"} ·{" "}
                    {latestTrip.city || "未填写城市"}
                  </p>

                  <p className="mt-2 text-sm text-zinc-500">
                    {formatDateRange(latestTrip)}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-900 p-4 sm:text-right">
                  <p className="text-xs text-zinc-500">预算</p>
                  <p className="mt-1 text-xl font-black text-cyan-300">
                    {latestTrip.budget
                      ? formatMoney(latestTrip.budget)
                      : "未填写"}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm font-semibold text-cyan-400">
                打开旅行档案 →
              </p>
            </Link>
          ) : (
            <div className="rounded-3xl border border-dashed border-cyan-500/25 bg-cyan-500/5 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-2xl">
                🧭
              </div>

              <h3 className="mt-5 text-xl font-bold">还没有旅行记录</h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                创建第一趟旅行后，这里会显示你的最新旅行档案。
              </p>

              <Link
                href="/trips"
                className="mt-6 inline-block rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-black hover:bg-cyan-400"
              >
                ＋ 创建第一趟旅行
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">旅行档案进度</h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-zinc-950/70 p-4">
              <p className="text-sm text-zinc-500">未开始</p>
              <p className="mt-2 text-3xl font-black text-blue-300">
                {upcomingCount}
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-950/70 p-4">
              <p className="text-sm text-zinc-500">旅行中</p>
              <p className="mt-2 text-3xl font-black text-cyan-300">
                {activeCount}
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-950/70 p-4">
              <p className="text-sm text-zinc-500">已完成</p>
              <p className="mt-2 text-3xl font-black text-emerald-300">
                {completedCount}
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-950/70 p-4">
              <p className="text-sm text-zinc-500">待完善</p>
              <p className="mt-2 text-3xl font-black text-zinc-300">
                {pendingCount}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm text-zinc-400">
            <div className="rounded-2xl bg-zinc-950/70 p-4">
              你已经记录了{" "}
              <span className="font-bold text-cyan-300">{trips.length}</span>{" "}
              次旅行。
            </div>

            <div className="rounded-2xl bg-zinc-950/70 p-4">
              足迹覆盖{" "}
              <span className="font-bold text-cyan-300">
                {countries.length}
              </span>{" "}
              个国家、{" "}
              <span className="font-bold text-cyan-300">{cities.length}</span>{" "}
              个城市。
            </div>

            <div className="rounded-2xl bg-zinc-950/70 p-4">
              累计旅行预算{" "}
              <span className="font-bold text-cyan-300">
                {formatMoney(totalBudget)}
              </span>
              ，已记录花费{" "}
              <span className="font-bold text-cyan-300">
                {formatMoney(totalSpent)}
              </span>
              。
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-4">
        <Link
          href="/trips"
          className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40"
        >
          <p className="text-sm text-cyan-400">Trips</p>
          <h2 className="mt-2 text-xl font-bold">我的旅行</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            新建旅行、编辑行程、记录费用和旅行回忆。
          </p>
        </Link>

        <Link
          href="/planner"
          className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40"
        >
          <p className="text-sm text-cyan-400">Planner</p>
          <h2 className="mt-2 text-xl font-bold">规划中心</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            管理即将出发、旅行中和待完善的计划。
          </p>
        </Link>

        <Link
          href="/map"
          className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40"
        >
          <p className="text-sm text-cyan-400">Map</p>
          <h2 className="mt-2 text-xl font-bold">足迹地图</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            查看你去过的城市，把旅行轨迹点亮。
          </p>
        </Link>

        <Link
          href="/analytics"
          className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40"
        >
          <p className="text-sm text-cyan-400">Analytics</p>
          <h2 className="mt-2 text-xl font-bold">数据分析</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            查看预算、花费结构和旅行统计数据。
          </p>
        </Link>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
              Coming Soon
            </span>

            <h2 className="mt-4 text-2xl font-black">账号设置</h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              未来这里可以加入头像、昵称、旅行偏好、隐私设置、社区主页设置和账号安全管理。
            </p>
          </div>

          <div className="grid gap-3 text-sm text-zinc-300">
            <div className="rounded-2xl bg-zinc-950/70 p-4">
              👤 个人资料编辑
            </div>

            <div className="rounded-2xl bg-zinc-950/70 p-4">
              🧭 旅行偏好设置
            </div>

            <div className="rounded-2xl bg-zinc-950/70 p-4">
              🔒 账号与隐私管理
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}