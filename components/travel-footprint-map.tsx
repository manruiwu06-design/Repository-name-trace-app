"use client";

import AMapLoader from "@amap/amap-jsapi-loader";
import { useEffect, useMemo, useRef, useState } from "react";

export type FootprintCity = {
  country: string;
  city: string;
  count: number;
  latestTripId: string;
  latestTripTitle: string;
};

type MapPoint = FootprintCity & {
  lng: number;
  lat: number;
};

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode: string;
    };
  }
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCityKey(city: FootprintCity) {
  return `${city.country}-${city.city}`;
}

const fallbackCoordinates: Record<string, { lng: number; lat: number }> = {
  北京: { lng: 116.407387, lat: 39.904179 },
  上海: { lng: 121.473667, lat: 31.230525 },
  广州: { lng: 113.264385, lat: 23.129112 },
  深圳: { lng: 114.057868, lat: 22.543099 },
  杭州: { lng: 120.15515, lat: 30.27415 },
  成都: { lng: 104.066541, lat: 30.572269 },
  重庆: { lng: 106.551556, lat: 29.563009 },
  西安: { lng: 108.940174, lat: 34.341568 },
  南京: { lng: 118.796877, lat: 32.060255 },
  厦门: { lng: 118.089425, lat: 24.479834 },
  青岛: { lng: 120.38264, lat: 36.067082 },
  香港: { lng: 114.169361, lat: 22.319304 },
  澳门: { lng: 113.543873, lat: 22.198745 },
  台北: { lng: 121.565418, lat: 25.032969 },

  东京: { lng: 139.691706, lat: 35.689487 },
  京都: { lng: 135.768029, lat: 35.011636 },
  大阪: { lng: 135.502253, lat: 34.693725 },
  首尔: { lng: 126.978, lat: 37.5665 },
  曼谷: { lng: 100.501765, lat: 13.756331 },
  新加坡: { lng: 103.819836, lat: 1.352083 },
  巴黎: { lng: 2.352222, lat: 48.856613 },
  伦敦: { lng: -0.127758, lat: 51.507351 },
  纽约: { lng: -74.006015, lat: 40.712728 },
  洛杉矶: { lng: -118.243683, lat: 34.052235 },
};

export default function TravelFootprintMap({
  cities,
}: {
  cities: FootprintCity[];
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  const [points, setPoints] = useState<MapPoint[]>([]);
  const [failedCities, setFailedCities] = useState<FootprintCity[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");
  const [selectedKey, setSelectedKey] = useState("");

  const uniqueCities = useMemo(() => {
    const map: Record<string, FootprintCity> = {};

    cities.forEach((city) => {
      const key = getCityKey(city);

      if (!map[key]) {
        map[key] = city;
      }
    });

    return Object.values(map);
  }, [cities]);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY;
      const amapSecurityCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;

      if (!amapKey || !amapSecurityCode) {
        setMapError("缺少高德地图 Key 或安全密钥，请检查 .env.local。");
        setMapLoading(false);
        return;
      }

      if (!mapContainerRef.current) return;

      setMapLoading(true);
      setMapError("");

      try {
        window._AMapSecurityConfig = {
          securityJsCode: amapSecurityCode,
        };

        const AMap = await AMapLoader.load({
          key: amapKey,
          version: "2.0",
          plugins: ["AMap.Geocoder", "AMap.Scale", "AMap.ToolBar"],
        });

        if (cancelled || !mapContainerRef.current) return;

        if (mapRef.current) {
          mapRef.current.destroy();
          mapRef.current = null;
        }

        const map = new AMap.Map(mapContainerRef.current, {
          zoom: 4,
          center: [105.5525, 34.3227],
          viewMode: "3D",
          pitch: 36,
          mapStyle: "amap://styles/darkblue",
        });

        map.addControl(new AMap.Scale());
        map.addControl(
          new AMap.ToolBar({
            position: {
              top: "16px",
              right: "16px",
            },
          })
        );

        mapRef.current = map;
        infoWindowRef.current = new AMap.InfoWindow({
          offset: new AMap.Pixel(0, -34),
          closeWhenClickMap: true,
        });

        const geocoder = new AMap.Geocoder({
          city: "全国",
        });

        const resolvedPoints: MapPoint[] = [];
        const failed: FootprintCity[] = [];

        for (const city of uniqueCities) {
          const fallback =
            fallbackCoordinates[city.city] ||
            fallbackCoordinates[city.city.replace("市", "")];

          if (fallback) {
            resolvedPoints.push({
              ...city,
              lng: fallback.lng,
              lat: fallback.lat,
            });

            continue;
          }

          const address =
            city.country.includes("未填写") || city.country === city.city
              ? city.city
              : `${city.country}${city.city}`;

          const point = await new Promise<MapPoint | null>((resolve) => {
            geocoder.getLocation(address, (status: string, result: any) => {
              const location = result?.geocodes?.[0]?.location;

              if (status === "complete" && location) {
                resolve({
                  ...city,
                  lng: Number(location.lng),
                  lat: Number(location.lat),
                });

                return;
              }

              resolve(null);
            });
          });

          if (point) {
            resolvedPoints.push(point);
          } else {
            failed.push(city);
          }
        }

        if (cancelled) return;

        markersRef.current = {};

        const markers = resolvedPoints.map((point) => {
          const key = getCityKey(point);

          const marker = new AMap.Marker({
            position: [point.lng, point.lat],
            offset: new AMap.Pixel(-18, -18),
            content: `
              <div class="trace-map-marker">
                <span class="trace-map-marker-pulse"></span>
                <span class="trace-map-marker-core">${point.count}</span>
              </div>
            `,
          });

          marker.on("click", () => {
            openInfoWindow(point);
          });

          marker.setMap(map);
          markersRef.current[key] = marker;

          return marker;
        });

        if (markers.length > 0) {
          map.setFitView(markers, false, [90, 90, 90, 90]);
        }

        setPoints(resolvedPoints);
        setFailedCities(failed);
      } catch (error) {
        console.error(error);
        setMapError("高德地图加载失败，请检查 Key、安全密钥和网络。");
      } finally {
        if (!cancelled) {
          setMapLoading(false);
        }
      }
    }

    initMap();

    return () => {
      cancelled = true;

      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [uniqueCities]);

  function openInfoWindow(point: MapPoint) {
    if (!mapRef.current || !infoWindowRef.current) return;

    const key = getCityKey(point);
    setSelectedKey(key);

    infoWindowRef.current.setContent(`
      <div class="trace-map-info">
        <div class="trace-map-info-country">${escapeHtml(point.country)}</div>
        <div class="trace-map-info-city">${escapeHtml(point.city)}</div>
        <div class="trace-map-info-desc">${point.count} 趟旅行 · 最近：${escapeHtml(
          point.latestTripTitle
        )}</div>
        <a class="trace-map-info-link" href="/trips/${point.latestTripId}">
          查看旅行详情
        </a>
      </div>
    `);

    infoWindowRef.current.open(mapRef.current, [point.lng, point.lat]);
    mapRef.current.setZoomAndCenter(7, [point.lng, point.lat]);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
      <div className="grid gap-0 xl:grid-cols-[1.5fr_0.75fr]">
        <div className="relative h-[520px] min-h-[420px] bg-zinc-950">
          <div ref={mapContainerRef} className="h-full w-full" />

          {mapLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur">
              <div className="rounded-2xl border border-cyan-500/20 bg-zinc-950 px-5 py-4 text-center">
                <p className="font-semibold text-cyan-300">
                  正在点亮旅行足迹...
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  正在加载地图和定位城市
                </p>
              </div>
            </div>
          )}

          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
              <div className="max-w-md rounded-2xl border border-red-500/20 bg-zinc-950 p-6 text-center">
                <h3 className="text-lg font-bold text-red-300">
                  地图加载失败
                </h3>
                <p className="mt-3 text-sm text-zinc-400">{mapError}</p>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-cyan-500/20 bg-black/50 px-4 py-3 backdrop-blur">
            <p className="text-xs text-zinc-400">Trace Footprint Map</p>
            <p className="mt-1 text-lg font-bold text-white">
              已点亮 {points.length} 个城市
            </p>
          </div>
        </div>

        <aside className="border-t border-zinc-800 bg-zinc-900 p-5 xl:border-l xl:border-t-0">
          <div className="mb-5">
            <h3 className="text-lg font-bold">已点亮城市</h3>
            <p className="mt-1 text-sm text-zinc-500">
              点击城市，可以在地图上定位足迹点。
            </p>
          </div>

          {points.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 p-6 text-center text-sm text-zinc-500">
              还没有可点亮的城市。
            </div>
          ) : (
            <div className="max-h-[390px] space-y-3 overflow-y-auto pr-1">
              {points.map((point) => {
                const key = getCityKey(point);
                const active = selectedKey === key;

                return (
                  <button
                    key={key}
                    onClick={() => openInfoWindow(point)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-cyan-400 bg-cyan-500/10"
                        : "border-zinc-800 bg-zinc-950 hover:border-cyan-500/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-zinc-500">
                          {point.country}
                        </p>
                        <p className="mt-1 text-lg font-bold">{point.city}</p>
                      </div>

                      <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-300">
                        {point.count} 趟
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-1 text-xs text-zinc-500">
                      最近：{point.latestTripTitle}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {failedCities.length > 0 && (
            <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
              <p className="text-sm font-semibold text-yellow-300">
                有 {failedCities.length} 个城市暂时没有定位成功
              </p>

              <p className="mt-2 text-xs text-yellow-100/70">
                可以把旅行里的城市名改得更标准，例如“东京”“广州”“巴黎”。
              </p>
            </div>
          )}
        </aside>
      </div>

      <style jsx global>{`
        .trace-map-marker {
          position: relative;
          width: 36px;
          height: 36px;
        }

        .trace-map-marker-pulse {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: rgba(34, 211, 238, 0.26);
          box-shadow: 0 0 28px rgba(34, 211, 238, 0.9);
          animation: trace-map-pulse 1.8s infinite;
        }

        .trace-map-marker-core {
          position: absolute;
          left: 50%;
          top: 50%;
          display: flex;
          height: 22px;
          min-width: 22px;
          transform: translate(-50%, -50%);
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          border: 2px solid rgba(255, 255, 255, 0.9);
          background: #22d3ee;
          padding: 0 6px;
          color: #020617;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 0 20px rgba(34, 211, 238, 0.95);
        }

        .trace-map-info {
          min-width: 210px;
          border-radius: 16px;
          background: #09090b;
          color: white;
          padding: 14px;
          border: 1px solid rgba(34, 211, 238, 0.3);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
        }

        .trace-map-info-country {
          color: #71717a;
          font-size: 12px;
        }

        .trace-map-info-city {
          margin-top: 4px;
          font-size: 20px;
          font-weight: 800;
        }

        .trace-map-info-desc {
          margin-top: 8px;
          color: #a1a1aa;
          font-size: 12px;
        }

        .trace-map-info-link {
          margin-top: 12px;
          display: inline-flex;
          border-radius: 12px;
          background: #22d3ee;
          padding: 8px 12px;
          color: #020617;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        @keyframes trace-map-pulse {
          0% {
            transform: scale(0.65);
            opacity: 0.95;
          }

          70% {
            transform: scale(1.8);
            opacity: 0;
          }

          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}