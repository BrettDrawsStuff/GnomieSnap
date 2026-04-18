import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Font ─────────────────────────────────────────────────────────────────────
// Liberation Mono is metrically identical to Courier New — bundled in /assets.
const __dir   = dirname(fileURLToPath(import.meta.url));
const fontData = readFileSync(join(__dir, "../assets/NotoSansMono.ttf"));

// ─── Layout constants ─────────────────────────────────────────────────────────
const FONT_SIZE   = 30;
const LINE_HEIGHT = 1.25;
const PAD_X       = 48;
const PAD_Y       = 40;
const IMG_WIDTH   = 320;

// ─── Render ───────────────────────────────────────────────────────────────────

export async function renderGnomePng(art: string): Promise<Uint8Array> {
  const lines = art.split("\n");

  // satori accepts plain objects but its TS types require React elements.
  // Casting to `any` is the standard approach for non-JSX satori usage.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node: any = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#000000",
        width: IMG_WIDTH,
        padding: `${PAD_Y}px ${PAD_X}px`,
        fontFamily: "NotoSansMono",
        fontSize: FONT_SIZE,
        fontWeight: 400,
        color: "#ffffff",
        lineHeight: LINE_HEIGHT,
        letterSpacing: "-0.1em",
      },
      children: lines.map((line) => ({
        type: "div",
        props: {
          style: { display: "flex", width: "100%", justifyContent: "center", whiteSpace: "pre" },
          children: line.trimStart().length > 0 ? line.trimStart() : " ",
        },
      })),
    },
  };

  const height = Math.ceil(PAD_Y * 2 + lines.length * FONT_SIZE * LINE_HEIGHT) + 16;

  const svg = await satori(node, {
    width: IMG_WIDTH,
    height,
    fonts: [
      {
        name: "NotoSansMono",
        data: fontData,
        weight: 400,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: IMG_WIDTH } });
  return resvg.render().asPng();
}
