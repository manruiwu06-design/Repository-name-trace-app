"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      router.push("/overview");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      alert("请填写邮箱和密码");
      return;
    }

    if (password.length < 6) {
      alert("密码至少需要 6 位");
      return;
    }

    setLoading(true);

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      setLoading(false);

      if (error) {
        alert(error.message);
        return;
      }

      alert("注册成功，请登录");
      setMode("login");
      return;
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setLoading(false);

      if (error) {
        alert(error.message);
        return;
      }

      router.push("/overview");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-wider">TRACE</h1>

          <p className="mt-2 text-sm text-zinc-400">
            从旅行计划，到人生足迹
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-zinc-900 p-1">
          <button
            onClick={() => setMode("login")}
            className={
              mode === "login"
                ? "rounded-lg bg-cyan-500 py-2 text-black font-semibold"
                : "rounded-lg py-2 text-zinc-400"
            }
          >
            登录
          </button>

          <button
            onClick={() => setMode("register")}
            className={
              mode === "register"
                ? "rounded-lg bg-cyan-500 py-2 text-black font-semibold"
                : "rounded-lg py-2 text-zinc-400"
            }
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-300">邮箱</label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300">密码</label>

            <input
              type="password"
              placeholder="至少 6 位密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-500 text-black py-3 font-semibold disabled:opacity-50"
          >
            {loading
              ? "处理中..."
              : mode === "login"
              ? "登录"
              : "注册"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Build Your Journey. Preserve Your Story.
        </p>
      </div>
    </main>
  );
}