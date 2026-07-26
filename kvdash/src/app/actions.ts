"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  kvSet,
  kvDel,
  kvPExpire,
  kvZAdd,
  kvZRem,
} from "@/lib/kvClient";

export async function setKeyAction(formData: FormData) {
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "");
  if (!key) return;
  await kvSet(key, value);
  revalidatePath("/");
  revalidatePath(`/keys/${encodeURIComponent(key)}`);
}

export async function deleteKeyAction(formData: FormData) {
  const key = String(formData.get("key") ?? "").trim();
  if (!key) return;
  await kvDel(key);
  revalidatePath("/");
  redirect("/");
}

export async function setTtlAction(formData: FormData) {
  const key = String(formData.get("key") ?? "").trim();
  const ttlMs = Number(formData.get("ttlMs"));
  if (!key || Number.isNaN(ttlMs)) return;
  await kvPExpire(key, ttlMs);
  revalidatePath(`/keys/${encodeURIComponent(key)}`);
}

export async function zAddAction(formData: FormData) {
  const key = String(formData.get("key") ?? "").trim();
  const member = String(formData.get("member") ?? "").trim();
  const score = Number(formData.get("score"));
  if (!key || !member || Number.isNaN(score)) return;
  await kvZAdd(key, score, member);
  revalidatePath(`/zsets/${encodeURIComponent(key)}`);
}

export async function zRemAction(formData: FormData) {
  const key = String(formData.get("key") ?? "").trim();
  const member = String(formData.get("member") ?? "").trim();
  if (!key || !member) return;
  await kvZRem(key, member);
  revalidatePath(`/zsets/${encodeURIComponent(key)}`);
}
