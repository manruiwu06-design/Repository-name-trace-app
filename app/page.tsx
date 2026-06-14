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

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_35%)]" />

      <div className="relative min-h-screen grid lg:grid-cols-2">
        <section className="hidden lg:flex flex-col justify-between p-12 border-r border-white/10">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              Trace V1 已上线
            </div>

            <h1 className="mt-10 text-7xl font-bold tracking-tight">
              TRACE
            </h1>

            <p className="mt-6 max-w-xl text-2xl leading-relaxed text-zinc-300">
              从旅行计划，到人生足迹。
              <br />
              用一个地方保存你的行程、预算、费用和回忆。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-zinc-400">旅行规划</p>
              <h3 className="mt-2 text-xl font-semibold">每日行程管理</h3>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-zinc-400">预算记录</p>
              <h3 className="mt-2 text-xl font-semibold">费用自动统计</h3>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-zinc-400">足迹地图</p>
              <h3 className="mt-2 text-xl font-semibold">国家城市档案</h3>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-zinc-400">人生档案</p>
              <h3 className="mt-2 text-xl font-semibold">旅行数据中心</h3>
            </div>
          </div>

          <p className="text-sm text-zinc-500">
            Build Your Journey. Preserve Your Story.
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden text-center">
              <h1 className="text-5xl font-bold tracking-wider">TRACE</h1>
              <p className="mt-3 text-zinc-400">
                从旅行计划，到人生足迹
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
              <div className="mb-8">
                <p className="text-sm text-cyan-400">
                  Welcome to Trace
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {mode === "login" ? "登录你的旅行档案" : "创建 Trace 账号"}
                </h2>

                <p className="mt-3 text-sm text-zinc-400">
                  {mode === "login"
                    ? "继续管理你的旅行、预算和足迹。"
                    : "开始记录你的第一段旅程。"}
                </p>
              </div>

              <div className="mb-6 grid grid-cols-2 rounded-2xl bg-zinc-900 p-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={
                    mode === "login"
                      ? "rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-black"
                      : "rounded-xl py-3 text-sm text-zinc-400 hover:text-white"
                  }
                >
                  登录
                </button>

                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={
                    mode === "register"
                      ? "rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-black"
                      : "rounded-xl py-3 text-sm text-zinc-400 hover:text-white"
                  }
                >
                  注册
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm text-zinc-300">邮箱</label>

                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none transition focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-300">密码</label>

                  <input
                    type="password"
                    placeholder="至少 6 位密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none transition focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-cyan-500 py-4 font-bold text-black transition hover:bg-cyan-400 disabled:opacity-50"
                >
                  {loading
                    ? "处理中..."
                    : mode === "login"
                    ? "进入 Trace"
                    : "创建账号"}
                </button>
              </form>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-zinc-400">
                  Trace 会把你的每一次旅行变成可回看的档案：
                  行程、费用、城市、国家和人生足迹。
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-zinc-600">
              Trace © 2026 · 旅行人生档案馆
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
