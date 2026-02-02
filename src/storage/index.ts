export type MemoryRecord = {
  id: string;
  user: string;
  channel: "whatsapp" | "tui";
  content: string;
  createdAt: string;
};

export interface MemoryStore {
  save(record: MemoryRecord): Promise<void>;
  listByUser(user: string): Promise<MemoryRecord[]>;
}
