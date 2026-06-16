"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createTripForCurrentUser,
  deleteTripForCurrentUser,
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

function getDefaultForm() {
  return {
    title: "",
    country: "",
    city: "",
    budget: "",
    startDate: "",
    endDate: "",
  };
}

export default function TripsPage() {
  const router = useRouter();

  const statusOptions: Array<"全部" | TripStatus> = [
    "全部",
    "未开始",
    "旅行中",
    "已完成",
    "待完善",
  ];

  const [userId, setUserId] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"全部" | TripStatus>("全部");

  const [form, setForm] = useState(getDefaultForm);

  useEffect(() => {
    initPage();
  }, []);

  async function initPage() {
    try {
      const result = await getTripsWithCoversForCurrentUser();

      if (!result.userId) {
        router.push("/");
        return;
      }

      setUserId(result.userId);
      setTrips(result.trips);
    } catch (error) {
      alert(error instanceof Error ? error.message : "加载旅行失败");
    } finally {
      setLoading(false);
    }
  }

  async function refreshTrips() {
    try {
      const result = await getTripsWithCoversForCurrentUser();

      if (!result.userId) {
        router.push("/");
        return;
      }

      setUserId(result.userId);
      setTrips(result.trips);
    } catch (error) {
      alert(error instanceof Error ? error.message : "刷新旅行失败");
    }
  }

  function openCreateModal() {
    setForm(getDefaultForm());
    setShowModal(true);
  }

  function closeCreateModal() {
    setForm(getDefaultForm());
    setShowModal(false);
  }

  async function addTrip() {
    if (!userId) {
      alert("请先登录");
      router.push("/");
      return;
    }

    if (!form.title.trim()) {
      alert("请填写旅行名称");
      return;
    }

    try {
      await createTripForCurrentUser({
        title: form.title.trim(),
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        budget: form.budget ? Number(form.budget) : null,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
      });

      closeCreateModal();
      await refreshTrips();
    } catch (error) {
      alert(error instanceof Error ? error.message : "创建旅行失败");
    }
  }

  async function deleteTrip(tripId: string) {
    if (!userId) {
      alert("请先登录");
      return;
    }

    const confirmDelete = window.confirm("确定要删除这趟旅行吗？");

    if (!confirmDelete) return;

    try {
      await deleteTripForCurrentUser(tripId);
      await refreshTrips();
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除旅行失败");
    }
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
            formatDateRange(trip),
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

  const pendingCount = trips.filter(
    (trip) => getTripStatus(trip) === "待完善"
  ).length;

  const hasAnyTrip = trips.length > 0;
  const isFilteredEmpty = hasAnyTrip && filteredTrips.length === 0;

  if (loading) {
    return (
      <main className="p-4 text-white sm:p-8">
        <p className="text-zinc-400">正在加载我的旅行...</p>
      </main>
    );
  }

  return (
    <main className="p-4 text-white sm:p-8">
      <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_35%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(135deg,_#18181b,_#09090b)]" />

          <div className="relative p-5 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
                  Trace Travel Archive
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
                  我的旅行
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                  管理你的旅行计划、预算、行程与照片记忆。每一趟旅行，都是人生档案的一页。
                </p>
              </div>

              <button
                onClick={openCreateModal}
                className="w-full rounded-2xl bg-cyan-500 px-5 py-4 text-sm font-black text-black shadow-[0_0_30px_rgba(34,211,238,0.25)] hover:bg-cyan-400 sm:w-fit"
              >
                ＋ 新建旅行
              </button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
                <p className="text-xs text-zinc-400">总旅行</p>
                <h2 className="mt-2 text-3xl font-black">{trips.length}</h2>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
                <p className="text-xs text-zinc-400">旅行中</p>
                <h2 className="mt-2 text-3xl font-black text-cyan-300">
                  {activeCount}
                </h2>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
                <p className="text-xs text-zinc-400">已完成</p>
                <h2 className="mt-2 text-3xl font-black text-emerald-300">
                  {completedCount}
                </h2>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
                <p className="text-xs text-zinc-400">总预算</p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  {formatMoney(totalBudget)}
                </h2>
              </div>
            </div>

            {pendingCount > 0 && (
              <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/25 p-4 text-sm text-zinc-400">
                你还有{" "}
                <span className="font-bold text-cyan-300">{pendingCount}</span>{" "}
                趟旅行信息待完善，可以进入详情页补充日期、预算和行程图片。
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
              🔎
            </span>

            <input
              placeholder="搜索旅行名称、国家、城市..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl bg-zinc-800 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-zinc-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 xl:flex-wrap xl:overflow-visible xl:pb-0">
            {statusOptions.map((option) => (
              <button
                key={option}
                onClick={() => setStatusFilter(option)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
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

        {(searchQuery || statusFilter !== "全部") && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-zinc-950/70 p-3 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              当前显示{" "}
              <span className="font-bold text-cyan-300">
                {filteredTrips.length}
              </span>{" "}
              趟旅行
            </span>

            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("全部");
              }}
              className="w-fit rounded-full bg-zinc-800 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              清空筛选
            </button>
          </div>
        )}
      </section>

      {!hasAnyTrip ? (
        <section className="rounded-3xl border border-dashed border-cyan-500/25 bg-cyan-500/5 p-8 text-center sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-500/15 text-3xl">
            🧭
          </div>

          <h2 className="mt-6 text-2xl font-black">还没有旅行档案</h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
            新建第一趟旅行后，你可以继续添加每日行程、费用预算、城市足迹和旅行照片。
          </p>

          <button
            onClick={openCreateModal}
            className="mt-7 rounded-full bg-cyan-500 px-6 py-3 text-sm font-black text-black hover:bg-cyan-400"
          >
            ＋ 创建第一趟旅行
          </button>
        </section>
      ) : isFilteredEmpty ? (
        <section className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/50 p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-2xl">
            🔎
          </div>

          <h2 className="mt-5 text-xl font-bold">没有匹配的旅行</h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
            可以调整搜索关键词，或者切换上方状态筛选。
          </p>

          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("全部");
            }}
            className="mt-6 rounded-full bg-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
          >
            清空筛选
          </button>
        </section>
      ) : (
        <section className="grid gap-5 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {filteredTrips.map((trip) => {
            const status = getTripStatus(trip);

            return (
              <article
                key={trip.id}
                className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-[0_0_35px_rgba(34,211,238,0.08)]"
              >
                <div className="relative h-48 bg-zinc-950 sm:h-52">
                  {trip.cover_image_url ? (
                    <img
                      src={trip.cover_image_url}
                      alt={`${trip.title} 的旅行封面`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.25),_transparent_35%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(135deg,_#18181b,_#09090b)]">
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-2xl font-black text-cyan-300">
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

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                  <span
                    className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                      status
                    )}`}
                  >
                    {status}
                  </span>

                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="line-clamp-1 text-2xl font-black text-white">
                      {trip.title}
                    </h2>

                    <p className="mt-1 text-sm text-zinc-300">
                      {trip.country || "未填写国家"} ·{" "}
                      {trip.city || "未填写城市"}
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-zinc-950/70 p-3">
                      <p className="text-xs text-zinc-500">预算</p>
                      <p className="mt-1 font-bold">
                        {trip.budget ? formatMoney(trip.budget) : "未填写"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-zinc-950/70 p-3">
                      <p className="text-xs text-zinc-500">日期</p>
                      <p className="mt-1 line-clamp-1 font-bold">
                        {formatDateRange(trip)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs leading-5 text-zinc-500">
                    {trip.cover_image_url
                      ? "封面来自这趟旅行的第一张行程图片。"
                      : "进入详情页，为每日行程上传图片后，这里会自动显示封面。"}
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Link
                      href={`/trips/${trip.id}`}
                      className="flex-1 rounded-2xl bg-cyan-500 px-4 py-3 text-center text-sm font-black text-black hover:bg-cyan-400"
                    >
                      查看详情
                    </Link>

                    <button
                      onClick={() => deleteTrip(trip.id)}
                      className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">新建旅行</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  创建一趟新的旅行档案，之后可以继续补充每日行程和费用。
                </p>
              </div>

              <button
                onClick={closeCreateModal}
                className="rounded-full bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                关闭
              </button>
            </div>

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
                className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500"
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
                  className="rounded-2xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500"
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
                  className="rounded-2xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500"
                />
              </div>

              <input
                type="number"
                placeholder="预算，例如：15000"
                value={form.budget}
                onChange={(e) =>
                  setForm({
                    ...form,
                    budget: e.target.value,
                  })
                }
                className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500"
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
                    className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
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
                    className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeCreateModal}
                className="rounded-2xl bg-zinc-800 px-5 py-3 text-zinc-300 hover:bg-zinc-700"
              >
                取消
              </button>

              <button
                onClick={addTrip}
                className="rounded-2xl bg-cyan-500 px-5 py-3 font-black text-black hover:bg-cyan-400"
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