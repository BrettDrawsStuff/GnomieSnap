import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { registerSnapHandler } from "@farcaster/snap-hono";
import { createTursoDataStore } from "@farcaster/snap-turso";
import type { SnapFunction } from "@farcaster/snap";
import { generateGnome } from "./gnome.js";
import type { GnomeData } from "./gnome.js";
import { renderGnomePng } from "./render-png.js";

// ─── Persistent KV store ─────────────────────────────────────────────────────
const store = createTursoDataStore();

// ─── In-memory PNG cache (keyed by FID) ──────────────────────────────────────
const pngCache = new Map<number, Uint8Array>();

// ─── URL helper ──────────────────────────────────────────────────────────────

function getBaseUrl(request: Request): string {
  const fromEnv = process.env.SNAP_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const fwdHost = request.headers.get("x-forwarded-host");
  const host = (fwdHost ?? request.headers.get("host") ?? "localhost:3003")
    .split(",")[0].trim();
  const proto = host.match(/^(localhost|127\.|::1)/) ? "http" : "https";
  return `${proto}://${host}`;
}

// ─── ASCII art text helper ────────────────────────────────────────────────────
// Farcaster renders snap text and cast text in a proportional font on mobile.
// Regular spaces collapse or have inconsistent width.
// Replacing ALL spaces with non-breaking spaces (U+00A0) forces consistent
// spacing in both the snap UI text elements and cast composer text.
function nbspArt(line: string): string {
  return line.replace(/ /g, "\u00a0");
}

// ─── Pages ───────────────────────────────────────────────────────────────────

function mysteryPage(base: string) {
  return {
    version: "2.0" as const,
    theme: { accent: "green" as const },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack" as const,
          props: { gap: "sm" as const },
          children: ["title", "mystery-art", "sub", "sep", "claim-btn"],
        },
        title: {
          type: "text" as const,
          props: { content: "🌲 Gnome Sanctuary", weight: "bold" as const, align: "center" as const },
        },
        "mystery-art": {
          type: "stack" as const,
          props: { gap: "none" as const },
          children: ["m-l0", "m-l1", "m-l2", "m-l3"],
        },
        "m-l0": { type: "text" as const, props: { content: nbspArt("   ^"),      align: "center" as const } },
        "m-l1": { type: "text" as const, props: { content: nbspArt(" /????\\"),  align: "center" as const } },
        "m-l2": { type: "text" as const, props: { content: nbspArt("<(?_?)>"),   align: "center" as const } },
        "m-l3": { type: "text" as const, props: { content: nbspArt(" / ? \\"),   align: "center" as const } },
        sub: {
          type: "text" as const,
          props: {
            content: "A gnome awaits you. Only you can claim it.",
            size: "sm" as const,
            align: "center" as const,
          },
        },
        sep: { type: "separator" as const, props: {} },
        "claim-btn": {
          type: "button" as const,
          props: { label: "Claim My Gnome", variant: "primary" as const, icon: "star" as const },
          on: { press: { action: "submit" as const, params: { target: `${base}/?action=claim` } } },
        },
      },
    },
  };
}

function gnomePage(fid: number, gnome: GnomeData, base: string, isNew: boolean) {
  const { art, name } = gnome;

  // PNG image URL — rendered server-side for pixel-perfect display on all devices
  const imageUrl = `${base}/img/${fid}`;

  // For the share cast, preserve leading spaces with non-breaking spaces
  const shareLines = art.split("\n").map(nbspArt);
  const shareText  = `I claimed ${name} in the Gnome Sanctuary! 🌲\n\n${shareLines.join("\n")}\n\nClaim yours →`;

  return {
    version: "2.0" as const,
    theme: { accent: "green" as const },
    ...(isNew ? { effects: ["confetti" as const] } : {}),
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack" as const,
          props: { gap: "sm" as const },
          children: ["title", "gnome-name", "gnome-img", "fid-label", "sep", "actions"],
        },
        title: {
          type: "text" as const,
          props: {
            content: isNew ? "🎉 Your gnome has been claimed!" : "🌲 Your Gnome",
            weight: "bold" as const,
            align: "center" as const,
          },
        },
        "gnome-name": {
          type: "text" as const,
          props: { content: name, weight: "bold" as const, align: "center" as const },
        },
        // PNG image — identical on desktop and mobile
        "gnome-img": {
          type: "image" as const,
          props: { url: imageUrl, aspect: "4:3" as const, alt: `${name} the gnome` },
        },
        "fid-label": {
          type: "text" as const,
          props: {
            content: `Gnome #${fid}  ·  Bound to FID ${fid}`,
            size: "sm" as const,
            align: "center" as const,
          },
        },
        sep: { type: "separator" as const, props: {} },
        actions: {
          type: "stack" as const,
          props: { direction: "horizontal" as const, gap: "sm" as const },
          children: ["view-btn", "share-btn"],
        },
        "view-btn": {
          type: "button" as const,
          props: { label: "View Again", icon: "refresh-cw" as const },
          on: { press: { action: "submit" as const, params: { target: `${base}/?action=view` } } },
        },
        "share-btn": {
          type: "button" as const,
          props: { label: "Share Gnome", variant: "primary" as const, icon: "share" as const },
          on: {
            press: {
              action: "compose_cast" as const,
              params: { text: shareText, embeds: [base] },
            },
          },
        },
      },
    },
  };
}

function errorPage(message: string, base: string) {
  return {
    version: "2.0" as const,
    theme: { accent: "red" as const },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack" as const,
          props: {},
          children: ["title", "msg", "sep", "back-btn"],
        },
        title: {
          type: "text" as const,
          props: { content: "Something went wrong", weight: "bold" as const, align: "center" as const },
        },
        msg: {
          type: "text" as const,
          props: { content: message, size: "sm" as const, align: "center" as const },
        },
        sep: { type: "separator" as const, props: {} },
        "back-btn": {
          type: "button" as const,
          props: { label: "Try Again", variant: "primary" as const },
          on: { press: { action: "submit" as const, params: { target: `${base}/` } } },
        },
      },
    },
  };
}

// ─── App ─────────────────────────────────────────────────────────────────────

const app = new Hono();

// ── PNG image route ───────────────────────────────────────────────────────────
// GET /img/:fid → renders the gnome art as a PNG and returns it.
// The snap image element points here. Results are cached in memory.
app.get("/img/:fid", async (c) => {
  const fid = parseInt(c.req.param("fid"), 10);
  if (!fid || fid < 1) return c.text("invalid fid", 400);

  // Use cached PNG if available
  if (pngCache.has(fid)) {
    const cached = pngCache.get(fid)!;
    return new Response(cached as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Look up claimed gnome from store, or generate fresh
  const storeKey = `gnome:${fid}`;
  const stored   = await store.get(storeKey) as GnomeData | null;
  const gnome    = stored ?? generateGnome(fid);

  const png = await renderGnomePng(gnome.art);
  pngCache.set(fid, png);

  return new Response(png as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

// ── Snap handler ──────────────────────────────────────────────────────────────

const snap: SnapFunction = async (ctx) => {
  const base   = getBaseUrl(ctx.request);
  const url    = new URL(ctx.request.url);
  const action = url.searchParams.get("action");

  if (ctx.action.type === "get") {
    return mysteryPage(base);
  }

  const fid = ctx.action.user?.fid ?? (ctx.action as { fid?: number }).fid;
  if (!fid) return errorPage("Could not identify your Farcaster account.", base);

  const storeKey = `gnome:${fid}`;

  if (action === "view") {
    const stored = await store.get(storeKey) as GnomeData | null;
    return stored ? gnomePage(fid, stored, base, false) : mysteryPage(base);
  }

  // claim (default POST action)
  const existing = await store.get(storeKey) as GnomeData | null;
  if (existing) return gnomePage(fid, existing, base, false);

  const gnome = generateGnome(fid);
  await store.set(storeKey, gnome);
  return gnomePage(fid, gnome, base, true);
};

registerSnapHandler(app, snap, {
  skipJFSVerification:
    process.env.SKIP_JFS_VERIFICATION === "1" ||
    process.env.NODE_ENV !== "production",
});

// ─── Server ──────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3003);

console.log(`🌲 Gnome Snap → http://localhost:${port}`);
console.log(`   JFS:     ${process.env.SKIP_JFS_VERIFICATION === "1" ? "skipped (dev)" : "enforced"}`);
console.log(`   Storage: ${process.env.TURSO_DATABASE_URL ? "Turso DB" : "in-memory"}`);

serve({ fetch: app.fetch, port });
