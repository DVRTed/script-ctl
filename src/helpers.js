export function build_raw_url(pagename, oldid) {
  const url = new URL(
    mw.config.get("wgScriptPath") + "/index.php",
    location.origin,
  );
  url.searchParams.set("title", pagename);
  url.searchParams.set("action", "raw");
  url.searchParams.set("ctype", "text/javascript");
  if (oldid) url.searchParams.set("oldid", String(oldid));
  return url.toString();
}

export function fetch_page_info(pagename) {
  return new mw.Api()
    .get({
      action: "query",
      prop: "revisions|info",
      titles: pagename,
      rvprop: "ids",
      rvlimit: 1,
      formatversion: 2,
    })
    .then((data) => {
      const page = data.query.pages[0];

      return {
        exists: !page.missing,
        oldid: page.missing ? null : page.revisions[0].revid,
        normalized_title: page.title,
        content_model: page.contentmodel,
      };
    });
}

export async function fetch_latest_oldid(pagename) {
  try {
    const info = await fetch_page_info(pagename);
    return info.exists ? info.oldid : null;
  } catch (e) {
    return null;
  }
}

export async function fetch_latest_revisions(pagenames) {
  const result = {};
  if (!pagenames.length) return result;

  for (let i = 0; i < pagenames.length; i += 50) {
    const chunk = pagenames.slice(i, i + 50);
    try {
      const data = await new mw.Api().get({
        action: "query",
        prop: "revisions",
        titles: chunk.join("|"),
        rvprop: "ids",
        formatversion: 2,
      });
      for (const page of data.query.pages || []) {
        if (!page.missing && page.revisions?.[0]) {
          result[page.title] = page.revisions[0].revid;
        }
      }
    } catch (e) {
      console.error("Failed to fetch revisions batch", e);
    }
  }
  return result;
}

export function load_script(pagename, oldid) {
  return mw.loader.getScript(build_raw_url(pagename, oldid));
}

export async function search_scripts(query) {
  if (!query || query.length < 3) return [];

  try {
    const res = await new mw.Api().get({
      action: "query",
      list: "search",
      srsearch: `intitle:${query} intitle:.js`,
      srnamespace: "2|4|8",
      srlimit: 10,
      format: "json",
    });

    const results = res?.query?.search || [];
    return results.map((r) => r.title);
  } catch (e) {
    return [];
  }
}

export async function fetch_browse_scripts() {
  try {
    const data = await new mw.Api().get({
      action: "query",
      prop: "revisions",
      revids: "1344349579",
      rvprop: "content",
      rvslots: "main",
      formatversion: 2,
    });
    const page = data.query.pages[0];
    if (page.missing) return [];
    const content = page.revisions[0].slots.main.content;
    const regex = /\{\{user script table row\s*\|([^}]+)\}\}/gi;
    const scripts = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const params = match[1].split("|");
      const script = {};
      for (const p of params) {
        const idx = p.indexOf("=");
        if (idx > -1) {
          script[p.substring(0, idx).trim()] = p.substring(idx + 1).trim();
        }
      }
      if (script.code) {
        const user_match = script.code.match(/^User:([^\/]+)/i);
        scripts.push({
          name: script.name || script.code.split("/").pop(),
          code: script.code,
          desc: script.desc || "",
          doc: script.doc || script.code,
          user: user_match ? user_match[1] : "",
        });
      }
    }
    return scripts;
  } catch (e) {
    return [];
  }
}
