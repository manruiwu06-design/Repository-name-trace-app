"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

type ItineraryItem = {
  id: string;
  trip_id: string;
  day_number: number | null;
  time: string | null;
  title: string;
  category: string | null;
  notes: string | null;
  image_url: string | null;
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

type ItineraryForm = {
  dayNumber: string;
  time: string;
  title: string;
  category: string;
  notes: string;
  imageFile: File | null;
};

type EditingItineraryForm = ItineraryForm & {
  id: string;
  imageUrl: string | null;
};

type ExpenseForm = {
  category: string;
  amount: string;
  description: string;
};

type EditingExpenseForm = ExpenseForm & {
  id: string;
};

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

function getDefaultItineraryForm(): ItineraryForm {
  return {
    dayNumber: "1",
    time: "",
    title: "",
    category: "景点",
    notes: "",
    imageFile: null,
  };
}

function getDefaultExpenseForm(): ExpenseForm {
  return {
    category: "餐饮",
    amount: "",
    description: "",
  };
}

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = Array.isArray(params.id) ? params.id[0] : params.id;

  const itineraryCategoryOptions = [
    "景点",
    "美食",
    "住宿",
    "交通",
    "购物",
    "其他",
  ];

  const itineraryFilterOptions = [
    "全部",
    "景点",
    "美食",
    "住宿",
    "交通",
    "购物",
    "其他",
  ];

  const expenseFilterOptions = [
    "全部",
    "餐饮",
    "住宿",
    "交通",
    "门票",
    "购物",
    "其他",
  ];

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [tripForm, setTripForm] = useState({
    title: "",
    country: "",
    city: "",
    budget: "",
    startDate: "",
    endDate: "",
  });

  const [itemForm, setItemForm] =
    useState<ItineraryForm>(getDefaultItineraryForm);
  const [editingItemForm, setEditingItemForm] =
    useState<EditingItineraryForm | null>(null);

  const [expenseForm, setExpenseForm] =
    useState<ExpenseForm>(getDefaultExpenseForm);
  const [editingExpenseForm, setEditingExpenseForm] =
    useState<EditingExpenseForm | null>(null);

  const [expenseFilter, setExpenseFilter] = useState("全部");
  const [itineraryFilter, setItineraryFilter] = useState("全部");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    initPage();
  }, []);

  async function initPage() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/");
      return;
    }

    setCurrentUserId(data.user.id);

    if (!tripId) {
      router.push("/trips");
      return;
    }

    await fetchTripData(data.user.id, tripId);
    setLoading(false);
  }

  async function fetchTripData(userId: string, targetTripId: string) {
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", targetTripId)
      .eq("user_id", userId)
      .single();

    if (tripError || !tripData) {
      alert("没有找到这趟旅行，或者你没有访问权限。");
      router.push("/trips");
      return;
    }

    setTrip(tripData);

    const { data: itineraryData, error: itineraryError } = await supabase
      .from("itinerary_items")
      .select("*")
      .eq("trip_id", targetTripId)
      .order("day_number", { ascending: true })
      .order("time", { ascending: true })
      .order("created_at", { ascending: true });

    if (itineraryError) {
      console.error(itineraryError);
    }

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .select("*")
      .eq("trip_id", targetTripId)
      .order("created_at", { ascending: false });

    if (expenseError) {
      console.error(expenseError);
    }

    setItems(itineraryData || []);
    setExpenses(expenseData || []);
  }

  async function refreshData() {
    if (!currentUserId || !tripId) return;
    await fetchTripData(currentUserId, tripId);
  }

  async function uploadItineraryImage(file: File) {
    if (!currentUserId || !tripId) {
      throw new Error("请先登录");
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "-");
    const filePath = `${currentUserId}/${tripId}/${Date.now()}-${safeFileName}`;

    const { error } = await supabase.storage
      .from("trip-images")
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    const { data } = supabase.storage
      .from("trip-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  function openEditTripModal() {
    if (!trip) return;

    setTripForm({
      title: trip.title || "",
      country: trip.country || "",
      city: trip.city || "",
      budget: trip.budget ? String(trip.budget) : "",
      startDate: trip.start_date || "",
      endDate: trip.end_date || "",
    });

    setShowEditTripModal(true);
  }

  async function updateTrip() {
    if (!trip || !currentUserId) return;

    if (!tripForm.title.trim()) {
      alert("请填写旅行名称");
      return;
    }

    const { error } = await supabase
      .from("trips")
      .update({
        title: tripForm.title.trim(),
        country: tripForm.country.trim() || null,
        city: tripForm.city.trim() || null,
        budget: tripForm.budget ? Number(tripForm.budget) : null,
        start_date: tripForm.startDate || null,
        end_date: tripForm.endDate || null,
      })
      .eq("id", trip.id)
      .eq("user_id", currentUserId);

    if (error) {
      alert(error.message);
      return;
    }

    setShowEditTripModal(false);
    await refreshData();
  }

  function handleNewItemImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setItemForm({ ...itemForm, imageFile: file });
  }

  function handleEditItemImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    if (!editingItemForm) return;

    setEditingItemForm({
      ...editingItemForm,
      imageFile: file,
    });
  }

  async function addItineraryItem() {
    if (!tripId) return;

    if (!itemForm.title.trim()) {
      alert("请填写行程标题");
      return;
    }

    try {
      setUploadingImage(true);

      let imageUrl: string | null = null;

      if (itemForm.imageFile) {
        imageUrl = await uploadItineraryImage(itemForm.imageFile);
      }

      const { error } = await supabase.from("itinerary_items").insert([
        {
          trip_id: tripId,
          day_number: Number(itemForm.dayNumber || 1),
          time: itemForm.time || null,
          title: itemForm.title.trim(),
          category: itemForm.category || "其他",
          notes: itemForm.notes.trim() || null,
          image_url: imageUrl,
        },
      ]);

      if (error) {
        alert(error.message);
        return;
      }

      setItemForm(getDefaultItineraryForm());
      setItineraryFilter("全部");
      await refreshData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploadingImage(false);
    }
  }

  function startEditItem(item: ItineraryItem) {
    setEditingItemForm({
      id: item.id,
      dayNumber: String(item.day_number || 1),
      time: item.time || "",
      title: item.title || "",
      category: item.category || "其他",
      notes: item.notes || "",
      imageFile: null,
      imageUrl: item.image_url || null,
    });
  }

  async function updateItineraryItem() {
    if (!editingItemForm) return;

    if (!editingItemForm.title.trim()) {
      alert("请填写行程标题");
      return;
    }

    try {
      setUploadingImage(true);

      let imageUrl = editingItemForm.imageUrl;

      if (editingItemForm.imageFile) {
        imageUrl = await uploadItineraryImage(editingItemForm.imageFile);
      }

      const { error } = await supabase
        .from("itinerary_items")
        .update({
          day_number: Number(editingItemForm.dayNumber || 1),
          time: editingItemForm.time || null,
          title: editingItemForm.title.trim(),
          category: editingItemForm.category || "其他",
          notes: editingItemForm.notes.trim() || null,
          image_url: imageUrl,
        })
        .eq("id", editingItemForm.id);

      if (error) {
        alert(error.message);
        return;
      }

      setEditingItemForm(null);
      await refreshData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploadingImage(false);
    }
  }

  async function deleteItineraryItem(itemId: string) {
    const confirmDelete = window.confirm("确定要删除这个行程吗？");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("itinerary_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      alert(error.message);
      return;
    }

    await refreshData();
  }

  async function addExpense() {
    if (!tripId) return;

    if (!expenseForm.amount) {
      alert("请填写金额");
      return;
    }

    const { error } = await supabase.from("expenses").insert([
      {
        trip_id: tripId,
        category: expenseForm.category || "其他",
        amount: Number(expenseForm.amount),
        description: expenseForm.description.trim() || null,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setExpenseForm(getDefaultExpenseForm());
    await refreshData();
  }

  function startEditExpense(expense: Expense) {
    setEditingExpenseForm({
      id: expense.id,
      category: expense.category || "其他",
      amount: String(expense.amount || ""),
      description: expense.description || "",
    });
  }

  async function updateExpense() {
    if (!editingExpenseForm) return;

    if (!editingExpenseForm.amount) {
      alert("请填写金额");
      return;
    }

    const { error } = await supabase
      .from("expenses")
      .update({
        category: editingExpenseForm.category || "其他",
        amount: Number(editingExpenseForm.amount),
        description: editingExpenseForm.description.trim() || null,
      })
      .eq("id", editingExpenseForm.id);

    if (error) {
      alert(error.message);
      return;
    }

    setEditingExpenseForm(null);
    await refreshData();
  }

  async function deleteExpense(expenseId: string) {
    const confirmDelete = window.confirm("确定要删除这笔费用吗？");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (error) {
      alert(error.message);
      return;
    }

    await refreshData();
  }

  const totalSpent = expenses.reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);

  const budget = Number(trip?.budget || 0);
  const remainingBudget = budget - totalSpent;
  const spentPercent =
    budget > 0 ? Math.min(Math.round((totalSpent / budget) * 100), 100) : 0;

  const coverImageUrl = items.find((item) => item.image_url)?.image_url || null;
  const photoWallItems = items.filter((item) => item.image_url);

  const filteredItems =
    itineraryFilter === "全部"
      ? items
      : items.filter((item) => (item.category || "其他") === itineraryFilter);

  const groupedItems = filteredItems.reduce<Record<number, ItineraryItem[]>>(
    (groups, item) => {
      const day = item.day_number || 1;

      if (!groups[day]) {
        groups[day] = [];
      }

      groups[day].push(item);
      return groups;
    },
    {}
  );

  const groupedItemEntries = Object.entries(groupedItems).sort(
    ([dayA], [dayB]) => Number(dayA) - Number(dayB)
  );

  const filteredExpenses =
    expenseFilter === "全部"
      ? expenses
      : expenses.filter(
          (expense) => (expense.category || "其他") === expenseFilter
        );

  const expenseCategorySummary = expenseFilterOptions
    .filter((category) => category !== "全部")
    .map((category) => {
      const amount = expenses
        .filter((expense) => (expense.category || "其他") === category)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      const percent =
        totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;

      return {
        category,
        amount,
        percent,
      };
    })
    .filter((item) => item.amount > 0);

  const tripStatus = trip ? getTripStatus(trip) : "待完善";

  if (loading) {
    return (
      <main className="p-4 text-white sm:p-8">
        <p className="text-zinc-400">正在加载旅行详情...</p>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="p-4 text-white sm:p-8">
        <p className="text-zinc-400">没有找到这趟旅行。</p>
      </main>
    );
  }

  return (
    <main className="p-4 text-white sm:p-8">
      <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
        <div className="relative min-h-[420px]">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={`${trip.title} 的旅行封面`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.28),_transparent_35%),radial-gradient(circle_at_70%_30%,_rgba(59,130,246,0.2),_transparent_30%),linear-gradient(135deg,_#18181b,_#09090b)]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />

          <div className="relative flex min-h-[420px] flex-col justify-between p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/trips"
                className="rounded-xl bg-black/45 px-4 py-2 text-sm text-zinc-300 backdrop-blur hover:bg-black/70"
              >
                ← 返回我的旅行
              </Link>

              <button
                onClick={openEditTripModal}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400"
              >
                编辑旅行
              </button>
            </div>

            <div>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                  tripStatus
                )}`}
              >
                {tripStatus}
              </span>

              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
                {trip.title}
              </h1>

              <p className="mt-4 text-lg text-zinc-300">
                {trip.country || "未填写国家"} · {trip.city || "未填写城市"}
              </p>

              <p className="mt-2 text-sm text-zinc-400">
                {formatDateRange(trip)}
              </p>

              {!coverImageUrl && (
                <div className="mt-6 max-w-md rounded-2xl border border-cyan-500/20 bg-black/35 p-4 backdrop-blur">
                  <p className="text-sm font-semibold text-cyan-300">
                    还没有旅行封面
                  </p>
                  <p className="mt-2 text-sm text-zinc-400">
                    为任意每日行程上传图片后，这里会自动变成这趟旅行的大封面。
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
                <p className="text-xs text-zinc-400">旅行预算</p>
                <p className="mt-2 text-2xl font-bold">
                  {budget > 0 ? formatMoney(budget) : "未填写"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
                <p className="text-xs text-zinc-400">已记录花费</p>
                <p className="mt-2 text-2xl font-bold text-cyan-300">
                  {formatMoney(totalSpent)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
                <p className="text-xs text-zinc-400">每日行程</p>
                <p className="mt-2 text-2xl font-bold">{items.length}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
                <p className="text-xs text-zinc-400">旅行照片</p>
                <p className="mt-2 text-2xl font-bold text-cyan-300">
                  {photoWallItems.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">新增每日行程</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                type="number"
                min="1"
                placeholder="第几天"
                value={itemForm.dayNumber}
                onChange={(e) =>
                  setItemForm({ ...itemForm, dayNumber: e.target.value })
                }
                className="rounded-xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500"
              />

              <input
                placeholder="时间，例如：09:30"
                value={itemForm.time}
                onChange={(e) =>
                  setItemForm({ ...itemForm, time: e.target.value })
                }
                className="rounded-xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500"
              />

              <input
                placeholder="行程标题，例如：浅草寺"
                value={itemForm.title}
                onChange={(e) =>
                  setItemForm({ ...itemForm, title: e.target.value })
                }
                className="rounded-xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500 md:col-span-2"
              />

              <select
                value={itemForm.category}
                onChange={(e) =>
                  setItemForm({ ...itemForm, category: e.target.value })
                }
                className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              >
                {itineraryCategoryOptions.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>

              <label className="rounded-xl bg-zinc-800 px-4 py-3 text-sm text-zinc-400">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewItemImageChange}
                  className="hidden"
                />
                {itemForm.imageFile
                  ? itemForm.imageFile.name
                  : "上传行程图片"}
              </label>

              <textarea
                placeholder="备注，例如：建议提前预约门票"
                value={itemForm.notes}
                onChange={(e) =>
                  setItemForm({ ...itemForm, notes: e.target.value })
                }
                className="min-h-24 rounded-xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500 md:col-span-2"
              />
            </div>

            <button
              onClick={addItineraryItem}
              disabled={uploadingImage}
              className="mt-5 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadingImage ? "正在保存..." : "添加行程"}
            </button>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">每日行程</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  按天自动分组展示你的旅行计划，也可以按类型快速筛选。
                </p>
              </div>

              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                {filteredItems.length} / {items.length} 个行程
              </span>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {itineraryFilterOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setItineraryFilter(option)}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                    itineraryFilter === option
                      ? "bg-cyan-500 text-black"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-8 text-center text-sm text-zinc-500">
                还没有添加行程。
              </div>
            ) : groupedItemEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-8 text-center text-sm text-zinc-500">
                当前分类暂无行程。
              </div>
            ) : (
              <div className="space-y-6">
                {groupedItemEntries.map(([day, dayItems]) => (
                  <div key={day}>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-cyan-300">
                        第 {day} 天
                      </h3>

                      <span className="text-xs text-zinc-500">
                        {dayItems.length} 个行程
                      </span>
                    </div>

                    <div className="space-y-3">
                      {dayItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                        >
                          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                            <div>
                              {item.image_url ? (
                                <button
                                  onClick={() =>
                                    setPreviewImage({
                                      url: item.image_url as string,
                                      title: item.title,
                                    })
                                  }
                                  className="aspect-square w-full overflow-hidden rounded-2xl bg-zinc-900"
                                >
                                  <img
                                    src={item.image_url}
                                    alt={item.title}
                                    className="h-full w-full object-cover transition hover:scale-105"
                                  />
                                </button>
                              ) : (
                                <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-zinc-900 text-xs text-zinc-600">
                                  暂无图片
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm text-zinc-500">
                                    {item.time || "未填写时间"} ·{" "}
                                    {item.category || "其他"}
                                  </p>

                                  <h4 className="mt-1 text-lg font-bold">
                                    {item.title}
                                  </h4>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => startEditItem(item)}
                                    className="rounded-xl bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                                  >
                                    编辑
                                  </button>

                                  <button
                                    onClick={() => deleteItineraryItem(item.id)}
                                    className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
                                  >
                                    删除
                                  </button>
                                </div>
                              </div>

                              {item.notes && (
                                <p className="mt-3 text-sm leading-6 text-zinc-400">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">预算概览</h2>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">总预算</p>
                <p className="mt-2 text-3xl font-bold">
                  {budget > 0 ? formatMoney(budget) : "未填写"}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">已花费</p>
                <p className="mt-2 text-3xl font-bold text-cyan-300">
                  {formatMoney(totalSpent)}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">剩余预算</p>
                <p
                  className={`mt-2 text-3xl font-bold ${
                    remainingBudget >= 0 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {formatMoney(remainingBudget)}
                </p>
              </div>

              {budget > 0 && (
                <div>
                  <div className="mb-2 flex justify-between text-sm text-zinc-400">
                    <span>预算使用率</span>
                    <span>{spentPercent}%</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{ width: `${spentPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">费用分类汇总</h2>

            {expenseCategorySummary.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">还没有费用记录。</p>
            ) : (
              <div className="mt-5 space-y-4">
                {expenseCategorySummary.map((item) => (
                  <div key={item.category}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>{item.category}</span>
                      <span className="text-zinc-400">
                        {formatMoney(item.amount)} · {item.percent}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">新增费用</h2>

            <div className="mt-5 space-y-4">
              <select
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    category: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              >
                {expenseFilterOptions
                  .filter((option) => option !== "全部")
                  .map((option) => (
                    <option key={option}>{option}</option>
                  ))}
              </select>

              <input
                type="number"
                placeholder="金额"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    amount: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500"
              />

              <input
                placeholder="说明，例如：晚餐"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    description: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none placeholder:text-zinc-500"
              />

              <button
                onClick={addExpense}
                className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black hover:bg-cyan-400"
              >
                添加费用
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">费用记录</h2>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                {filteredExpenses.length} 条
              </span>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {expenseFilterOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setExpenseFilter(option)}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                    expenseFilter === option
                      ? "bg-cyan-500 text-black"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-8 text-center text-sm text-zinc-500">
                当前分类暂无费用记录。
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="rounded-2xl bg-zinc-950/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-zinc-500">
                          {expense.category || "其他"}
                        </p>
                        <p className="mt-1 font-semibold">
                          {expense.description || "未填写说明"}
                        </p>
                      </div>

                      <p className="text-lg font-bold text-cyan-300">
                        {formatMoney(expense.amount)}
                      </p>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => startEditExpense(expense)}
                        className="rounded-xl bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                      >
                        编辑
                      </button>

                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {showEditTripModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-6 text-2xl font-bold">编辑旅行</h2>

            <div className="space-y-4">
              <input
                placeholder="旅行名称"
                value={tripForm.title}
                onChange={(e) =>
                  setTripForm({ ...tripForm, title: e.target.value })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  placeholder="国家"
                  value={tripForm.country}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, country: e.target.value })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />

                <input
                  placeholder="城市"
                  value={tripForm.city}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, city: e.target.value })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />
              </div>

              <input
                type="number"
                placeholder="预算"
                value={tripForm.budget}
                onChange={(e) =>
                  setTripForm({ ...tripForm, budget: e.target.value })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="date"
                  value={tripForm.startDate}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, startDate: e.target.value })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />

                <input
                  type="date"
                  value={tripForm.endDate}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, endDate: e.target.value })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditTripModal(false)}
                className="rounded-xl bg-zinc-800 px-5 py-3"
              >
                取消
              </button>

              <button
                onClick={updateTrip}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {editingItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-6 text-2xl font-bold">编辑行程</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="number"
                min="1"
                value={editingItemForm.dayNumber}
                onChange={(e) =>
                  setEditingItemForm({
                    ...editingItemForm,
                    dayNumber: e.target.value,
                  })
                }
                className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <input
                value={editingItemForm.time}
                onChange={(e) =>
                  setEditingItemForm({
                    ...editingItemForm,
                    time: e.target.value,
                  })
                }
                className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <input
                value={editingItemForm.title}
                onChange={(e) =>
                  setEditingItemForm({
                    ...editingItemForm,
                    title: e.target.value,
                  })
                }
                className="rounded-xl bg-zinc-800 px-4 py-3 outline-none md:col-span-2"
              />

              <select
                value={editingItemForm.category}
                onChange={(e) =>
                  setEditingItemForm({
                    ...editingItemForm,
                    category: e.target.value,
                  })
                }
                className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              >
                {itineraryCategoryOptions.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>

              <label className="rounded-xl bg-zinc-800 px-4 py-3 text-sm text-zinc-400">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditItemImageChange}
                  className="hidden"
                />
                {editingItemForm.imageFile
                  ? editingItemForm.imageFile.name
                  : "更换行程图片"}
              </label>

              {editingItemForm.imageUrl && (
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm text-zinc-400">当前图片</p>

                  <div className="flex gap-4">
                    <img
                      src={editingItemForm.imageUrl}
                      alt={editingItemForm.title}
                      className="h-28 w-28 rounded-2xl object-cover"
                    />

                    <button
                      onClick={() =>
                        setEditingItemForm({
                          ...editingItemForm,
                          imageUrl: null,
                          imageFile: null,
                        })
                      }
                      className="h-fit rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 hover:bg-red-500/20"
                    >
                      移除图片
                    </button>
                  </div>
                </div>
              )}

              <textarea
                value={editingItemForm.notes}
                onChange={(e) =>
                  setEditingItemForm({
                    ...editingItemForm,
                    notes: e.target.value,
                  })
                }
                className="min-h-24 rounded-xl bg-zinc-800 px-4 py-3 outline-none md:col-span-2"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingItemForm(null)}
                className="rounded-xl bg-zinc-800 px-5 py-3"
              >
                取消
              </button>

              <button
                onClick={updateItineraryItem}
                disabled={uploadingImage}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black disabled:opacity-60"
              >
                {uploadingImage ? "正在保存..." : "保存行程"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-6 text-2xl font-bold">编辑费用</h2>

            <div className="space-y-4">
              <select
                value={editingExpenseForm.category}
                onChange={(e) =>
                  setEditingExpenseForm({
                    ...editingExpenseForm,
                    category: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              >
                {expenseFilterOptions
                  .filter((option) => option !== "全部")
                  .map((option) => (
                    <option key={option}>{option}</option>
                  ))}
              </select>

              <input
                type="number"
                value={editingExpenseForm.amount}
                onChange={(e) =>
                  setEditingExpenseForm({
                    ...editingExpenseForm,
                    amount: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <input
                value={editingExpenseForm.description}
                onChange={(e) =>
                  setEditingExpenseForm({
                    ...editingExpenseForm,
                    description: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingExpenseForm(null)}
                className="rounded-xl bg-zinc-800 px-5 py-3"
              >
                取消
              </button>

              <button
                onClick={updateExpense}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black"
              >
                保存费用
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <div className="max-w-5xl">
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[82vh] rounded-2xl object-contain"
            />

            <p className="mt-4 text-center text-sm text-zinc-400">
              {previewImage.title}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}