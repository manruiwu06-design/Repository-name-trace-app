"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TravelFootprintMap, {
  type FootprintCity,
} from "@/components/travel-footprint-map";

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

type ItineraryPhoto = {
  id: string;
  trip_id: string;
  title: string;
  category: string | null;
  day_number: number | null;
  image_url: string | null;
  created_at: string;
};

type TripStatus = "未开始" | "旅行中" | "已完成" | "待完善";

type CityFootprint = {
  country: string;
  city: string;
  trips: Trip[];
  count: number;
  latestTrip: Trip;
};

type CountryFootprint = {
  country: string;
  trips: Trip[];
  cities: CityFootprint[];
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

function getDisplayCountry(country: string | null) {
  return country?.trim() || "未填写国家";
}

function getDisplayCity(city: string | null) {
  return city?.trim() || "未填写城市";
}

export default function MapPage() {
  const router = useRouter();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [photos, setPhotos] = useState<ItineraryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initPage();
  }, []);

  async function initPage() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/");
      return;
    }

    await fetchMapData(data.user.id);
    setLoading(false);
  }

  async function fetchMapData(currentUserId: string) {
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (tripError) {
      alert(tripError.message);
      return;
    }

    const tripList = tripData || [];
    setTrips(tripList);

    const tripIds = tripList.map((trip) => trip.id);

    if (tripIds.length === 0) {
      setPhotos([]);
      return;
    }

    const { data: photoData, error: photoError } = await supabase
      .from("itinerary_items")
      .select("id, trip_id, title, category, day_number, image_url, created_at")
      .in("trip_id", tripIds)
      .not("image_url", "is", null)
      .order("created_at", { ascending: false });

    if (photoError) {
      console.error(photoError);
      setPhotos([]);
      return;
    }

    setPhotos(photoData || []);
  }

  const tripTitleMap = useMemo(() => {
    const map: Record<string, string> = {};

    trips.forEach((trip) => {
      map[trip.id] = trip.title;
    });

    return map;
  }, [trips]);

  const countryFootprints = useMemo<CountryFootprint[]>((() => {
    const countryMap: Record<string, Trip[]> = {};

    trips.forEach((trip) => {
      const country = getDisplayCountry(trip.country);

      if (!countryMap[country]) {
        countryMap[country] = [];
      }

      countryMap[country].push(trip);
    });

    return Object.entries(countryMap)
      .map(([country, countryTrips]) => {
        const cityMap: Record<string, Trip[]> = {};

        countryTrips.forEach((trip) => {
          const city = getDisplayCity(trip.city);

          if (!cityMap[city]) {
            cityMap[city] = [];
          }

          cityMap[city].push(trip);
        });

        const cities = Object.entries(cityMap)
          .map(([city, cityTrips]) => {
            const latestTrip = [...cityTrips].sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )[0];

            return {
              country,
              city,
              trips: cityTrips,
              count: cityTrips.length,
              latestTrip,
            };
          })
          .sort((a, b) => b.count - a.count);

        return {
          country,
          trips: countryTrips,
          cities,
        };
      })
      .sort((a, b) => b.trips.length - a.trips.length);
  }) as () => CountryFootprint[], [trips]);

  const cityFootprints = countryFootprints
    .flatMap((country) => country.cities)
    .sort((a, b) => b.count - a.count);

  const footprintCities: FootprintCity[] = cityFootprints.map((city) => ({
    country: city.country,
    city: city.city,
    count: city.count,
    latestTripId: city.latestTrip.id,
    latestTripTitle: city.latestTrip.title,
  }));

  const countryCount = countryFootprints.length;
  const cityCount = cityFootprints.length;

  const completedCount = trips.filter(
    (trip) => getTripStatus(trip) === "已完成"
  ).length;

  const activeCount = trips.filter(
    (trip) => getTripStatus(trip) === "旅行中"
  ).length;

  const recentTrips = trips.slice(0, 5);
  const recentPhotos = photos.slice(0, 8);

  if (loading) {
    return (
      <main className="p-4 text-white sm:p-8">
        <p className="text-zinc-400">正在加载旅行足迹...</p>
      </main>
    );
  }

  return (
    <main className="p-4 text-white sm:p-8">
      <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <p className="text-sm font-medium text-cyan-400">Trace Map</p>

            <h1 className="mt-3 text-3xl font-bold sm:text-5xl">
              我的旅行足迹
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-400">
              Trace 会根据你的旅行记录，自动把去过的城市点亮在地图上。
              每一个发光点，都是你旅行人生档案里的一段记忆。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/trips"
                className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-400"
              >
                管理我的旅行
              </Link>

              <Link
                href="/overview"
                className="rounded-xl bg-zinc-800 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700"
              >
                返回总览
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-black/30 p-5">
            <p className="text-sm text-zinc-400">足迹摘要</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-zinc-900 p-4">
                <p className="text-3xl font-bold text-cyan-300">
                  {countryCount}
                </p>
                <p className="mt-1 text-xs text-zinc-500">国家</p>
              </div>

              <div className="rounded-xl bg-zinc-900 p-4">
                <p className="text-3xl font-bold text-blue-300">
                  {cityCount}
                </p>
                <p className="mt-1 text-xs text-zinc-500">城市</p>
              </div>

              <div className="rounded-xl bg-zinc-900 p-4">
                <p className="text-3xl font-bold text-emerald-300">
                  {completedCount}
                </p>
                <p className="mt-1 text-xs text-zinc-500">已完成</p>
              </div>

              <div className="rounded-xl bg-zinc-900 p-4">
                <p className="text-3xl font-bold text-cyan-300">
                  {activeCount}
                </p>
                <p className="mt-1 text-xs text-zinc-500">旅行中</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {trips.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/50 p-10 text-center">
          <h2 className="text-2xl font-bold">还没有旅行足迹</h2>

          <p className="mt-3 text-zinc-500">
            创建第一趟旅行后，这里会自动生成你的国家、城市和照片足迹。
          </p>

          <Link
            href="/trips"
            className="mt-6 inline-block rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black"
          >
            去创建旅行
          </Link>
        </section>
      ) : (
        <>
          <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
              <p className="text-sm text-zinc-400">总旅行</p>
              <h2 className="mt-2 text-3xl font-bold">{trips.length}</h2>
            </div>

            <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
              <p className="text-sm text-zinc-400">去过国家</p>
              <h2 className="mt-2 text-3xl font-bold">{countryCount}</h2>
            </div>

            <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
              <p className="text-sm text-zinc-400">去过城市</p>
              <h2 className="mt-2 text-3xl font-bold">{cityCount}</h2>
            </div>

            <div className="rounded-2xl bg-zinc-900 p-5 sm:p-6">
              <p className="text-sm text-zinc-400">旅行照片</p>
              <h2 className="mt-2 text-3xl font-bold text-cyan-400">
                {photos.length}
              </h2>
            </div>
          </section>

          <section className="mb-8">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">足迹地图</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  去过的城市会在地图上自动点亮，点击发光点可查看最近旅行。
                </p>
              </div>

              <span className="w-fit rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                {footprintCities.length} 个城市
              </span>
            </div>

            <TravelFootprintMap cities={footprintCities} />
          </section>

          <section className="mb-8 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">按国家整理足迹</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    每个国家下方会自动显示城市和旅行次数。
                  </p>
                </div>

                <span className="w-fit rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                  {countryFootprints.length} 个国家
                </span>
              </div>

              <div className="space-y-4">
                {countryFootprints.map((country) => (
                  <div
                    key={country.country}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5"
                  >
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-xl font-bold">
                          {country.country}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-500">
                          {country.trips.length} 趟旅行 ·{" "}
                          {country.cities.length} 个城市
                        </p>
                      </div>

                      <Link
                        href={`/trips/${country.trips[0].id}`}
                        className="w-fit rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                      >
                        查看最近旅行
                      </Link>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {country.cities.map((city) => (
                        <Link
                          key={`${country.country}-${city.city}`}
                          href={`/trips/${city.latestTrip.id}`}
                          className="rounded-2xl bg-zinc-900 p-4 transition hover:bg-zinc-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold">
                                {city.city}
                              </p>

                              <p className="mt-1 line-clamp-1 text-sm text-zinc-500">
                                最近：{city.latestTrip.title}
                              </p>
                            </div>

                            <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-300">
                              {city.count} 趟
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">最近照片</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    从行程图片自动汇总。
                  </p>
                </div>

                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                  {photos.length} 张
                </span>
              </div>

              {recentPhotos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-8 text-center text-sm text-zinc-500">
                  还没有照片。进入旅行详情页，为每日行程上传图片后，这里会自动展示。
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {recentPhotos.map((photo) => (
                    <Link
                      key={photo.id}
                      href={`/trips/${photo.trip_id}`}
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
                    >
                      <img
                        src={photo.image_url as string}
                        alt={photo.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
                        <p className="truncate text-sm font-semibold">
                          {photo.title}
                        </p>

                        <p className="mt-1 truncate text-xs text-zinc-300">
                          {tripTitleMap[photo.trip_id] || "旅行"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">最近旅行记录</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  点击可进入旅行详情页继续记录。
                </p>
              </div>

              <Link href="/trips" className="text-sm text-cyan-400">
                查看全部 →
              </Link>
            </div>

            <div className="space-y-3">
              {recentTrips.map((trip) => {
                const status = getTripStatus(trip);

                return (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    className="flex flex-col gap-3 rounded-2xl bg-zinc-950/70 p-4 transition hover:bg-zinc-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {trip.title}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-zinc-500">
                        {getDisplayCountry(trip.country)} ·{" "}
                        {getDisplayCity(trip.city)}
                      </p>
                    </div>

                    <div className="text-sm text-zinc-500">
                      {trip.start_date || "未填写开始日期"}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}