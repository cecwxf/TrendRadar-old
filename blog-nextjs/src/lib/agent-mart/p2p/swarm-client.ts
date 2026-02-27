import DHT from "@hyperswarm/dht-relay";
import Stream from "@hyperswarm/dht-relay/ws";
import type { P2PMessage, P2PHello, P2PPacket, P2PConnectionState } from "./types";
import { DEFAULT_RELAY_URL } from "./types";
import { toHex } from "./crypto";

type MsgHandler = (msg: P2PMessage) => void;
type StateHandler = (state: P2PConnectionState) => void;
type PeerCountHandler = (count: number) => void;

/** Interval between periodic lookup rounds (ms) */
const LOOKUP_INTERVAL = 10_000;
/** Interval between periodic re-announce rounds (ms) */
const ANNOUNCE_INTERVAL = 30_000;
/** Max time to wait for announce().finished() */
const ANNOUNCE_TIMEOUT = 5_000;

export class SwarmClient {
  private ws: WebSocket | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private node: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private server: any = null;
  private topic: Uint8Array | null = null;
  private relayUrl: string;
  private peers = new Map<string, NodeJS.ReadWriteStream>();
  private knownKeys = new Set<string>();
  private lookupTimer: ReturnType<typeof setInterval> | null = null;
  private announceTimer: ReturnType<typeof setInterval> | null = null;

  private onMessage: MsgHandler | null = null;
  private onStateChange: StateHandler | null = null;
  private onPeerCount: PeerCountHandler | null = null;

  private _state: P2PConnectionState = "disconnected";
  private localId: string;
  private destroyed = false;

  constructor(localId: string, relayUrl?: string) {
    this.localId = localId;
    this.relayUrl = relayUrl || DEFAULT_RELAY_URL;
  }

  get state(): P2PConnectionState { return this._state; }
  get peerCount(): number { return this.peers.size; }

  setOnMessage(fn: MsgHandler) { this.onMessage = fn; }
  setOnStateChange(fn: StateHandler) { this.onStateChange = fn; }
  setOnPeerCount(fn: PeerCountHandler) { this.onPeerCount = fn; }

  private setState(s: P2PConnectionState) {
    this._state = s;
    this.onStateChange?.(s);
  }

  private emitPeerCount() {
    this.onPeerCount?.(this.peers.size);
  }

  async connect(topicBuf: Uint8Array): Promise<void> {
    if (this.destroyed) return;
    this.topic = topicBuf;
    this.setState("connecting");

    try {
      this.ws = new WebSocket(this.relayUrl);
      await new Promise<void>((resolve, reject) => {
        this.ws!.onopen = () => resolve();
        this.ws!.onerror = (e) => reject(e);
      });

      const stream = new (Stream as any)(true, this.ws);
      this.node = new (DHT as any)(stream);

      // Create server to accept incoming connections
      this.server = this.node.createServer();
      this.server.on("connection", (socket: NodeJS.ReadWriteStream) => {
        this.handlePeer(socket);
      });
      await this.server.listen(this.node.defaultKeyPair);

      // Connected as soon as relay + server are ready
      this.setState("connected");

      // Announce + lookup in background, then keep retrying periodically
      this.announce(topicBuf).catch(() => {});
      this.lookup(topicBuf);

      this.announceTimer = setInterval(() => {
        this.announce(topicBuf).catch(() => {});
      }, ANNOUNCE_INTERVAL);

      this.lookupTimer = setInterval(() => {
        this.lookup(topicBuf);
      }, LOOKUP_INTERVAL);
    } catch {
      this.setState("error");
    }
  }

  private async announce(topicBuf: Uint8Array) {
    if (!this.node || this.destroyed) return;
    const ann = this.node.announce(topicBuf, this.node.defaultKeyPair);
    await Promise.race([
      ann.finished().catch(() => {}),
      new Promise<void>((r) => setTimeout(r, ANNOUNCE_TIMEOUT)),
    ]);
  }

  private async unannounce(topicBuf: Uint8Array) {
    if (!this.node) return;
    try {
      const unann = this.node.unannounce(topicBuf, this.node.defaultKeyPair);
      await Promise.race([
        unann.finished().catch(() => {}),
        new Promise<void>((r) => setTimeout(r, ANNOUNCE_TIMEOUT)),
      ]);
    } catch { /* ok */ }
  }

  private lookup(topicBuf: Uint8Array) {
    if (!this.node || this.destroyed) return;
    const lookup = this.node.lookup(topicBuf);
    lookup.on("data", (result: { peers: Array<{ publicKey: Uint8Array; relayAddresses: unknown[] }> }) => {
      if (this.destroyed || !this.node) return;
      for (const peer of result.peers) {
        const remoteKey = toHex(peer.publicKey);
        const localKey = toHex(this.node.defaultKeyPair.publicKey);
        if (remoteKey === localKey) continue;
        if (this.knownKeys.has(remoteKey)) continue;
        this.knownKeys.add(remoteKey);
        const socket = this.node.connect(peer.publicKey, { relayAddresses: peer.relayAddresses });
        this.handlePeer(socket, remoteKey);
      }
    });
    // Ignore lookup errors (e.g. relay hiccup)
    lookup.on("error", () => {});
  }

  /**
   * Extract a stable remotePublicKey hex from a DHT relay socket.
   * Falls back to undefined if the socket doesn't expose one.
   */
  private getRemoteKey(socket: NodeJS.ReadWriteStream): string | undefined {
    const s = socket as unknown as { remotePublicKey?: Uint8Array };
    if (s.remotePublicKey && s.remotePublicKey.length > 0) {
      return toHex(s.remotePublicKey);
    }
    return undefined;
  }

  private handlePeer(socket: NodeJS.ReadWriteStream, remoteKey?: string) {
    // Try to get a stable key from the socket itself (works for server-side connections too)
    const key = remoteKey || this.getRemoteKey(socket);

    if (key) {
      // Deduplicate: if we already have a live connection to this key, skip
      if (this.peers.has(key)) {
        try { (socket as unknown as { destroy(): void }).destroy(); } catch { /* ok */ }
        return;
      }
      this.knownKeys.add(key);
    }

    const peerId = key || `anon-${Math.random().toString(36).slice(2, 10)}`;
    this.peers.set(peerId, socket);
    this.emitPeerCount();

    // Send hello
    const hello: P2PHello = {
      t: "hello",
      topics: this.topic ? [toHex(this.topic)] : [],
      id: this.localId,
    };
    this.writeToStream(socket, hello);

    let buf = "";
    socket.on("data", (chunk: Uint8Array | string) => {
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const pkt = JSON.parse(line) as P2PPacket;
          if (pkt.t === "msg") {
            this.onMessage?.(pkt);
          }
        } catch { /* ignore malformed */ }
      }
    });

    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      this.peers.delete(peerId);
      if (key) this.knownKeys.delete(key);
      this.emitPeerCount();
    };

    socket.on("error", remove);
    socket.on("close", remove);
    socket.on("end", remove);
  }

  private writeToStream(stream: NodeJS.ReadWriteStream, data: P2PPacket) {
    try {
      const w = stream as unknown as { write(d: string): void };
      w.write(JSON.stringify(data) + "\n");
    } catch { /* peer may have disconnected */ }
  }

  send(msg: P2PMessage): void {
    for (const [, stream] of this.peers) {
      this.writeToStream(stream, msg);
    }
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.setState("disconnected");

    // Stop periodic timers first
    if (this.lookupTimer) { clearInterval(this.lookupTimer); this.lookupTimer = null; }
    if (this.announceTimer) { clearInterval(this.announceTimer); this.announceTimer = null; }

    // Unannounce in background — don't block destroy
    if (this.topic && this.node) {
      this.unannounce(this.topic).catch(() => {});
    }

    for (const [, stream] of this.peers) {
      try { (stream as unknown as { destroy(): void }).destroy(); } catch { /* ok */ }
    }
    this.peers.clear();
    this.knownKeys.clear();
    try { await this.server?.close(); } catch { /* ok */ }
    try { this.node?.destroy(); } catch { /* ok */ }
    try { this.ws?.close(); } catch { /* ok */ }
    this.server = null;
    this.node = null;
    this.ws = null;
  }
}
