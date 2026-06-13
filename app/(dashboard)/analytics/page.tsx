"use client";

import { useEffect, useState } from "react";
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

  const countries = Array.from(
    new Set(trips.map((trip) => trip.country).filter(Boolean))
  );

  const cities = Array.from(
    new Set(trips.map((trip) => trip.city).filter(Boolean))
  );

  const totalBudget = trips.reduce((sum, trip) => {
    return sum + Number(trip.budget || 0);
  }, 0);

  const totalSpent = expenses.reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);

  const remainingBudget = totalBudget - totalSpent;

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

  const recentExpenses = expenses.slice(0, 6);

  if (loading) {
    return (
      <main className="p-8 text-white">
        <p className="text-zinc-400">正在加载数据中心...</p>
      </main>
    );
  }

  return (
    <main className="p-8 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">数据中心</h1>

        <p className="text-zinc-400 mt-2">
          查看你的旅行统计、预算统计和费用结构
        </p>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">旅行次数</p>
          <h2 className="text-3xl font-bold mt-2">{trips.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">国家数量</p>
          <h2 className="text-3xl font-bold mt-2">{countries.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">城市数量</p>
          <h2 className="text-3xl font-bold mt-2">{cities.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">总预算</p>
          <h2 className="text-3xl font-bold mt-2">¥{totalBudget}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">总花费</p>
          <h2 className="text-3xl font-bold mt-2">¥{totalSpent}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">剩余预算</p>

          <h2
            className={
              remainingBudget < 0
                ? "text-3xl font-bold mt-2 text-red-400"
                : "text-3xl font-bold mt-2 text-cyan-400"
            }
          >
            ¥{remainingBudget}
          </h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold mb-6">费用分类统计</h2>

          {categoryList.length === 0 ? (
            <p className="text-zinc-500">还没有费用数据</p>
          ) : (
            <div className="space-y-5">
              {categoryList.map(([category, amount]) => {
                const percent =
                  totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;

                return (
                  <div key={category}>
                    <div className="flex justify-between mb-2">
                      <span>{category}</span>

                      <span className="text-zinc-400">
                        ¥{amount} · {percent}%
                      </span>
                    </div>

                    <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
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

        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold mb-6">预算概览</h2>

          <div className="space-y-4 text-zinc-300">
            <div className="flex justify-between">
              <span>总预算</span>
              <span>¥{totalBudget}</span>
            </div>

            <div className="flex justify-between">
              <span>已花费</span>
              <span>¥{totalSpent}</span>
            </div>

            <div className="flex justify-between">
              <span>剩余预算</span>

              <span
                className={
                  remainingBudget < 0 ? "text-red-400" : "text-cyan-400"
                }
              >
                ¥{remainingBudget}
              </span>
            </div>

            <div className="h-3 rounded-full bg-zinc-800 overflow-hidden mt-4">
              <div
                className="h-full rounded-full bg-cyan-500"
                style={{
                  width:
                    totalBudget > 0
                      ? `${Math.min((totalSpent / totalBudget) * 100, 100)}%`
                      : "0%",
                }}
              />
            </div>

            <p className="text-sm text-zinc-500">
              已使用预算：
              {totalBudget > 0
                ? `${Math.round((totalSpent / totalBudget) * 100)}%`
                : "0%"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold mb-6">最近费用记录</h2>

          <div className="space-y-3">
            {recentExpenses.length === 0 ? (
              <p className="text-zinc-500">还没有费用记录</p>
            ) : (
              recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="rounded-xl bg-zinc-800 p-4 flex justify-between"
                >
                  <div>
                    <p className="text-sm text-cyan-400">
                      {expense.category || "其他"}
                    </p>

                    <p className="font-semibold mt-1">
                      {expense.description || "未填写备注"}
                    </p>
                  </div>

                  <p className="font-bold">¥{expense.amount}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold mb-6">旅行分布</h2>

          <div className="space-y-4">
            <div>
              <p className="text-zinc-400 mb-3">国家足迹</p>

              <div className="flex flex-wrap gap-2">
                {countries.length === 0 ? (
                  <p className="text-zinc-500">还没有国家记录</p>
                ) : (
                  countries.map((country) => (
                    <span
                      key={country}
                      className="rounded-full bg-cyan-500/10 px-4 py-2 text-sm text-cyan-400"
                    >
                      {country}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="text-zinc-400 mb-3">城市足迹</p>

              <div className="flex flex-wrap gap-2">
                {cities.length === 0 ? (
                  <p className="text-zinc-500">还没有城市记录</p>
                ) : (
                  cities.map((city) => (
                    <span
                      key={city}
                      className="rounded-full bg-purple-500/10 px-4 py-2 text-sm text-purple-400"
                    >
                      {city}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}