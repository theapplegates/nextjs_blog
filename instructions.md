# JXL Astro
# Cloudinary JXL pipeline — install runbook

Port of the palm-tree-paper "no Sharp" JXL system to any Astro site. Verified working on Astro 6 (mirsazzathossain-test, June 2026).

## What this is

Images are uploaded to Cloudinary once. Cloudinary computes responsive breakpoints and transcodes to JXL/AVIF/WebP on its CDN. The site only generates URLs. Sharp is never involved, and the repo ships zero image bytes.

**The two halves:**

- One-time, per image (manual): run the breakpoints script → uploads image → Cloudinary returns widths → script writes them to `src/data/cloudinary-breakpoints.json`
- Every build/page view (automatic): `Picture.astro` reads the JSON, emits a `<picture>` with `image/jxl`, `image/avif`, `image/webp` sources, WebP `<img>` as the floor

Nothing watches `src/assets/` — adding an image does nothing until you run the script.

## The 4 files

| Path | Role |
|---|---|
| `src/components/Picture.astro` | Renders the `<picture>`; builds `f_jxl`/`f_avif`/`f_webp` Cloudinary URLs. Copy as-is. |
| `scripts/cloudinary-breakpoints.mjs` | Uploads (or runs explicit on an existing public ID) and writes widths to the JSON. Copy as-is. |
| `src/data/cloudinary-breakpoints.json` | Generated. Start as `{}`. Never hand-edit. |
| A demo `.mdx` post | Reference call site only. Optional. |

## Prerequisites the target site needs

1. MDX enabled (`@astrojs/mdx` in integrations)
2. `@/*` → `src/*` path alias in `tsconfig.json`
3. Node 22+ (script uses `--env-file=.env`)
4. `.env` in `.gitignore`

## Install steps

### 1. Get the files in

Cleanest: apply the git patch (`git am`). Before applying, check for local drift:

```
cd /path/to/site
git remote -v
git status
```

If `git status` shows modified files (especially `package.json`), the patch will fail with `does not match index`. Shelve local changes first, including untracked files:

```
git stash -u
git am --3way /path/to/0001-Add-Cloudinary-JXL-Picture-pipeline.patch
git log -1 --oneline
```

Do NOT `git stash pop` if the stashed changes touch `package.json` — they will conflict with the patch's edits. Review the stash later with `git stash show -p stash@{0}` and cherry-pick anything you actually want.

If `git am` gets stuck mid-apply, `git am --abort` resets cleanly. Manual file copy is always a valid fallback.

### 2. package.json additions

```
"scripts": {
  "cloudinary:breakpoints": "NODE_OPTIONS=--max-old-space-size=8192 node --env-file=.env scripts/cloudinary-breakpoints.mjs"
},
"dependencies": {
  "astro-cloudinary": "^1.3.5",
  "cloudinary": "^2.10.0"
}
```

### 3. Install deps — the Astro 6 gotcha

`astro-cloudinary@1.3.5` declares peers only up to Astro 5. It works fine on Astro 6 (palm-tree-paper runs Astro 6.4.2 in production with it) — the only thing used is `getCldImageUrl` from `astro-cloudinary/helpers`, a pure URL builder.

- pnpm: just warns; no action needed
- npm: hard-fails with ERESOLVE; override it:

```
npm install --legacy-peer-deps
printf "legacy-peer-deps=true\n" >> .npmrc
git add .npmrc
git commit -m "Use legacy peer deps for astro-cloudinary on Astro 6"
```

The `.npmrc` line is required for Vercel/CI, which run `npm install` on every deploy.

If npm warns about install scripts (`allow-scripts`), approve `esbuild` (downloads its platform binary; required) and `fsevents` (macOS file watching; harmless), then re-run the install:

```
npm approve-scripts esbuild
npm approve-scripts fsevents
npm install --legacy-peer-deps
```

Remove the `.npmrc` line once astro-cloudinary ships Astro 6 peer support.

### 4. Environment

```
cp .env.example .env
```

`.env` contents:

```
PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

`PUBLIC_*` is what astro-cloudinary reads at build time; the unprefixed trio is what the upload script needs. Confirm `.env` is gitignored.

### 5. Generate breakpoints

New local image:

```
npm run cloudinary:breakpoints src/assets/images/foo.jpg
```

Image already in Cloudinary (re-use across sites by public ID, no local file needed):

```
npm run cloudinary:breakpoints assets/images/Image-1
```

Success looks like:

```
assets/images/Image-1: 200, 605, 922, 1125, 1356, 1523, 1528, 1871, 2000
```

The public ID is derived from the path: `src/assets/images/foo.jpg` → `assets/images/foo`.

### 6. Use it in a post

```
import Picture from "@/components/Picture.astro";
import breakpoints from "@/data/cloudinary-breakpoints.json";

<Picture
  src="assets/images/Image-1"
  alt="Description here."
  width={2000}
  height={1500}
  sizes="(min-width: 768px) 720px, 100vw"
  breakpoints={breakpoints["assets/images/Image-1"]}
  pictureClass="responsive-picture"
/>
```

FRONTMATTER WARNING: every site's content collection has its own zod schema (`src/content.config.ts` or `src/content/config.ts`). Do not copy frontmatter between sites — check the target site's schema and match it, or the build fails with `InvalidContentEntryDataError` listing exactly which fields are wrong. Copy the frontmatter shape from an existing post in the same collection.

### 7. Verify

```
npm run dev
```

Open the post. Inspect the image: one `<img>` wrapped by three `<source>` elements (`image/jxl`, `image/avif`, `image/webp`), each with a srcset matching the generated widths. Network tab, filter `res.cloudinary.com`: Safari requests `f_jxl`; Chrome picks `f_avif` unless its JXL flag is on — that is the browser's choice, not a bug.

## Failure modes seen in the wild

| Symptom | Cause | Fix |
|---|---|---|
| `From: command not found` | Executed the patch file as a script | Prefix with `git am` |
| `package.json: does not match index` | Local uncommitted changes | `git am --abort`, `git stash -u`, retry with `--3way` |
| `Missing script: "cloudinary:breakpoints"` | Patch never actually applied | `git log -1` to confirm HEAD; re-apply |
| ERESOLVE on `npm install` | astro-cloudinary peer dep vs Astro 6 | `--legacy-peer-deps` + `.npmrc` |
| `InvalidContentEntryDataError` | Frontmatter from a different site's schema | Match the target collection's schema |
| `Cloudinary breakpoints are missing...` thrown by Picture | Script not run for that public ID | Run step 5; key must match `src` exactly |

## What NOT to copy

- Sharp rebuilds, libvips, libjxl — that is the other (local) JXL route; this pipeline exists to avoid it
- Any `responsive-picture` CSS — the class is just a hook for your own styles
- The old `cloudinary-astro-jxl/` Python flow — retired
