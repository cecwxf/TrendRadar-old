declare module "@hyperswarm/dht-relay" {
  import { EventEmitter } from "events";

  interface DHTServer extends EventEmitter {
    listen(keyPair: unknown): Promise<void>;
    close(): Promise<void>;
  }

  interface DHTLookup extends EventEmitter {}

  interface DHTNode extends EventEmitter {
    defaultKeyPair: unknown;
    createServer(): DHTServer;
    lookup(topic: Uint8Array): DHTLookup;
    connect(publicKey: Uint8Array, opts?: { relayAddresses?: unknown[] }): NodeJS.ReadWriteStream;
    destroy(): Promise<void>;
  }

  export default function DHT(stream: unknown): DHTNode;
}

declare module "@hyperswarm/dht-relay/ws" {
  export default function Stream(isInitiator: boolean, ws: WebSocket): unknown;
}
