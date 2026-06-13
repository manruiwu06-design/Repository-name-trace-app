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

export default function MapPage() {
  const router = useRouter();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrips();
  }, []);

  async function fetchTrips() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/");
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

  const countries = Array.from(
    new Set(trips.map((trip) => trip.country).filter(Boolean))
  );

  const cities = Array.from(
    new Set(trips.map((trip) => trip.city).filter(Boolean))
  );

  if (loading) {
    return (
      <main className="p-8 text-white">
        <p className="text-zinc-400">正在加载足迹地图...</p>
      </main>
    );
  }

  return (
    <main className="p-8 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">足迹地图</h1>
        <p className="text-zinc-400 mt-2">
          查看你去过的国家、城市和旅行足迹
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">已访问国家</p>
          <h2 className="text-4xl font-bold mt-2">{countries.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">已访问城市</p>
          <h2 className="text-4xl font-bold mt-2">{cities.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">旅行次数</p>
          <h2 className="text-4xl font-bold mt-2">{trips.length}</h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold mb-4">世界地图预览</h2>

          <div className="h-[420px] rounded-2xl border border-zinc-800 bg-black flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🌍</div>

              <p className="text-zinc-400">Mapbox 地图模块即将接入</p>

              <p className="text-sm text-zinc-600 mt-2">
                当前先展示你的国家和城市足迹数据
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold mb-4">国家足迹</h2>

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

          <div className="rounded-2xl bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold mb-4">城市足迹</h2>

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

      <div className="mt-8 rounded-2xl bg-zinc-900 p-6">
        <h2 className="text-xl font-semibold mb-4">旅行足迹记录</h2>

        <div className="space-y-4">
          {trips.length === 0 ? (
            <p className="text-zinc-500">还没有旅行记录</p>
          ) : (
            trips.map((trip) => (
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
    </main>
  );
}