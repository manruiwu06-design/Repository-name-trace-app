import { supabase } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/services/trips";

export type ItineraryItem = {
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

export type ItineraryInput = {
  day_number?: number | null;
  time?: string | null;
  title: string;
  category?: string | null;
  notes?: string | null;
  image_url?: string | null;
};

export async function getItineraryItemsByTripId(tripId: string) {
  const { data, error } = await supabase
    .from("itinerary_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("day_number", { ascending: true })
    .order("time", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as ItineraryItem[];
}

export async function uploadItineraryImageForCurrentUser(
  tripId: string,
  file: File
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("请先登录");
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "-");
  const filePath = `${userId}/${tripId}/${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage
    .from("trip-images")
    .upload(filePath, file);

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("trip-images").getPublicUrl(filePath);

  return data.publicUrl;
}

export async function createItineraryItem(
  tripId: string,
  input: ItineraryInput
) {
  if (!input.title.trim()) {
    throw new Error("请填写行程标题");
  }

  const { data, error } = await supabase
    .from("itinerary_items")
    .insert({
      trip_id: tripId,
      day_number: input.day_number || 1,
      time: input.time || null,
      title: input.title.trim(),
      category: input.category || "其他",
      notes: input.notes?.trim() || null,
      image_url: input.image_url || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ItineraryItem;
}

export async function updateItineraryItem(
  itemId: string,
  input: ItineraryInput
) {
  if (!input.title.trim()) {
    throw new Error("请填写行程标题");
  }

  const { data, error } = await supabase
    .from("itinerary_items")
    .update({
      day_number: input.day_number || 1,
      time: input.time || null,
      title: input.title.trim(),
      category: input.category || "其他",
      notes: input.notes?.trim() || null,
      image_url: input.image_url || null,
    })
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ItineraryItem;
}

export async function deleteItineraryItem(itemId: string) {
  const { error } = await supabase
    .from("itinerary_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
export async function getItineraryPhotosByTripIds(tripIds: string[]) {
    if (tripIds.length === 0) {
      return [] as ItineraryItem[];
    }
  
    const { data, error } = await supabase
      .from("itinerary_items")
      .select("*")
      .in("trip_id", tripIds)
      .not("image_url", "is", null)
      .order("created_at", { ascending: false });
  
    if (error) {
      throw new Error(error.message);
    }
  
    return (data || []) as ItineraryItem[];
  }