"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "register";

type AuthMessage = {
  type: "success" | "error";
  text: string;
};

const featureCards = [
  {
    title: "旅行规划",
    desc: "创建旅行、安排日期、管理每日行程。",
    icon: "🧭",
  },
  {
    title: "预算费用",
    desc: "记录旅行预算、花费和分类统计。",
    icon: "💳",
  },
  {
    title: "足迹地图",
    desc: "把去过的国家和城市点亮成地图。",
    icon: "🗺️",
  },
  {
    title: "人生档案",
    desc: "沉淀每一次旅行，形成长期旅行档案。",
    icon: "✨",
  },
];

const productPoints = [
  "旅行计划工作台",
  "旅行详情时间线",
  "预算与费用记录",
  "旅行足迹地图",
  "数据分析仪表盘",
  "旅行人生档案",
];

export default function Home() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<AuthMessage | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const timeout = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000);
      });
  
      const result = await Promise.race([
        supabase.auth.getUser(),
        timeout,
      ]);
  
      if (result && "data" in result && result.data.user) {
        router.replace("/overview");
        return;
      }
    } catch (error) {
      console.error("检查登录状态失败：", error);
    } finally {
      setCheckingSession(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setMessage({
        type: "error",
        text: "请填写邮箱和密码。",
      });
      return;
    }

    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "密码至少需要 6 位。",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      setLoading(false);

      if (error) {
        setMessage({
          type: "error",
          text: error.message,
        });
        return;
      }

      setMessage({
        type: "success",
        text: "注册成功，请使用刚才的邮箱和密码登录。",
      });

      setMode("login");
      setPassword("");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      return;
    }

    router.push("/overview");
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-500 text-3xl font-black text-black shadow-[0_0_40px_rgba(34,211,238,0.25)]">
            T
          </div>

          <p className="mt-5 text-sm text-zinc-400">正在进入 Trace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.26),_transparent_34%),radial-gradient(circle_at_85%_20%,_rgba(59,130,246,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),_transparent_34%),linear-gradient(135deg,_#09090b,_#000000)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,_transparent_1px),linear-gradient(90deg,_rgba(255,255,255,0.035)_1px,_transparent_1px)] bg-[size:48px_48px] opacity-20" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
        <section className="flex flex-col justify-between border-white/10 px-5 py-8 sm:px-8 lg:border-r lg:p-12">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-300 sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
              Trace V1 · 旅行人生档案馆
            </div>

            <div className="mt-10 max-w-4xl">
              <p className="text-xs uppercase tracking-[0.5em] text-cyan-400">
                Build Your Journey
              </p>

              <h1 className="mt-4 text-6xl font-black tracking-tight sm:text-7xl lg:text-8xl">
                TRACE
              </h1>

              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                从旅行计划，
                <br />
                到人生足迹。
              </h2>

              <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
                用一个地方保存你的旅行计划、预算费用、每日行程、城市足迹和旅行人生档案。
                Trace 不只是记录旅行，而是帮你沉淀每一段人生路线。
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {productPoints.map((point) => (
                <span
                  key={point}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 backdrop-blur"
                >
                  {point}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:mt-12">
            {featureCards.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur transition hover:border-cyan-400/30 hover:bg-white/[0.07]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl">
                  {item.icon}
                </div>

                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-8 hidden text-sm text-zinc-600 lg:block">
            Preserve Your Story. Archive Every Journey.
          </p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-500 text-3xl font-black text-black">
                T
              </div>

              <h1 className="mt-4 text-5xl font-black tracking-wider">
                TRACE
              </h1>

              <p className="mt-3 text-sm text-zinc-400">
                旅行人生档案馆
              </p>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/85 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
              <div className="border-b border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
                  Welcome to Trace
                </p>

                <h2 className="mt-3 text-3xl font-black">
                  {mode === "login" ? "登录旅行档案" : "创建 Trace 账号"}
                </h2>

                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {mode === "login"
                    ? "继续管理你的旅行、预算、足迹和人生档案。"
                    : "从第一趟旅行开始，建立你的旅行人生档案。"}
                </p>
              </div>

              <div className="p-6 sm:p-8">
                <div className="mb-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-zinc-900 p-1">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className={
                      mode === "login"
                        ? "rounded-xl bg-cyan-500 py-3 text-sm font-black text-black"
                        : "rounded-xl py-3 text-sm font-medium text-zinc-400 hover:text-white"
                    }
                  >
                    登录
                  </button>

                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className={
                      mode === "register"
                        ? "rounded-xl bg-cyan-500 py-3 text-sm font-black text-black"
                        : "rounded-xl py-3 text-sm font-medium text-zinc-400 hover:text-white"
                    }
                  >
                    注册
                  </button>
                </div>

                {message && (
                  <div
                    className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
                      message.type === "success"
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                        : "border-red-500/25 bg-red-500/10 text-red-300"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-zinc-300">
                      邮箱
                    </label>

                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-300">
                      密码
                    </label>

                    <input
                      type="password"
                      placeholder="至少 6 位密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-cyan-500 py-4 font-black text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "处理中..."
                      : mode === "login"
                      ? "进入 Trace"
                      : "创建账号"}
                  </button>
                </form>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm leading-6 text-zinc-400">
                    {mode === "login"
                      ? "登录后进入总览页，继续查看你的旅行计划、足迹地图和数据仪表盘。"
                      : "注册后即可开始创建旅行计划，记录预算、行程和城市足迹。"}
                  </p>
                </div>
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