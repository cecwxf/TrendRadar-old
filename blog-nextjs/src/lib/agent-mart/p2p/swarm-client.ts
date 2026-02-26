import DHT from "@hyperswarm/dht-relay";
import Stream from "@hyperswarm/dht-relay/ws";
import type { P2PMessage, P2PHello, P2PPacket, P2PConnectionState } from "./types";
import { DEFAULT_RELAY_URL } from "./types";
import { toHex } from "./crypto";

type MsgHandler = (msg: P2PMessage) => void;
type StateHandler = (state: P2PConnectionState) => void;
type PeerCountHandler = (count: number) => void;

export class SwarmClient {
  private ws: WebSocket | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private node: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private server: any = null;
  private topic: Uint8Array | null = null;
  private relayUrl: string;
  private peers = new Set<string>();
  private streams: Array<{ stream: NodeJS.ReadWriteStream; remoteId: string }> = [];

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

      // Look up the topic to find peers
      this.lookup(topicBuf);

      this.setState("connected");
    } catch {
      this.setState("error");
    }
  }

  private lookup(topicBuf: Uint8Array) {
    if (!this.node || this.destroyed) return;
    const lookup = this.node.lookup(topicBuf);
    lookup.on("peer", (peer: { publicKey: Uint8Array; relayAddresses: unknown[] }) => {
      if (this.destroyed || !this.node) return;
      const socket = this.node.connect(peer.publicKey, { relayAddresses: peer.relayAddresses });
      this.handlePeer(socket);
    });
  }

  private handlePeer(socket: NodeJS.ReadWriteStream) {
    const remoteId = Math.random().toString(36).slice(2, 10);
    this.peers.add(remoteId);
    this.streams.push({ stream: socket, remoteId });
    this.onPeerCount?.(this.peers.size);

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
      // Messages are newline-delimited JSON
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const pkt = JSON.parse(line) as P2PPacket;
          if (pkt.t === "msg") {
            this.onMessage?.(pkt);
          }
          // hello packets can be used for peer identification
        } catch { /* ignore malformed */ }
      }
    });

    socket.on("error", () => this.removePeer(remoteId));
    socket.on("close", () => this.removePeer(remoteId));
    socket.on("end", () => this.removePeer(remoteId));
  }

  private removePeer(id: string) {
    this.peers.delete(id);
    this.streams = this.streams.filter((s) => s.remoteId !== id);
    this.onPeerCount?.(this.peers.size);
  }

  private writeToStream(stream: NodeJS.ReadWriteStream, data: P2PPacket) {
    try {
      const w = stream as unknown as { write(d: string): void };
      w.write(JSON.stringify(data) + "\n");
    } catch { /* peer may have disconnected */ }
  }

  send(msg: P2PMessage): void {
    for (const { stream } of this.streams) {
      this.writeToStream(stream, msg);
    }
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.setState("disconnected");
    for (const { stream } of this.streams) {
      try { (stream as unknown as { destroy(): void }).destroy(); } catch { /* ok */ }
    }
    this.streams = [];
    this.peers.clear();
    try { await this.server?.close(); } catch { /* ok */ }
    try { this.node?.destroy(); } catch { /* ok */ }
    try { this.ws?.close(); } catch { /* ok */ }
    this.server = null;
    this.node = null;
    this.ws = null;
  }
}
