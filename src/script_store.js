const BLOCK_START = "/* scriptmanager:begin !DO NOT EDIT THIS LINE MANUALLY!*/";
const BLOCK_END = "/* scriptmanager:end !DO NOT EDIT THIS LINE MANUALLY!*/";
const BLOCK_RE =
  /\/\* scriptmanager:begin !DO NOT EDIT THIS LINE MANUALLY!\*\/([\s\S]*?)\/\* scriptmanager:end !DO NOT EDIT THIS LINE MANUALLY!\*\//;
const COMMON_JS = "User:" + mw.config.get("wgUserName") + "/common.js";
const SCRIPT_TAG = " (using [[User:DVRTed/script-ctl.js|script-ctl]])";

export const script_store = {
  async load() {
    const data = await new mw.Api().get({
      action: "query",
      prop: "revisions",
      titles: COMMON_JS,
      rvprop: "content",
      rvslots: "main",
      formatversion: 2,
    });
    const page = data.query.pages[0];
    if (page.missing) return [];
    const content = page.revisions[0].slots.main.content;
    const match = content.match(BLOCK_RE);
    if (!match) return [];
    try {
      const match_without_comments = match[1].replace(/^\s*\/\/.*$/gm, "");
      return JSON.parse(match_without_comments.trim());
    } catch {
      return [];
    }
  },

  async save(list, summary = "Updated script list") {
    const api = new mw.Api();
    const data = await api.get({
      action: "query",
      prop: "revisions",
      titles: COMMON_JS,
      rvprop: "content",
      rvslots: "main",
      formatversion: 2,
    });
    const page = data.query.pages[0];
    const old_content = page.missing
      ? ""
      : page.revisions[0].slots.main.content;

    const items = list
      .map((item) => {
        return `\t// backlink: [[${item.pagename}]]\n\t${JSON.stringify(item)}`;
      })
      .join(",\n\n");
    const block = BLOCK_START + `\n[\n${items}\n]\n` + BLOCK_END;
    const new_content = old_content.match(BLOCK_RE)
      ? old_content.replace(BLOCK_RE, block)
      : old_content + (old_content ? "\n\n" : "") + block;

    return api.postWithToken("csrf", {
      action: "edit",
      title: COMMON_JS,
      text: new_content,
      summary: summary + SCRIPT_TAG,
    });
  },

  async add(pagename, oldid) {
    const list = await this.load();
    list.push({ pagename, oldid, status: "enabled" });
    await this.save(list, `Installed [[${pagename}]]`);
  },

  async update(idx, oldid) {
    const list = await this.load();
    const old_oldid = list[idx].oldid;
    list[idx].oldid = oldid;
    await this.save(
      list,
      `Updated [[${list[idx].pagename}]] (${old_oldid} -> ${oldid})`,
    );
  },

  async remove(idx) {
    const list = await this.load();
    const removed = list.splice(idx, 1)[0];
    await this.save(list, `Removed [[${removed.pagename}]]`);
    return removed;
  },

  async set_status(idx, status) {
    const list = await this.load();
    list[idx].status = status;
    const action = status === "enabled" ? "Enabled" : "Disabled";
    await this.save(list, `${action} [[${list[idx].pagename}]]`);
  },
};
