export type WeddingMedia = {
  put(key: string, bytes: Uint8Array): Promise<void>
  get(key: string): Promise<Uint8Array<ArrayBuffer> | null>
  remove(key: string): Promise<void>
}
