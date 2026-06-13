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

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
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
    new Set(trips.map((trip) => trip.country).filter(Boolean))
  );

  const cities = Array.from(
    new Set(trips.map((trip) => trip.city).filter(Boolean))
  );

  const totalSpent = expenses.reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);

  const latestTrip = trips[0];

  if (loading) {
    return (
      <main className="p-8 text-white">
        <p className="text-zinc-400">正在加载个人中心...</p>
      </main>
    );
  }

  return (
    <main className="p-8 text-white">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">个人中心</h1>
          <p className="text-zinc-400 mt-2">管理你的旅行人生档案</p>
        </div>

        <button
          onClick={logout}
          className="rounded-xl bg-red-500/10 px-5 py-3 text-red-400 hover:bg-red-500/20"
        >
          退出登录
        </button>
      </div>

      <div className="rounded-2xl bg-zinc-900 p-8 mb-8">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-cyan-500 flex items-center justify-center text-4xl font-bold text-black">
            T
          </div>

          <div>
            <h2 className="text-3xl font-bold">Trace 用户</h2>
            <p className="text-zinc-400 mt-2">{email}</p>
            <p className="text-zinc-500 mt-1">
              Build Your Journey. Preserve Your Story.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">旅行次数</p>
          <h2 className="text-4xl font-bold mt-2">{trips.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">访问国家</p>
          <h2 className="text-4xl font-bold mt-2">{countries.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">访问城市</p>
          <h2 className="text-4xl font-bold mt-2">{cities.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">累计花费</p>
          <h2 className="text-4xl font-bold mt-2">¥{totalSpent}</h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold mb-4">最近一次旅行</h2>

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
            </div>
          ) : (
            <p className="text-zinc-500">还没有旅行记录</p>
          )}
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold mb-4">旅行人生档案</h2>

          <div className="space-y-4 text-zinc-300">
            <p>你已经记录了 {trips.length} 次旅行。</p>
            <p>你的足迹覆盖了 {countries.length} 个国家。</p>
            <p>你已经访问了 {cities.length} 个城市。</p>
            <p>你的累计旅行花费为 ¥{totalSpent}。</p>
          </div>
        </div>
      </div>
    </main>
  );
}