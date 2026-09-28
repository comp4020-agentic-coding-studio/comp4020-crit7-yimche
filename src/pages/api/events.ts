import type { APIRoute } from "astro";
import type { ReportEvent } from "../../lib/db";
import { bus } from "../../lib/events";

// The minimal server-sent-events (SSE) pattern: a long-lived streaming
// response the browser consumes with `new EventSource("/api/events")`.
// SSE is one-directional (server → browser) and plain HTTP, which makes it
// the simplest live channel that works everywhere — reach for WebSockets
// only when the client needs to push over the same connection. Here it carries
// availability reports: when one tab reports a car park, every other open tab
// updates that park's badge and map marker without a reload.
export const GET: APIRoute = () => {
  let onReport: (report: ReportEvent) => void;
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<string>({
    start(controller) {
      // an opening comment so the client (and the post-deploy CI probe) sees
      // bytes immediately, and a periodic one so proxies don't drop the
      // connection as idle
      controller.enqueue(": connected\n\n");
      heartbeat = setInterval(() => controller.enqueue(": ping\n\n"), 30_000);
      onReport = (report) => {
        controller.enqueue(`data: ${JSON.stringify(report)}\n\n`);
      };
      bus.on("report", onReport);
    },
    cancel() {
      clearInterval(heartbeat);
      bus.off("report", onReport);
    },
  });

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    },
  });
};
