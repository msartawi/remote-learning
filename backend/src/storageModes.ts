export const STORAGE_MODES = ["metadata_only", "encrypted_blobs", "fully_p2p"] as const;
export type StorageMode = (typeof STORAGE_MODES)[number];

export function isStorageMode(value: string | null | undefined): value is StorageMode {
  return STORAGE_MODES.includes(value as StorageMode);
}

export function normalizeStorageMode(value: string | null | undefined): StorageMode | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return isStorageMode(normalized) ? normalized : null;
}
