import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Convert Supabase Storage path to public URL
 * @param supabase Supabase client
 * @param bucket Bucket name (e.g., 'profile-avatars')
 * @param path Storage path (e.g., 'user-id/avatar.jpg')
 * @returns Public URL or null if path is null
 */
export const getStoragePublicUrl = (
  supabase: SupabaseClient,
  bucket: string,
  path: string | null
): string | null => {
  if (!path) return null;
  
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
};

/**
 * Convert avatar path to public URL
 * @param supabase Supabase client
 * @param avatarPath Avatar storage path or already public URL
 * @returns Public URL or null
 */
export const getAvatarPublicUrl = (
  supabase: SupabaseClient,
  avatarPath: string | null
): string | null => {
  if (!avatarPath) return null;
  
  // If already a full URL (http/https), return as-is
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  
  return getStoragePublicUrl(supabase, "profile-avatars", avatarPath);
};
