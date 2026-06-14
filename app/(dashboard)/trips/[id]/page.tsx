"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  day_number: number;
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

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const expenseFilterOptions = [
    "全部",
    "餐饮",
    "住宿",
    "交通",
    "门票",
    "购物",
    "其他",
  ];

  const [userId, setUserId] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);

  const [editForm, setEditForm] = useState({
    title: "",
    country: "",
    city: "",
    budget: "",
    startDate: "",
    endDate: "",
  });

  const [form, setForm] = useState({
    dayNumber: "1",
    time: "",
    title: "",
    category: "景点",
    notes: "",
  });

  const [selectedItineraryImage, setSelectedItineraryImage] =
    useState<File | null>(null);
  const [addImageInputKey, setAddImageInputKey] = useState(0);

  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItineraryImageFile, setEditItineraryImageFile] =
    useState<File | null>(null);
  const [editImageInputKey, setEditImageInputKey] = useState(0);

  const [editItemForm, setEditItemForm] = useState({
    dayNumber: "1",
    time: "",
    title: "",
    category: "景点",
    notes: "",
    imageUrl: "",
  });

  const [expenseFilter, setExpenseFilter] = useState("全部");

  const [expenseForm, setExpenseForm] = useState({
    category: "餐饮",
    amount: "",
    description: "",
  });

  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const [editExpenseForm, setEditExpenseForm] = useState({
    category: "餐饮",
    amount: "",
    description: "",
  });

  useEffect(() => {
    if (id) {
      initPage();
    }
  }, [id]);

  async function initPage() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/");
      return;
    }

    setUserId(data.user.id);
    await fetchTrip(data.user.id);
  }

  async function fetchTrip(currentUserId: string) {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("id", id)
      .eq("user_id", currentUserId)
      .single();

    if (error) {
      console.error(error);
      setTrip(null);
      setLoading(false);
      return;
    }

    setTrip(data);
    setLoading(false);

    fetchItineraryItems();
    fetchExpenses();
  }

  async function fetchItineraryItems() {
    const { data, error } = await supabase
      .from("itinerary_items")
      .select("*")
      .eq("trip_id", id)
      .order("day_number", { ascending: true })
      .order("time", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setItems(data || []);
  }

  async function fetchExpenses() {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("trip_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setExpenses(data || []);
  }

  async function uploadItineraryImage(file: File) {
    if (!userId) {
      alert("请先登录");
      return null;
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filePath = `${userId}/${id}/${Date.now()}-${safeFileName}`;

    const { error } = await supabase.storage
      .from("trip-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      alert(error.message);
      return null;
    }

    const { data } = supabase.storage
      .from("trip-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  function openEditModal() {
    if (!trip) return;

    setEditForm({
      title: trip.title || "",
      country: trip.country || "",
      city: trip.city || "",
      budget: trip.budget ? String(trip.budget) : "",
      startDate: trip.start_date || "",
      endDate: trip.end_date || "",
    });

    setShowEditModal(true);
  }

  async function updateTrip() {
    if (!trip) return;

    if (!userId) {
      alert("请先登录");
      router.push("/");
      return;
    }

    if (!editForm.title) {
      alert("请填写旅行名称");
      return;
    }

    const { error } = await supabase
      .from("trips")
      .update({
        title: editForm.title,
        country: editForm.country || null,
        city: editForm.city || null,
        budget: editForm.budget ? Number(editForm.budget) : null,
        start_date: editForm.startDate || null,
        end_date: editForm.endDate || null,
      })
      .eq("id", trip.id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    setShowEditModal(false);
    fetchTrip(userId);
  }

  async function addItineraryItem() {
    if (!trip) {
      alert("未找到旅行");
      return;
    }

    if (!form.title) {
      alert("请填写行程名称");
      return;
    }

    let imageUrl: string | null = null;

    if (selectedItineraryImage) {
      imageUrl = await uploadItineraryImage(selectedItineraryImage);

      if (!imageUrl) {
        return;
      }
    }

    const { error } = await supabase.from("itinerary_items").insert([
      {
        trip_id: id,
        day_number: Number(form.dayNumber),
        time: form.time || null,
        title: form.title,
        category: form.category || "景点",
        notes: form.notes || null,
        image_url: imageUrl,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setForm({
      dayNumber: "1",
      time: "",
      title: "",
      category: "景点",
      notes: "",
    });

    setSelectedItineraryImage(null);
    setAddImageInputKey((prev) => prev + 1);

    fetchItineraryItems();
  }

  function openEditItineraryModal(item: ItineraryItem) {
    setEditingItemId(item.id);

    setEditItemForm({
      dayNumber: String(item.day_number),
      time: item.time || "",
      title: item.title || "",
      category: item.category || "景点",
      notes: item.notes || "",
      imageUrl: item.image_url || "",
    });

    setEditItineraryImageFile(null);
    setEditImageInputKey((prev) => prev + 1);
    setShowEditItemModal(true);
  }

  async function updateItineraryItem() {
    if (!editingItemId) {
      alert("未找到要编辑的行程");
      return;
    }

    if (!editItemForm.title) {
      alert("请填写行程名称");
      return;
    }

    let finalImageUrl = editItemForm.imageUrl || null;

    if (editItineraryImageFile) {
      const uploadedImageUrl = await uploadItineraryImage(
        editItineraryImageFile
      );

      if (!uploadedImageUrl) {
        return;
      }

      finalImageUrl = uploadedImageUrl;
    }

    const { error } = await supabase
      .from("itinerary_items")
      .update({
        day_number: Number(editItemForm.dayNumber),
        time: editItemForm.time || null,
        title: editItemForm.title,
        category: editItemForm.category || "景点",
        notes: editItemForm.notes || null,
        image_url: finalImageUrl,
      })
      .eq("id", editingItemId)
      .eq("trip_id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setShowEditItemModal(false);
    setEditingItemId(null);
    setEditItineraryImageFile(null);
    setEditImageInputKey((prev) => prev + 1);

    setEditItemForm({
      dayNumber: "1",
      time: "",
      title: "",
      category: "景点",
      notes: "",
      imageUrl: "",
    });

    fetchItineraryItems();
  }

  async function deleteItineraryItem(itemId: string) {
    const confirmDelete = window.confirm("确定要删除这个行程吗？");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("itinerary_items")
      .delete()
      .eq("id", itemId)
      .eq("trip_id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchItineraryItems();
  }

  async function addExpense() {
    if (!trip) {
      alert("未找到旅行");
      return;
    }

    if (!expenseForm.amount) {
      alert("请填写金额");
      return;
    }

    const { error } = await supabase.from("expenses").insert([
      {
        trip_id: id,
        category: expenseForm.category || "其他",
        amount: Number(expenseForm.amount),
        description: expenseForm.description || null,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setExpenseForm({
      category: "餐饮",
      amount: "",
      description: "",
    });

    fetchExpenses();
  }

  function openEditExpenseModal(expense: Expense) {
    setEditingExpenseId(expense.id);

    setEditExpenseForm({
      category: expense.category || "餐饮",
      amount: String(expense.amount || ""),
      description: expense.description || "",
    });

    setShowEditExpenseModal(true);
  }

  async function updateExpense() {
    if (!editingExpenseId) {
      alert("未找到要编辑的费用");
      return;
    }

    if (!editExpenseForm.amount) {
      alert("请填写金额");
      return;
    }

    const { error } = await supabase
      .from("expenses")
      .update({
        category: editExpenseForm.category || "其他",
        amount: Number(editExpenseForm.amount),
        description: editExpenseForm.description || null,
      })
      .eq("id", editingExpenseId)
      .eq("trip_id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setShowEditExpenseModal(false);
    setEditingExpenseId(null);

    setEditExpenseForm({
      category: "餐饮",
      amount: "",
      description: "",
    });

    fetchExpenses();
  }

  async function deleteExpense(expenseId: string) {
    const confirmDelete = window.confirm("确定要删除这条费用吗？");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId)
      .eq("trip_id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchExpenses();
  }

  const totalSpent = expenses.reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);

  const totalBudget = Number(trip?.budget || 0);
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

  const expenseCategoryEntries = Object.entries(expenseByCategory).sort(
    (a, b) => b[1] - a[1]
  );

  const filteredExpenses =
    expenseFilter === "全部"
      ? expenses
      : expenses.filter((expense) => {
          const category = expense.category || "其他";
          return category === expenseFilter;
        });

  const groupedItems = items.reduce<Record<number, ItineraryItem[]>>(
    (groups, item) => {
      const dayNumber = item.day_number || 1;

      if (!groups[dayNumber]) {
        groups[dayNumber] = [];
      }

      groups[dayNumber].push(item);

      return groups;
    },
    {}
  );

  const groupedItemEntries = Object.entries(groupedItems).sort(
    ([dayA], [dayB]) => Number(dayA) - Number(dayB)
  );

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
        <h1 className="text-3xl font-bold">未找到旅行</h1>

        <p className="text-zinc-400 mt-3">
          这趟旅行不存在，或者不属于当前登录用户。
        </p>

        <Link href="/trips" className="mt-6 inline-block text-cyan-400">
          返回我的旅行
        </Link>
      </main>
    );
  }

  return (
    <main className="p-4 text-white sm:p-8">
      <div className="mb-8">
        <Link href="/trips" className="text-sm text-cyan-400">
          ← 返回我的旅行
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">{trip.title}</h1>

            <p className="text-zinc-400 mt-2">
              {trip.country || "未填写国家"} · {trip.city || "未填写城市"}
            </p>
          </div>

          <button
            onClick={openEditModal}
            className="w-fit rounded-xl bg-zinc-800 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            编辑旅行
          </button>
        </div>
      </div>

      <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-zinc-400">国家</p>
          <h2 className="text-2xl font-bold mt-2">
            {trip.country || "未填写"}
          </h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-zinc-400">城市</p>
          <h2 className="text-2xl font-bold mt-2">{trip.city || "未填写"}</h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-zinc-400">预算</p>
          <h2 className="text-2xl font-bold mt-2">
            {trip.budget ? `¥${trip.budget}` : "未填写"}
          </h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
          <p className="text-zinc-400">时间</p>
          <h2 className="text-lg font-bold mt-2">
            {trip.start_date || "未填写"} - {trip.end_date || "未填写"}
          </h2>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">每日行程</h2>

          <div className="grid gap-3 mb-6 md:grid-cols-5">
            <input
              placeholder="第几天"
              value={form.dayNumber}
              onChange={(e) =>
                setForm({ ...form, dayNumber: e.target.value })
              }
              className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
            />

            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
            />

            <input
              placeholder="行程名称"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-xl bg-zinc-800 px-4 py-3 outline-none md:col-span-2"
            />

            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
              className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
            >
              <option>景点</option>
              <option>美食</option>
              <option>住宿</option>
              <option>交通</option>
              <option>购物</option>
              <option>其他</option>
            </select>
          </div>

          <textarea
            placeholder="备注，例如：早上去人少、需要提前预约"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mb-4 w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
          />

          <div className="mb-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4">
            <p className="mb-3 text-sm text-zinc-400">
              上传行程图片，可作为旅行记录
            </p>

            <input
              key={addImageInputKey}
              type="file"
              accept="image/*"
              onChange={(e) =>
                setSelectedItineraryImage(e.target.files?.[0] || null)
              }
              className="w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
            />

            {selectedItineraryImage && (
              <p className="mt-3 text-xs text-cyan-400">
                已选择：{selectedItineraryImage.name}
              </p>
            )}
          </div>

          <button
            onClick={addItineraryItem}
            className="mb-6 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black"
          >
            + 添加行程
          </button>

          <div className="space-y-6">
            {items.length === 0 ? (
              <p className="text-zinc-500">还没有添加行程</p>
            ) : (
              groupedItemEntries.map(([dayNumber, dayItems]) => (
                <div key={dayNumber} className="rounded-2xl bg-black/30 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-cyan-400">
                      第 {dayNumber} 天
                    </h3>

                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                      {dayItems.length} 个行程
                    </span>
                  </div>

                  <div className="space-y-3">
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-zinc-800 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-cyan-400">
                              {item.time || "未填写时间"} ·{" "}
                              {item.category || "其他"}
                            </p>

                            <h3 className="text-lg font-semibold mt-1">
                              {item.title}
                            </h3>

                            {item.notes && (
                              <p className="text-zinc-400 mt-2">
                                {item.notes}
                              </p>
                            )}

                            {item.image_url && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    url: item.image_url as string,
                                    title: item.title,
                                  })
                                }
                                className="mt-4 block w-fit text-left"
                              >
                                <img
                                  src={item.image_url}
                                  alt={`${item.title} 的行程图片`}
                                  className="h-28 w-full max-w-[260px] rounded-xl border border-zinc-700 object-cover transition hover:border-cyan-400 sm:h-32 sm:max-w-xs md:h-36"
                                />

                                <p className="mt-2 text-xs text-zinc-500">
                                  点击查看大图
                                </p>
                              </button>
                            )}
                          </div>

                          <div className="flex h-fit shrink-0 gap-2">
                            <button
                              onClick={() => openEditItineraryModal(item)}
                              className="rounded-lg bg-cyan-500/10 px-3 py-2 text-sm text-cyan-400 hover:bg-cyan-500/20"
                            >
                              编辑
                            </button>

                            <button
                              onClick={() => deleteItineraryItem(item.id)}
                              className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">预算统计</h2>

            <div className="space-y-3 text-zinc-300">
              <p>总预算：{trip.budget ? `¥${trip.budget}` : "未填写"}</p>
              <p>已使用：¥{totalSpent}</p>
              <p>
                剩余：
                <span
                  className={
                    remainingBudget < 0 ? "text-red-400" : "text-cyan-400"
                  }
                >
                  ¥{remainingBudget}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">费用分类汇总</h2>

            {expenseCategoryEntries.length === 0 ? (
              <p className="text-zinc-500">还没有费用分类数据</p>
            ) : (
              <div className="space-y-4">
                {expenseCategoryEntries.map(([category, amount]) => {
                  const percent =
                    totalSpent > 0
                      ? Math.round((amount / totalSpent) * 100)
                      : 0;

                  return (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-zinc-300">{category}</span>

                        <span className="text-zinc-400">
                          ¥{amount} · {percent}%
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
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

          <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">添加费用</h2>

            <div className="space-y-3">
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
                <option>餐饮</option>
                <option>住宿</option>
                <option>交通</option>
                <option>门票</option>
                <option>购物</option>
                <option>其他</option>
              </select>

              <input
                placeholder="金额，例如 120"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    amount: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <input
                placeholder="备注，例如：拉面"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    description: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <button
                onClick={addExpense}
                className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black"
              >
                + 添加费用
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">费用记录</h2>

              <span className="text-xs text-zinc-500">
                {filteredExpenses.length} 条
              </span>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
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

            <div className="space-y-3">
              {expenses.length === 0 ? (
                <p className="text-zinc-500">还没有费用记录</p>
              ) : filteredExpenses.length === 0 ? (
                <p className="text-zinc-500">当前分类暂无费用记录</p>
              ) : (
                filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="rounded-xl bg-zinc-800 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                      <div>
                        <p className="text-sm text-cyan-400">
                          {expense.category || "其他"}
                        </p>

                        <h3 className="text-lg font-semibold mt-1">
                          ¥{expense.amount}
                        </h3>

                        {expense.description && (
                          <p className="text-zinc-400 mt-1">
                            {expense.description}
                          </p>
                        )}
                      </div>

                      <div className="flex h-fit gap-2">
                        <button
                          onClick={() => openEditExpenseModal(expense)}
                          className="rounded-lg bg-cyan-500/10 px-3 py-2 text-sm text-cyan-400 hover:bg-cyan-500/20"
                        >
                          编辑
                        </button>

                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
            <h2 className="text-2xl font-bold mb-6">编辑旅行信息</h2>

            <div className="space-y-4">
              <input
                placeholder="旅行名称"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  placeholder="国家"
                  value={editForm.country}
                  onChange={(e) =>
                    setEditForm({ ...editForm, country: e.target.value })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />

                <input
                  placeholder="城市"
                  value={editForm.city}
                  onChange={(e) =>
                    setEditForm({ ...editForm, city: e.target.value })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />
              </div>

              <input
                placeholder="预算"
                value={editForm.budget}
                onChange={(e) =>
                  setEditForm({ ...editForm, budget: e.target.value })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      startDate: e.target.value,
                    })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />

                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      endDate: e.target.value,
                    })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-5 py-3 rounded-xl bg-zinc-800"
              >
                取消
              </button>

              <button
                onClick={updateTrip}
                className="px-5 py-3 rounded-xl bg-cyan-500 text-black font-semibold"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditItemModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
            <h2 className="text-2xl font-bold mb-6">编辑每日行程</h2>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  placeholder="第几天"
                  value={editItemForm.dayNumber}
                  onChange={(e) =>
                    setEditItemForm({
                      ...editItemForm,
                      dayNumber: e.target.value,
                    })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />

                <input
                  type="time"
                  value={editItemForm.time}
                  onChange={(e) =>
                    setEditItemForm({
                      ...editItemForm,
                      time: e.target.value,
                    })
                  }
                  className="rounded-xl bg-zinc-800 px-4 py-3 outline-none"
                />
              </div>

              <input
                placeholder="行程名称"
                value={editItemForm.title}
                onChange={(e) =>
                  setEditItemForm({
                    ...editItemForm,
                    title: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <select
                value={editItemForm.category}
                onChange={(e) =>
                  setEditItemForm({
                    ...editItemForm,
                    category: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              >
                <option>景点</option>
                <option>美食</option>
                <option>住宿</option>
                <option>交通</option>
                <option>购物</option>
                <option>其他</option>
              </select>

              <textarea
                placeholder="备注，例如：早上去人少、需要提前预约"
                value={editItemForm.notes}
                onChange={(e) =>
                  setEditItemForm({
                    ...editItemForm,
                    notes: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              {editItemForm.imageUrl && (
                <div>
                  <p className="mb-2 text-sm text-zinc-400">当前图片</p>

                  <button
                    type="button"
                    onClick={() =>
                      setPreviewImage({
                        url: editItemForm.imageUrl,
                        title: editItemForm.title || "当前行程图片",
                      })
                    }
                    className="block w-fit text-left"
                  >
                    <img
                      src={editItemForm.imageUrl}
                      alt="当前行程图片"
                      className="h-32 w-full max-w-xs rounded-xl border border-zinc-700 object-cover transition hover:border-cyan-400 sm:h-36"
                    />

                    <p className="mt-2 text-xs text-zinc-500">
                      点击查看大图
                    </p>
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4">
                <p className="mb-3 text-sm text-zinc-400">更换行程图片</p>

                <input
                  key={editImageInputKey}
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setEditItineraryImageFile(e.target.files?.[0] || null)
                  }
                  className="w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
                />

                {editItineraryImageFile && (
                  <p className="mt-3 text-xs text-cyan-400">
                    已选择新图片：{editItineraryImageFile.name}
                  </p>
                )}

                {(editItemForm.imageUrl || editItineraryImageFile) && (
                  <button
                    onClick={() => {
                      setEditItemForm({
                        ...editItemForm,
                        imageUrl: "",
                      });
                      setEditItineraryImageFile(null);
                      setEditImageInputKey((prev) => prev + 1);
                    }}
                    className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
                  >
                    移除图片
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditItemModal(false);
                  setEditingItemId(null);
                  setEditItineraryImageFile(null);
                  setEditImageInputKey((prev) => prev + 1);
                }}
                className="px-5 py-3 rounded-xl bg-zinc-800"
              >
                取消
              </button>

              <button
                onClick={updateItineraryItem}
                className="px-5 py-3 rounded-xl bg-cyan-500 text-black font-semibold"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditExpenseModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
            <h2 className="text-2xl font-bold mb-6">编辑费用记录</h2>

            <div className="space-y-4">
              <select
                value={editExpenseForm.category}
                onChange={(e) =>
                  setEditExpenseForm({
                    ...editExpenseForm,
                    category: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              >
                <option>餐饮</option>
                <option>住宿</option>
                <option>交通</option>
                <option>门票</option>
                <option>购物</option>
                <option>其他</option>
              </select>

              <input
                placeholder="金额，例如 120"
                value={editExpenseForm.amount}
                onChange={(e) =>
                  setEditExpenseForm({
                    ...editExpenseForm,
                    amount: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <input
                placeholder="备注，例如：拉面"
                value={editExpenseForm.description}
                onChange={(e) =>
                  setEditExpenseForm({
                    ...editExpenseForm,
                    description: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditExpenseModal(false);
                  setEditingExpenseId(null);
                }}
                className="px-5 py-3 rounded-xl bg-zinc-800"
              >
                取消
              </button>

              <button
                onClick={updateExpense}
                className="px-5 py-3 rounded-xl bg-cyan-500 text-black font-semibold"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">图片预览</p>
                <h3 className="text-lg font-semibold text-white">
                  {previewImage.title}
                </h3>
              </div>

              <button
                onClick={() => setPreviewImage(null)}
                className="rounded-full bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
              >
                关闭
              </button>
            </div>

            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[78vh] w-full rounded-2xl border border-zinc-700 object-contain"
            />

            <p className="mt-3 text-center text-xs text-zinc-500">
              点击黑色背景也可以关闭
            </p>
          </div>
        </div>
      )}
    </main>
  );
}