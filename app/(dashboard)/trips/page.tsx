"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Trip = {
  id?: string;
  user_id?: string | null;
  title: string;
  country: string | null;
  city: string | null;
  budget: string | number | null;
  startDate?: string;
  endDate?: string;
  start_date?: string | null;
  end_date?: string | null;
};

export default function TripsPage() {
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    country: "",
    city: "",
    budget: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    initPage();
  }, []);

  async function initPage() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/");
      return;
    }

    setUserId(data.user.id);
    fetchTrips(data.user.id);
  }

  async function fetchTrips(currentUserId: string) {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setTrips(data || []);
    setLoading(false);
  }

  async function createTrip() {
    if (!form.title) {
      alert("请填写旅行名称");
      return;
    }

    if (!userId) {
      alert("请先登录");
      router.push("/");
      return;
    }

    const { error } = await supabase.from("trips").insert([
      {
        user_id: userId,
        title: form.title,
        country: form.country || null,
        city: form.city || null,
        budget: form.budget ? Number(form.budget) : null,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setForm({
      title: "",
      country: "",
      city: "",
      budget: "",
      startDate: "",
      endDate: "",
    });

    setShowModal(false);
    fetchTrips(userId);
  }

  async function deleteTrip(id?: string) {
    if (!id) return;
    if (!userId) return;

    const confirmDelete = window.confirm("确定要删除这趟旅行吗？");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("trips")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    fetchTrips(userId);
  }

  return (
    <main className="p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">我的旅行</h1>
          <p className="text-zinc-400 mt-2">管理你的所有旅行计划</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-3 rounded-xl bg-cyan-500 text-black font-semibold"
        >
          + 新建旅行
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-400">正在加载旅行数据...</p>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {trips.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900 p-6">
              <h2 className="text-xl font-semibold">还没有旅行</h2>
              <p className="text-zinc-400 mt-2">
                点击右上角「新建旅行」开始记录你的第一趟旅行。
              </p>
            </div>
          ) : (
            trips.map((trip) => (
              <div
                key={trip.id}
                className="rounded-2xl bg-zinc-900 p-5 hover:bg-zinc-800 transition"
              >
                <Link href={`/trips/${trip.id}`} className="block">
                  <h2 className="text-xl font-semibold">{trip.title}</h2>

                  <p className="text-zinc-400 mt-2">
                    {trip.country || "未填写国家"} ·{" "}
                    {trip.city || "未填写城市"}
                  </p>

                  <p className="text-zinc-400 mt-1">
                    {trip.start_date || trip.startDate || "未填写开始日期"} -{" "}
                    {trip.end_date || trip.endDate || "未填写结束日期"}
                  </p>

                  <p className="mt-4">
                    预算：{trip.budget ? `¥${trip.budget}` : "未填写"}
                  </p>

                  <p className="mt-4 text-sm text-cyan-400">
                    点击查看详情 →
                  </p>
                </Link>

                <button
                  onClick={() => deleteTrip(trip.id)}
                  className="mt-5 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
                >
                  删除
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="w-full max-w-xl rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
            <h2 className="text-2xl font-bold mb-6">新建旅行</h2>

            <div className="space-y-4">
              <input
                placeholder="旅行名称"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="国家"
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />

                <input
                  placeholder="城市"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />
              </div>

              <input
                placeholder="预算"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />

                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-3 rounded-xl bg-zinc-800"
              >
                取消
              </button>

              <button
                onClick={createTrip}
                className="px-5 py-3 rounded-xl bg-cyan-500 text-black font-semibold"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}