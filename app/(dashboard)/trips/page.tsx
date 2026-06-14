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

type ItineraryImageItem = {
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

export default function TripsPage() {
  const router = useRouter();

  const statusOptions = ["全部", "未开始", "旅行中", "已完成", "待完善"];

  const [userId, setUserId] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");

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
    await fetchTrips(data.user.id);
    setLoading(false);
  }

  async function fetchTrips(currentUserId: string) {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    const tripList = data || [];
    const tripIds = tripList.map((trip) => trip.id);

    if (tripIds.length === 0) {
      setTrips([]);
      return;
    }

    const { data: imageItems, error: imageError } = await supabase
      .from("itinerary_items")
      .select("trip_id, image_url, day_number, time, created_at")
      .in("trip_id", tripIds)
      .order("day_number", { ascending: true })
      .order("time", { ascending: true });

    if (imageError) {
      console.error(imageError);
      setTrips(tripList);
      return;
    }

    const coverMap: Record<string, string> = {};

    (imageItems || []).forEach((item: ItineraryImageItem) => {
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
  }

  async function addTrip() {
    if (!userId) {
      alert("请先登录");
      router.push("/");
      return;
    }

    if (!form.title) {
      alert("请填写旅行名称");
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

  async function deleteTrip(tripId: string) {
    if (!userId) {
      alert("请先登录");
      return;
    }

    const confirmDelete = window.confirm("确定要删除这趟旅行吗？");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("trips")
      .delete()
      .eq("id", tripId)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    fetchTrips(userId);
  }

  const filteredTrips = trips.filter((trip) => {
    const status = getTripStatus(trip);

    const matchesStatus =
      statusFilter === "全部" ? true : status === statusFilter;

    const query = searchQuery.trim().toLowerCase();

    const matchesSearch =
      query.length === 0
        ? true
        : [
            trip.title,
            trip.country || "",
            trip.city || "",
            getTripStatus(trip),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

    return matchesStatus && matchesSearch;
  });

  const totalBudget = trips.reduce((sum, trip) => {
    return sum + Number(trip.budget || 0);
  }, 0);

  const completedCount = trips.filter(
    (trip) => getTripStatus(trip) === "已完成"
  ).length;

  const activeCount = trips.filter(
    (trip) => getTripStatus(trip) === "旅行中"
  ).length;

  if (loading) {
    return (
      <main className="p-4 text-white sm:p-8">
        <p className="text-zinc-400">正在加载我的旅行...</p>
      </main>
    );
  }

  return (
    <main className="p-4 text-white sm:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-cyan-400">Trace</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">我的旅行</h1>
          <p className="mt-2 text-zinc-400">
            管理你的旅行计划、预算、行程与照片记忆。
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-fit rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black hover:bg-cyan-400"
        >
          + 新建旅行
        </button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-sm text-zinc-400">总旅行</p>
          <h2 className="mt-2 text-3xl font-bold">{trips.length}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-sm text-zinc-400">旅行中</p>
          <h2 className="mt-2 text-3xl font-bold text-cyan-400">
            {activeCount}
          </h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-sm text-zinc-400">已完成</p>
          <h2 className="mt-2 text-3xl font-bold text-emerald-400">
            {completedCount}
          </h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-sm text-zinc-400">总预算</p>
          <h2 className="mt-2 text-3xl font-bold">¥{totalBudget}</h2>
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-zinc-900 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            placeholder="搜索旅行名称、国家、城市..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500 lg:max-w-md"
          />

          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option}
                onClick={() => setStatusFilter(option)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  statusFilter === option
                    ? "bg-cyan-500 text-black"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-10 text-center">
          <h2 className="text-xl font-semibold">还没有匹配的旅行</h2>
          <p className="mt-2 text-zinc-500">
            可以新建一趟旅行，或者调整搜索和筛选条件。
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {filteredTrips.map((trip) => {
            const status = getTripStatus(trip);

            return (
              <div
                key={trip.id}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-1 hover:border-cyan-500/40"
              >
                <div className="relative h-44 bg-zinc-950 sm:h-48">
                  {trip.cover_image_url ? (
                    <img
                      src={trip.cover_image_url}
                      alt={`${trip.title} 的旅行封面`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.25),_transparent_35%),linear-gradient(135deg,_#18181b,_#09090b)]">
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-xl font-bold text-cyan-300">
                          T
                        </div>

                        <p className="text-sm font-semibold text-zinc-300">
                          暂无旅行封面
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          上传行程图片后自动生成
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <span
                    className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                      status
                    )}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="p-5">
                  <div className="mb-4">
                    <h2 className="line-clamp-1 text-xl font-bold">
                      {trip.title}
                    </h2>

                    <p className="mt-2 text-sm text-zinc-400">
                      {trip.country || "未填写国家"} ·{" "}
                      {trip.city || "未填写城市"}
                    </p>
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-zinc-800 p-3">
                      <p className="text-zinc-500">预算</p>
                      <p className="mt-1 font-semibold">
                        {trip.budget ? `¥${trip.budget}` : "未填写"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-zinc-800 p-3">
                      <p className="text-zinc-500">时间</p>
                      <p className="mt-1 font-semibold">
                        {trip.start_date || "未填写"}
                      </p>
                    </div>
                  </div>

                  <div className="mb-5 rounded-xl bg-zinc-950/50 p-3 text-xs text-zinc-500">
                    {trip.cover_image_url
                      ? "封面来自这趟旅行的第一张行程图片"
                      : "进入详情页，为每日行程上传图片后，这里会自动显示封面"}
                  </div>

                  <div className="flex gap-3">
                    <Link
                      href={`/trips/${trip.id}`}
                      className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 text-center text-sm font-semibold text-black hover:bg-cyan-400"
                    >
                      查看详情
                    </Link>

                    <button
                      onClick={() => deleteTrip(trip.id)}
                      className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-6 text-2xl font-bold">新建旅行</h2>

            <div className="space-y-4">
              <input
                placeholder="旅行名称，例如：日本樱花之旅"
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  placeholder="国家，例如：日本"
                  value={form.country}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      country: e.target.value,
                    })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500"
                />

                <input
                  placeholder="城市，例如：东京"
                  value={form.city}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      city: e.target.value,
                    })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500"
                />
              </div>

              <input
                placeholder="预算，例如：15000"
                value={form.budget}
                onChange={(e) =>
                  setForm({
                    ...form,
                    budget: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm text-zinc-400">开始日期</p>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm text-zinc-400">结束日期</p>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl bg-zinc-800 px-5 py-3"
              >
                取消
              </button>

              <button
                onClick={addTrip}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black hover:bg-cyan-400"
              >
                创建旅行
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}