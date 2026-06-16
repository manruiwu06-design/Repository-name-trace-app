import { supabase } from "@/lib/supabase";

export type Trip = {
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

export type TripInput = {
  title: string;
  country?: string | null;
  city?: string | null;
  budget?: number | string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type TripStatus = "未开始" | "旅行中" | "已完成" | "待完善";

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return data.user?.id || null;
}

export async function getTripsForCurrentUser() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return {
      userId: null,
      trips: [] as Trip[],
    };
  }

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return {
    userId,
    trips: (data || []) as Trip[],
  };
}

export async function getTripByIdForCurrentUser(tripId: string) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return {
      userId: null,
      trip: null as Trip | null,
    };
  }

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    userId,
    trip: data as Trip,
  };
}

export async function createTripForCurrentUser(input: TripInput) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("请先登录");
  }

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      title: input.title,
      country: input.country || null,
      city: input.city || null,
      budget: input.budget || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Trip;
}

export async function updateTripForCurrentUser(
  tripId: string,
  input: TripInput
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("请先登录");
  }

  const { data, error } = await supabase
    .from("trips")
    .update({
      title: input.title,
      country: input.country || null,
      city: input.city || null,
      budget: input.budget || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
    })
    .eq("id", tripId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Trip;
}

export async function deleteTripForCurrentUser(tripId: string) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("请先登录");
  }

  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function getTripCoverMap(tripIds: string[]) {
  if (tripIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("itinerary_items")
    .select("trip_id, image_url, day_number, time, created_at")
    .in("trip_id", tripIds)
    .not("image_url", "is", null)
    .order("day_number", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    console.error(error);
    return {};
  }

  const coverMap: Record<string, string> = {};

  (data || []).forEach((item) => {
    if (!item.image_url) return;

    if (!coverMap[item.trip_id]) {
      coverMap[item.trip_id] = item.image_url;
    }
  });

  return coverMap;
}

export async function getTripsWithCoversForCurrentUser() {
  const { userId, trips } = await getTripsForCurrentUser();

  if (!userId || trips.length === 0) {
    return {
      userId,
      trips: [] as Trip[],
    };
  }

  const tripIds = trips.map((trip) => trip.id);
  const coverMap = await getTripCoverMap(tripIds);

  const tripsWithCovers = trips.map((trip) => ({
    ...trip,
    cover_image_url: coverMap[trip.id] || null,
  }));

  return {
    userId,
    trips: tripsWithCovers,
  };
}

export function getTripStatus(trip: Trip): TripStatus {
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