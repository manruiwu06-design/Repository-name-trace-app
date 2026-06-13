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
  budget: number | null;
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

  const [userId, setUserId] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    dayNumber: "1",
    time: "",
    title: "",
    category: "景点",
    notes: "",
  });

  const [expenseForm, setExpenseForm] = useState({
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

  async function addItineraryItem() {
    if (!trip) {
      alert("未找到旅行");
      return;
    }

    if (!form.title) {
      alert("请填写行程名称");
      return;
    }

    const { error } = await supabase.from("itinerary_items").insert([
      {
        trip_id: id,
        day_number: Number(form.dayNumber),
        time: form.time || null,
        title: form.title,
        category: form.category || "景点",
        notes: form.notes || null,
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

  if (loading) {
    return (
      <main className="p-8 text-white">
        <p className="text-zinc-400">正在加载旅行详情...</p>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="p-8 text-white">
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
    <main className="p-8 text-white">
      <div className="mb-8">
        <Link href="/trips" className="text-sm text-cyan-400">
          ← 返回我的旅行
        </Link>

        <h1 className="text-4xl font-bold mt-4">{trip.title}</h1>

        <p className="text-zinc-400 mt-2">
          {trip.country || "未填写国家"} · {trip.city || "未填写城市"}
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 mb-8">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">国家</p>
          <h2 className="text-2xl font-bold mt-2">
            {trip.country || "未填写"}
          </h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">城市</p>
          <h2 className="text-2xl font-bold mt-2">
            {trip.city || "未填写"}
          </h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">预算</p>
          <h2 className="text-2xl font-bold mt-2">
            {trip.budget ? `¥${trip.budget}` : "未填写"}
          </h2>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">时间</p>
          <h2 className="text-lg font-bold mt-2">
            {trip.start_date || "未填写"} - {trip.end_date || "未填写"}
          </h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold mb-4">每日行程</h2>

          <div className="grid md:grid-cols-5 gap-3 mb-6">
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
              className="md:col-span-2 rounded-xl bg-zinc-800 px-4 py-3 outline-none"
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

          <button
            onClick={addItineraryItem}
            className="mb-6 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black"
          >
            + 添加行程
          </button>

          <div className="space-y-3">
            {items.length === 0 ? (
              <p className="text-zinc-500">还没有添加行程</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-zinc-800 p-4 flex justify-between gap-4"
                >
                  <div>
                    <p className="text-sm text-cyan-400">
                      第 {item.day_number} 天 · {item.time || "未填写时间"} ·{" "}
                      {item.category || "其他"}
                    </p>

                    <h3 className="text-lg font-semibold mt-1">
                      {item.title}
                    </h3>

                    {item.notes && (
                      <p className="text-zinc-400 mt-2">{item.notes}</p>
                    )}
                  </div>

                  <button
                    onClick={() => deleteItineraryItem(item.id)}
                    className="h-fit rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
                  >
                    删除
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-zinc-900 p-6">
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

          <div className="rounded-2xl bg-zinc-900 p-6">
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

          <div className="rounded-2xl bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold mb-4">费用记录</h2>

            <div className="space-y-3">
              {expenses.length === 0 ? (
                <p className="text-zinc-500">还没有费用记录</p>
              ) : (
                expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="rounded-xl bg-zinc-800 p-4 flex justify-between gap-4"
                  >
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

                    <button
                      onClick={() => deleteExpense(expense.id)}
                      className="h-fit rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
                    >
                      删除
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}