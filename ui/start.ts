import { join } from "node:path";
import { spawn } from "node:child_process";

const port = 4173;
const root = process.cwd();

const indexPath = join(root, "dist", "index.html");

if (!(await Bun.file(indexPath).exists())) {
  console.error(`Could not find:\n${indexPath}`);
  console.error("");
  console.error("Make sure you ran:");
  console.error("  bun run build");
  process.exit(1);
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file(indexPath), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
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
