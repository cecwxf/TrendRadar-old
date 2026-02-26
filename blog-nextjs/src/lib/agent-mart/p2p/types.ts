export interface P2PMessage {
  t: "msg";
  topic: string;
  data: string;
  id: string;
  ts: number;
  sender: string;
}

export interface P2PHello {
  t: "hello";
  topics: string[];
  id: string;
}

export type P2PPacket = P2PMessage | P2PHello;

export type P2PConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface P2PConfig {
  relayUrl: string;
  secret?: string;
}

export const DEFAULT_RELAY_URL = process.env.NEXT_PUBLIC_DHT_RELAY_URL || "ws://localhost:49443";
