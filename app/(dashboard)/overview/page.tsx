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

export default function OverviewPage() {
  const router = useRouter();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  async function fetchOverviewData() {
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

  const countries = new Set(
    trips.map((trip) => trip.country).filter(Boolean)
  );

  const cities = new Set(
    trips.map((trip) => trip.city).filter(Boolean)
  );

  const totalBudget = trips.reduce((sum, trip) => {
    return sum + Number(trip.budget || 0);
  }, 0);

  const totalSpent = expenses.reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);

  const recentTrips = trips.slice(0, 4);

  if (loading) {
    return (
      <main className="p-8 text-white">
        <p className="text-zinc-400">正在加载总览数据...</p>
      </main>
    );
  }

  return (
    <main className="p-8 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">总览</h1>
        <p className="text-zinc-400 mt-2">
          查看你的旅行、预算和足迹概览
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-4 mb-8">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">旅行次数</p>
          <h2 className="text-3xl font-bold mt-2">{trips.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">国家数量</p>
          <h2 className="text-3xl font-bold mt-2">{countries.size}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">城市数量</p>
          <h2 className="text-3xl font-bold mt-2">{cities.size}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">总预算</p>
          <h2 className="text-3xl font-bold mt-2">¥{totalBudget}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">总花费</p>
          <h2 className="text-3xl font-bold mt-2">¥{totalSpent}</h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold mb-4">足迹地图预览</h2>

          <div className="h-[360px] rounded-xl border border-zinc-800 bg-black flex items-center justify-center text-zinc-500">
            地图模块即将上线
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">最近旅行</h2>

            <Link href="/trips" className="text-sm text-cyan-400">
              查看全部
            </Link>
          </div>

          <div className="space-y-4">
            {recentTrips.length === 0 ? (
              <p className="text-zinc-500">还没有旅行记录</p>
            ) : (
              recentTrips.map((trip) => (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="block rounded-xl bg-zinc-800 p-4 hover:bg-zinc-700 transition"
                >
                  <h3 className="font-semibold">{trip.title}</h3>

                  <p className="text-sm text-zinc-400 mt-1">
                    {trip.country || "未填写国家"} ·{" "}
                    {trip.city || "未填写城市"}
                  </p>

                  <p className="text-sm text-zinc-500 mt-1">
                    {trip.start_date || "未填写开始日期"} -{" "}
                    {trip.end_date || "未填写结束日期"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold mb-4">预算概览</h2>

          <div className="space-y-3 text-zinc-300">
            <p>总预算：¥{totalBudget}</p>
            <p>已花费：¥{totalSpent}</p>
            <p>
              剩余预算：
              <span
                className={
                  totalBudget - totalSpent < 0
                    ? "text-red-400"
                    : "text-cyan-400"
                }
              >
                ¥{totalBudget - totalSpent}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold mb-4">快速入口</h2>

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/trips"
              className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black"
            >
              我的旅行
            </Link>

            <Link
              href="/planner"
              className="rounded-xl bg-zinc-800 px-5 py-3 font-semibold text-white"
            >
              旅行规划
            </Link>

            <Link
              href="/map"
              className="rounded-xl bg-zinc-800 px-5 py-3 font-semibold text-white"
            >
              足迹地图
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}