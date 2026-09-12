import { spawn } from "node:child_process";
import { index, favicon, icons } from "./embedded-assets";

const port = 4173;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,

  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(index, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (url.pathname === "/favicon.svg") {
      return new Response(favicon, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (url.pathname === "/icons.svg") {
      return new Response(icons, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-cache",
        },
      });
    }

    return new Response("Not Found", {
      status: 404,
    });
  },
});

const address = `http://${server.hostname}:${server.port}/`;

console.log(`Hydra Exporter running at ${address}`);
console.log("Close this window to stop the server.");

function openBrowser(url: string): void {
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/c", "start", "", url], {
      stdio: "ignore",
      detached: true,
    }).unref();

    return;
  }

  if (process.platform === "darwin") {
    spawn("open", [url], {
      stdio: "ignore",
      detached: true,
    }).unref();

    return;
  }

  spawn("xdg-open", [url], {
    stdio: "ignore",
    detached: true,
  }).unref();
}

openBrowser(address);
