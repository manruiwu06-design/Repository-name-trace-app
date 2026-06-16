import { supabase } from "@/lib/supabase";

export type Expense = {
  id: string;
  trip_id: string;
  category: string | null;
  amount: number | string;
  description: string | null;
  created_at: string;
};

export type ExpenseInput = {
  category?: string | null;
  amount: number | string;
  description?: string | null;
};

export async function getExpensesByTripId(tripId: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Expense[];
}

export async function getExpensesByTripIds(tripIds: string[]) {
  if (tripIds.length === 0) {
    return [] as Expense[];
  }

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .in("trip_id", tripIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Expense[];
}

export async function createExpense(tripId: string, input: ExpenseInput) {
  if (!input.amount) {
    throw new Error("请填写金额");
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      trip_id: tripId,
      category: input.category || "其他",
      amount: Number(input.amount),
      description: input.description?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Expense;
}

export async function updateExpense(expenseId: string, input: ExpenseInput) {
  if (!input.amount) {
    throw new Error("请填写金额");
  }

  const { data, error } = await supabase
    .from("expenses")
    .update({
      category: input.category || "其他",
      amount: Number(input.amount),
      description: input.description?.trim() || null,
    })
    .eq("id", expenseId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Expense;
}

export async function deleteExpense(expenseId: string) {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}