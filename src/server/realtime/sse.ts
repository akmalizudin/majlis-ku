import "server-only";
import { bus, type BusMessage } from "./bus";

const encoder = new TextEncoder();
const HEARTBEAT_MS = 25_000;

/** A Server-Sent Events response that relays bus messages for one event until the client goes away. */
export function sseResponse(request: Request, eventId: string, transform: (message: BusMessage) => BusMessage | null = (m) => m) {
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          cleanup();
        }
      };
      const send = (name: string, data: unknown) => write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
      // Ask the browser to wait 3 s before reconnecting after a drop.
      write("retry: 3000\n\n");
      send("ready", { at: new Date().toISOString() });

      const unsubscribe = bus.subscribe(eventId, (message) => {
        const out = transform(message);
        if (out) send(out.type, out);
      });
      const heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);
      cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };
      request.signal.addEventListener("abort", () => cleanup(), { once: true });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}