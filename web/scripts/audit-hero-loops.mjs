import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const distRoot = join(webRoot, "dist");
const pages = [
  {
    slug: "inspr",
    html: "index.html",
    expectedDuration: 15.042,
    expectedProfile: "Main",
    requiresFastStart: true,
  },
  {
    slug: "aithema",
    html: "aithema/index.html",
    expectedDuration: 5.042,
    expectedProfile: "High",
    requiresFastStart: true,
  },
  {
    slug: "paimos",
    html: "paimos/index.html",
    expectedDuration: 15.042,
    expectedProfile: "Main",
    requiresFastStart: true,
  },
  {
    slug: "pharos",
    html: "pharos/index.html",
    expectedDuration: 15.042,
    expectedProfile: "Main",
    requiresFastStart: true,
  },
  {
    slug: "janus",
    html: "janus/index.html",
    expectedDuration: 15.042,
    expectedProfile: "Main",
    requiresFastStart: true,
  },
];
const auditedMedia = new Set();

function requiredAttribute(tag, attribute, slug) {
  if (!new RegExp(`\\s${attribute}(?:\\s|=|>)`, "i").test(tag)) {
    throw new Error(`${slug}: hero video is missing ${attribute}`);
  }
}

function resolveDistAsset(url) {
  const pathname = new URL(url, "https://www.inspr.at").pathname;
  return join(distRoot, pathname.replace(/^\/+/, ""));
}

async function auditMedia(assetPath, page) {
  const { slug, expectedDuration, expectedProfile, requiresFastStart } = page;
  if (auditedMedia.has(assetPath)) return;
  auditedMedia.add(assetPath);

  const metadata = await stat(assetPath);
  if (metadata.size < 250 * 1024 || metadata.size > 3 * 1024 * 1024) {
    throw new Error(`${slug}: hero loop is ${metadata.size} bytes; expected 250 KiB to 3 MiB`);
  }

  const file = await readFile(assetPath);
  const ftyp = file.indexOf(Buffer.from("ftyp"));
  const moov = file.indexOf(Buffer.from("moov"));
  const mdat = file.indexOf(Buffer.from("mdat"));
  if (ftyp < 0 || moov < 0 || mdat < 0) {
    throw new Error(`${slug}: hero loop is not a valid MP4`);
  }
  if (requiresFastStart && moov > mdat) {
    throw new Error(`${slug}: hero loop is not a fast-start MP4`);
  }

  const probe = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "stream=codec_type,codec_name,profile,pix_fmt,width,height,r_frame_rate:format=duration",
      "-of", "json",
      assetPath,
    ],
    { encoding: "utf8" },
  );
  if (probe.error || probe.status !== 0) {
    throw new Error(`${slug}: ffprobe failed for ${assetPath}: ${probe.error?.message ?? probe.stderr.trim()}`);
  }

  const media = JSON.parse(probe.stdout);
  const videoStreams = media.streams.filter((stream) => stream.codec_type === "video");
  const audioStreams = media.streams.filter((stream) => stream.codec_type === "audio");
  const video = videoStreams[0];
  const duration = Number.parseFloat(media.format.duration);
  if (
    videoStreams.length !== 1 ||
    audioStreams.length !== 0 ||
    video?.codec_name !== "h264" ||
    video?.profile !== expectedProfile ||
    video?.pix_fmt !== "yuv420p" ||
    video?.width !== 1280 ||
    video?.height !== 720 ||
    video?.r_frame_rate !== "24/1" ||
    !Number.isFinite(duration) ||
    Math.abs(duration - expectedDuration) > 0.08
  ) {
    throw new Error(`${slug}: unexpected hero-loop media contract: ${JSON.stringify(media)}`);
  }
}

for (const page of pages) {
  const html = await readFile(join(distRoot, page.html), "utf8");
  const videos = [...html.matchAll(new RegExp(`<video[^>]*data-hero-video="${page.slug}"[^>]*>[\\s\\S]*?<\\/video>`, "g"))];
  if (videos.length !== 1) {
    throw new Error(`${page.slug}: expected one hero video, found ${videos.length}`);
  }

  const videoBlock = videos[0][0];
  const openingTag = videoBlock.match(/^<video[^>]*>/)?.[0] ?? "";
  for (const attribute of ["autoplay", "muted", "loop", "playsinline"]) {
    requiredAttribute(openingTag, attribute, page.slug);
  }
  if (!/\spreload="metadata"/.test(openingTag)) {
    throw new Error(`${page.slug}: hero video must preload metadata only`);
  }

  const posterUrl = openingTag.match(/\sposter="([^"]+)"/)?.[1];
  const sourceTag = videoBlock.match(/<source[^>]+>/)?.[0] ?? "";
  const videoUrl = sourceTag.match(/\ssrc="([^"]+\.mp4)"/)?.[1];
  if (!posterUrl || !videoUrl) {
    throw new Error(`${page.slug}: hero video needs a poster and MP4 source`);
  }
  if (!/\stype="video\/mp4"/.test(sourceTag) || !/\smedia="\(prefers-reduced-motion: no-preference\)"/.test(sourceTag)) {
    throw new Error(`${page.slug}: hero source needs its type and reduced-motion media condition`);
  }

  const heroStart = html.lastIndexOf("data-hero-loop", videos[0].index);
  const fallbackSlice = html.slice(heroStart, videos[0].index);
  const fallbackImage = fallbackSlice.match(/<img[^>]+>/g)?.at(-1) ?? "";
  if (!/\swidth="\d+"/.test(fallbackImage) || !/\sheight="\d+"/.test(fallbackImage)) {
    throw new Error(`${page.slug}: in-flow poster image must reserve width and height`);
  }

  await stat(resolveDistAsset(posterUrl));
  const videoPath = resolveDistAsset(videoUrl);
  await auditMedia(videoPath, page);
  console.log(`${page.slug}: hero loop ${videoUrl} (${(await stat(videoPath)).size} bytes)`);
}
