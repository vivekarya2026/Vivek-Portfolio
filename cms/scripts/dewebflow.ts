/**
 * dewebflow.ts — strip Webflow branding / CDN hosting while keeping the
 * original interaction runtime (jQuery + webflow.js) so animations stay intact.
 *
 * Does:
 *   - Repoint shared CSS + favicons to local assets/
 *   - Repoint jQuery + webflow.js chunks to local assets/vendor/
 *   - Drop the Webflow CDN preconnect
 *   - Strip branding/tracking (comments, generator meta, badge style,
 *     data-wf-domain, "Made with ❤️ on webflow" credit, *.webflow.io links)
 *
 * Does NOT:
 *   - Rename w-* classes (webflow.js + IX2 need them)
 *   - Remove the jQuery / webflow.js runtime
 *   - Remove the w-mod-js bootstrap or IX2 hidden-state styles
 *   - Strip data-wf-page / data-wf-site / data-wf-status / data-wf-collection
 *     (IX2 needs these or animated elements stay stuck at opacity:0)
 *
 * Usage:  npx tsx scripts/dewebflow.ts
 * Safe to re-run.
 */
import {
  readFile,
  writeFile,
  readdir,
  copyFile,
  access,
} from "node:fs/promises";
import { join } from "node:path";

const EXPORT_DIR =
  process.env.WEBFLOW_EXPORT_DIR ?? join(process.cwd(), "..", "site");
const PROJECTS_DIR = join(EXPORT_DIR, "projects");

function stripBranding(html: string): string {
  let out = html;
  out = out.replace(
    /<!--\s*This site was created in Webflow\.[^>]*-->/gi,
    "",
  );
  out = out.replace(/<!--\s*Last Published:[^>]*-->/gi, "");
  out = out.replace(
    /<meta[^>]*name="generator"[^>]*content="Webflow"[^>]*\/?>/gi,
    "",
  );
  out = out.replace(
    /<meta[^>]*content="Webflow"[^>]*name="generator"[^>]*\/?>/gi,
    "",
  );
  out = out.replace(/<style>\s*\.w-webflow-badge[^<]*<\/style>/gi, "");
  // Preserve CMS slug hook; keep page/site/status/collection for IX2.
  out = out.replace(/data-wf-item-slug=/gi, "data-item-slug=");
  out = out.replace(/\sdata-wf-domain="[^"]*"/gi, "");
  out = out.replace(
    /Made with ❤️ on webflow/gi,
    "Made with ❤️ by Vivek Arya",
  );
  out = out.replace(/https:\/\/[a-z0-9-]+\.webflow\.io\/[^"']*/gi, "#");
  return out;
}

function localizeAssets(html: string, assetsPrefix: string): string {
  let out = html;
  // CDN preconnect
  out = out.replace(
    /<link[^>]*rel="preconnect"[^>]*href="https:\/\/cdn\.prod\.website-files\.com"[^>]*\/?>/gi,
    "",
  );
  out = out.replace(
    /<link[^>]*href="https:\/\/cdn\.prod\.website-files\.com"[^>]*rel="preconnect"[^>]*\/?>/gi,
    "",
  );
  // Shared CSS
  out = out.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/[A-Za-z0-9]+\/css\/arya-vivek\.webflow\.shared\.[a-z0-9]+\.css/gi,
    `${assetsPrefix}/site.css`,
  );
  // Favicons
  out = out.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/[A-Za-z0-9]+\/[A-Za-z0-9]+_Frame%206\.png/gi,
    `${assetsPrefix}/favicon.png`,
  );
  out = out.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/[A-Za-z0-9]+\/[A-Za-z0-9]+_Frame%207\.png/gi,
    `${assetsPrefix}/apple-touch-icon.png`,
  );
  // jQuery (CloudFront) → local vendor
  out = out.replace(
    /https:\/\/d3e54v103j8qbb\.cloudfront\.net\/js\/jquery-3\.5\.1\.min[^"]*/gi,
    `${assetsPrefix}/vendor/jquery-3.5.1.min.js`,
  );
  // webflow.js chunks → local vendor (preserve filename)
  out = out.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/[A-Za-z0-9]+\/js\/(webflow\.[^"]+)/gi,
    `${assetsPrefix}/vendor/$1`,
  );
  return out;
}

async function transform(file: string, assetsPrefix: string) {
  let html = await readFile(file, "utf8");

  const bak = `${file}.dewf.bak`;
  try {
    await access(bak);
  } catch {
    await copyFile(file, bak);
  }

  html = localizeAssets(html, assetsPrefix);
  html = stripBranding(html);

  // Ensure site.js loads after the Webflow runtime (IX2 scroll-into-view kick).
  html = html.replace(
    /\s*<script src="(?:\.\.\/)?assets\/site\.js"><\/script>/gi,
    "",
  );
  if (!html.includes(`${assetsPrefix}/site.js`)) {
    html = html.replace(
      /(<\/body>)/i,
      `  <script src="${assetsPrefix}/site.js"></script>\n$1`,
    );
  }

  // Keep the Webflow badge hidden on self-hosted pages.
  if (!html.includes(".w-webflow-badge")) {
    html = html.replace(
      /<\/head>/i,
      `<style>.w-webflow-badge{position:fixed!important;display:none!important;visibility:hidden!important;}</style>\n</head>`,
    );
  }

  await writeFile(file, html, "utf8");
  console.log(`  ✓ ${file.replace(EXPORT_DIR, ".")}`);
}

async function restoreCssFromBak() {
  const cssFile = join(EXPORT_DIR, "assets", "site.css");
  const bak = `${cssFile}.dewf.bak`;
  try {
    await access(bak);
  } catch {
    console.warn("  ! no site.css.dewf.bak — leaving CSS as-is");
    return;
  }
  // Restore pre-rename CSS (local fonts + original w-* selectors), then
  // strip the temporary reveal block that fought with webflow.js IX2.
  let css = await readFile(bak, "utf8");
  if (css.startsWith("/* ── De-Webflow reveal runtime")) {
    const htmlIdx = css.indexOf("\nhtml {");
    if (htmlIdx !== -1) css = css.slice(htmlIdx + 1);
  }
  // Recover from a previous bad strip that left a dangling `}`.
  css = css.replace(/^}\s*\n+/, "");
  await writeFile(cssFile, css, "utf8");
  console.log("  ✓ assets/site.css (restored w-* selectors, reveal CSS removed)");
}

async function main() {
  console.log("De-Webflowing (branding/CDN only — animations kept)…\n");

  await restoreCssFromBak();

  // Prefer the pre-dewebflow HTML backups when present so we get back the
  // original w-* classes, bootstrap, IX2 styles, and script tags.
  const rootPages = ["index.html", "about.html", "contact.html", "works.html"];
  for (const p of rootPages) {
    const live = join(EXPORT_DIR, p);
    const bak = `${live}.dewf.bak`;
    try {
      await access(bak);
      await copyFile(bak, live);
    } catch {
      // no bak — transform whatever is live
    }
    await transform(live, "assets");
  }

  const projectFiles = (await readdir(PROJECTS_DIR)).filter((f) =>
    f.endsWith(".html"),
  );
  for (const f of projectFiles) {
    const live = join(PROJECTS_DIR, f);
    const bak = `${live}.dewf.bak`;
    try {
      await access(bak);
      await copyFile(bak, live);
    } catch {
      // no bak
    }
    await transform(live, "../assets");
  }

  console.log("\nDone. Branding/CDN removed; jQuery + webflow.js kept locally.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
