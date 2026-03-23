mw.loader.using([
	"vue",
	"@wikimedia/codex",
	"mediawiki.api",
	"mediawiki.util"
]).then(function() {
	const require = mw.loader.require;
	(function(vue, _wikimedia_codex) {
		//#region src/helpers.js
		function build_raw_url(pagename, oldid) {
			const url = new URL(mw.config.get("wgScriptPath") + "/index.php", location.origin);
			url.searchParams.set("title", pagename);
			url.searchParams.set("action", "raw");
			url.searchParams.set("ctype", "text/javascript");
			if (oldid) url.searchParams.set("oldid", String(oldid));
			return url.toString();
		}
		function fetch_page_info(pagename) {
			return new mw.Api().get({
				action: "query",
				prop: "revisions|info",
				titles: pagename,
				rvprop: "ids",
				rvlimit: 1,
				formatversion: 2
			}).then((data) => {
				const page = data.query.pages[0];
				return {
					exists: !page.missing,
					oldid: page.missing ? null : page.revisions[0].revid,
					normalized_title: page.title,
					content_model: page.contentmodel
				};
			});
		}
		async function fetch_latest_revisions(pagenames) {
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
						formatversion: 2
					});
					for (const page of data.query.pages || []) if (!page.missing && page.revisions?.[0]) result[page.title] = page.revisions[0].revid;
				} catch (e) {
					console.error("Failed to fetch revisions batch", e);
				}
			}
			return result;
		}
		function load_script(pagename, oldid) {
			return mw.loader.getScript(build_raw_url(pagename, oldid));
		}
		async function search_scripts(query) {
			if (!query || query.length < 3) return [];
			try {
				return ((await new mw.Api().get({
					action: "query",
					list: "search",
					srsearch: `intitle:${query} intitle:.js`,
					srnamespace: "2|4|8",
					srlimit: 10,
					format: "json"
				}))?.query?.search || []).map((r) => r.title);
			} catch (e) {
				return [];
			}
		}
		async function fetch_browse_scripts() {
			try {
				const page = (await new mw.Api().get({
					action: "query",
					prop: "revisions",
					revids: "1344349579",
					rvprop: "content",
					rvslots: "main",
					formatversion: 2
				})).query.pages[0];
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
						if (idx > -1) script[p.substring(0, idx).trim()] = p.substring(idx + 1).trim();
					}
					if (script.code) {
						const user_match = script.code.match(/^User:([^\/]+)/i);
						scripts.push({
							name: script.name || script.code.split("/").pop(),
							code: script.code,
							desc: script.desc || "",
							doc: script.doc || script.code,
							user: user_match ? user_match[1] : ""
						});
					}
				}
				return scripts;
			} catch (e) {
				return [];
			}
		}
		//#endregion
		//#region \0plugin-vue:export-helper
		var _plugin_vue_export_helper_default = (sfc, props) => {
			const target = sfc.__vccOpts || sfc;
			for (const [key, val] of props) target[key] = val;
			return target;
		};
		//#endregion
		//#region src/components/InstallForm.vue
		var _hoisted_1$2 = { class: "smgr-install-view" };
		var _hoisted_2$2 = { class: "smgr-header" };
		var _hoisted_3$2 = { class: "smgr-card smgr-install-card" };
		var _hoisted_4$2 = { class: "smgr-install-row" };
		var _hoisted_5$2 = { class: "smgr-card smgr-examples-card" };
		var _hoisted_6$2 = { class: "smgr-examples-title" };
		var _hoisted_7$2 = ["href"];
		var _hoisted_8$1 = {
			key: 0,
			class: "smgr-browse-loading"
		};
		var _hoisted_9$1 = {
			key: 1,
			class: "smgr-browse-list-container"
		};
		var _hoisted_10$1 = { class: "smgr-example-list" };
		var _hoisted_11$1 = { class: "smgr-browse-info" };
		var _hoisted_12 = ["href"];
		var _hoisted_13 = {
			key: 0,
			class: "smgr-browse-author"
		};
		var _hoisted_14 = ["href"];
		var _hoisted_15 = {
			key: 0,
			class: "smgr-browse-desc"
		}, InstallForm_default = /* @__PURE__ */ _plugin_vue_export_helper_default({
			__name: "InstallForm",
			props: { busy: {
				type: Boolean,
				default: false
			} },
			emits: ["install", "cancel"],
			setup(__props, { expose: __expose, emit: __emit }) {
				const props = __props;
				const emit = __emit;
				const install_input = (0, vue.ref)("");
				const selected_script = (0, vue.ref)(null);
				const suggestions = (0, vue.ref)([]);
				const browse_scripts = (0, vue.ref)([]);
				const loading_browse = (0, vue.ref)(false);
				let timeout = null;
				const menu_items = (0, vue.computed)(() => {
					return suggestions.value.map((s) => ({
						value: s,
						label: s
					}));
				});
				const get_url = (pagename) => mw.util.getUrl(pagename);
				(0, vue.onMounted)(async () => {
					loading_browse.value = true;
					browse_scripts.value = await fetch_browse_scripts();
					loading_browse.value = false;
				});
				const on_input = (val) => {
					if (timeout) clearTimeout(timeout);
					if (!val || val.length < 3) {
						suggestions.value = [];
						return;
					}
					timeout = setTimeout(async () => {
						suggestions.value = await search_scripts(val);
					}, 300);
				};
				const submit = () => {
					if (props.busy) return;
					const val = selected_script.value || install_input.value;
					if (val) emit("install", typeof val === "string" ? val : val.value);
				};
				const install_from_list = (name) => {
					if (props.busy) return;
					install_input.value = name;
					emit("install", name);
				};
				__expose({ clear_input: () => {
					install_input.value = "";
					selected_script.value = null;
					suggestions.value = [];
				} });
				return (_ctx, _cache) => {
					return (0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_1$2, [
						(0, vue.createElementVNode)("div", _hoisted_2$2, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxButton), {
							onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("cancel")),
							action: "progressive"
						}, {
							default: (0, vue.withCtx)(() => [..._cache[3] || (_cache[3] = [(0, vue.createTextVNode)(" Back ", -1)])]),
							_: 1
						}), _cache[4] || (_cache[4] = (0, vue.createElementVNode)("h3", null, "Install New Script", -1))]),
						(0, vue.createElementVNode)("div", _hoisted_3$2, [_cache[5] || (_cache[5] = (0, vue.createElementVNode)("label", { class: "smgr-label" }, "Script Page Name", -1)), (0, vue.createElementVNode)("div", _hoisted_4$2, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxLookup), {
							selected: selected_script.value,
							"onUpdate:selected": _cache[1] || (_cache[1] = ($event) => selected_script.value = $event),
							"input-value": install_input.value,
							"onUpdate:inputValue": _cache[2] || (_cache[2] = ($event) => install_input.value = $event),
							placeholder: "User:Foo/bar.js",
							class: "smgr-input",
							"menu-items": menu_items.value,
							onInput: on_input,
							disabled: __props.busy,
							onKeyup: (0, vue.withKeys)(submit, ["enter"])
						}, null, 8, [
							"selected",
							"input-value",
							"menu-items",
							"disabled"
						]), (0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxButton), {
							action: "progressive",
							weight: "primary",
							onClick: submit,
							disabled: __props.busy
						}, {
							default: (0, vue.withCtx)(() => [(0, vue.createTextVNode)((0, vue.toDisplayString)(__props.busy ? "Installing..." : "Install"), 1)]),
							_: 1
						}, 8, ["disabled"])])]),
						(0, vue.createElementVNode)("div", _hoisted_5$2, [(0, vue.createElementVNode)("h4", _hoisted_6$2, [
							_cache[6] || (_cache[6] = (0, vue.createTextVNode)("Browse Scripts (from ", -1)),
							(0, vue.createElementVNode)("a", {
								href: get_url("Wikipedia:User scripts/List"),
								target: "_blank"
							}, "Wikipedia:User scripts/List", 8, _hoisted_7$2),
							_cache[7] || (_cache[7] = (0, vue.createTextVNode)(")", -1))
						]), loading_browse.value ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_8$1, "Loading scripts...")) : ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_9$1, [(0, vue.createElementVNode)("ul", _hoisted_10$1, [((0, vue.openBlock)(true), (0, vue.createElementBlock)(vue.Fragment, null, (0, vue.renderList)(browse_scripts.value, (s) => {
							return (0, vue.openBlock)(), (0, vue.createElementBlock)("li", {
								key: s.code,
								class: "smgr-browse-item"
							}, [(0, vue.createElementVNode)("div", _hoisted_11$1, [(0, vue.createElementVNode)("strong", null, [(0, vue.createElementVNode)("a", {
								href: get_url(s.doc),
								target: "_blank"
							}, (0, vue.toDisplayString)(s.name), 9, _hoisted_12), s.user ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("span", _hoisted_13, [_cache[8] || (_cache[8] = (0, vue.createTextVNode)(" by ", -1)), (0, vue.createElementVNode)("a", {
								href: get_url("User:" + s.user),
								target: "_blank"
							}, (0, vue.toDisplayString)(s.user), 9, _hoisted_14)])) : (0, vue.createCommentVNode)("", true)]), s.desc ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_15, (0, vue.toDisplayString)(s.desc), 1)) : (0, vue.createCommentVNode)("", true)]), (0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxButton), {
								class: "smgr-install-btn",
								onClick: ($event) => install_from_list(s.code)
							}, {
								default: (0, vue.withCtx)(() => [..._cache[9] || (_cache[9] = [(0, vue.createTextVNode)("Install", -1)])]),
								_: 1
							}, 8, ["onClick"])]);
						}), 128))])]))])
					]);
				};
			}
		}, [["__scopeId", "data-v-c9d3050c"]]), M = "<path d=\"M11 9V4H9v5H4v2h5v5h2v-5h5V9z\"/>", g = "<path d=\"M11.53 2.3A1.85 1.85 0 0010 1.21 1.85 1.85 0 008.48 2.3L.36 16.36C-.48 17.81.21 19 1.88 19h16.24c1.67 0 2.36-1.19 1.52-2.64zM11 16H9v-2h2zm0-4H9V6h2z\"/>", D = "<path d=\"M10 1a9 9 0 109 9 9 9 0 00-9-9m5 10H5V9h10z\"/>", v1 = "<path d=\"M7 14.17 2.83 10l-1.41 1.41L7 17 19 5l-1.41-1.42z\"/>", f1 = "<circle cx=\"10\" cy=\"10\" r=\"2\"/><circle cx=\"3\" cy=\"10\" r=\"2\"/><circle cx=\"17\" cy=\"10\" r=\"2\"/>", _2 = "<path d=\"M15.65 4.35A8 8 0 1017.4 13h-2.22a6 6 0 11-1-7.22L11 9h7V2z\"/>", N5 = "<path d=\"M17 2h-3.5l-1-1h-5l-1 1H3v2h14zM4 17a2 2 0 002 2h8a2 2 0 002-2V5H4z\"/>", C3 = M, F3 = g, Y3 = D, n4 = v1, F4 = f1, W7 = _2, y8 = N5;
		//#endregion
		//#region src/components/ScriptList.vue
		var _hoisted_1$1 = { class: "smgr-scripts-view" };
		var _hoisted_2$1 = { class: "smgr-header" };
		var _hoisted_3$1 = {
			key: 0,
			class: "smgr-state"
		};
		var _hoisted_4$1 = {
			key: 1,
			class: "smgr-state smgr-empty"
		};
		var _hoisted_5$1 = {
			key: 2,
			class: "smgr-list"
		};
		var _hoisted_6$1 = { class: "smgr-row-body" };
		var _hoisted_7$1 = { class: "smgr-row-top" };
		var _hoisted_8 = ["href"];
		var _hoisted_9 = {
			key: 0,
			class: "smgr-update-chip"
		};
		var _hoisted_10 = { class: "smgr-meta" };
		var _hoisted_11 = { class: "smgr-row-actions" };
		var ScriptList_default = /* @__PURE__ */ _plugin_vue_export_helper_default({
			__name: "ScriptList",
			props: {
				scripts: {
					type: Array,
					required: true
				},
				updates: {
					type: Array,
					required: true
				},
				timestamps: {
					type: Array,
					default: () => []
				},
				loading: {
					type: Boolean,
					required: true
				},
				busy_idx: {
					type: Number,
					default: null
				}
			},
			emits: [
				"toggle",
				"update",
				"uninstall",
				"add_new"
			],
			setup(__props, { emit: __emit }) {
				const props = __props;
				const emit = __emit;
				function get_menu_items(s, idx) {
					return [
						{
							label: "Update",
							value: "update",
							icon: W7,
							disabled: !props.updates[idx]
						},
						{
							label: s.status === "enabled" ? "Disable" : "Enable",
							value: "toggle",
							icon: s.status === "enabled" ? Y3 : n4
						},
						{
							label: "Remove",
							value: "uninstall",
							icon: y8,
							action: "destructive"
						}
					];
				}
				function on_select(value, idx) {
					if (value === "update") emit("update", idx);
					if (value === "toggle") emit("toggle", {
						idx,
						current_status: props.scripts[idx].status
					});
					if (value === "uninstall") emit("uninstall", idx);
				}
				const get_url = (pagename, oldid) => {
					if (typeof mw === "undefined" || !mw.util) return "#";
					return mw.util.getUrl(pagename, oldid ? { oldid } : {});
				};
				return (_ctx, _cache) => {
					return (0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_1$1, [(0, vue.createElementVNode)("div", _hoisted_2$1, [_cache[2] || (_cache[2] = (0, vue.createElementVNode)("span", { class: "smgr-header-title" }, "Installed scripts", -1)), (0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxButton), {
						action: "progressive",
						weight: "primary",
						onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("add_new"))
					}, {
						default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxIcon), { icon: (0, vue.unref)(C3) }, null, 8, ["icon"]), _cache[1] || (_cache[1] = (0, vue.createTextVNode)(" Add script ", -1))]),
						_: 1
					})]), __props.loading ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_3$1, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxProgressBar), { "aria-label": "Loading scripts..." })])) : !__props.scripts.length ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_4$1, " No scripts installed yet. ")) : ((0, vue.openBlock)(), (0, vue.createElementBlock)("ul", _hoisted_5$1, [((0, vue.openBlock)(true), (0, vue.createElementBlock)(vue.Fragment, null, (0, vue.renderList)(__props.scripts, (s, idx) => {
						return (0, vue.openBlock)(), (0, vue.createElementBlock)("li", {
							key: idx,
							class: (0, vue.normalizeClass)(["smgr-row", s.status === "disabled" && "smgr-row--disabled"])
						}, [
							(0, vue.createElementVNode)("span", { class: (0, vue.normalizeClass)(["smgr-stripe", s.status === "enabled" ? "smgr-stripe--on" : "smgr-stripe--off"]) }, null, 2),
							(0, vue.createElementVNode)("div", _hoisted_6$1, [(0, vue.createElementVNode)("div", _hoisted_7$1, [(0, vue.createElementVNode)("a", {
								href: get_url(s.pagename, s.oldid),
								target: "_blank",
								class: "smgr-pagename"
							}, (0, vue.toDisplayString)(s.pagename), 9, _hoisted_8), __props.updates[idx] ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("span", _hoisted_9, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxIcon), { icon: (0, vue.unref)(F3) }, null, 8, ["icon"]), _cache[3] || (_cache[3] = (0, vue.createTextVNode)(" Update available ", -1))])) : (0, vue.createCommentVNode)("", true)]), (0, vue.createElementVNode)("p", _hoisted_10, [
								(0, vue.createElementVNode)("span", { class: (0, vue.normalizeClass)(["smgr-status-text", s.status === "enabled" ? "smgr-status-text--on" : "smgr-status-text--off"]) }, (0, vue.toDisplayString)(s.status === "enabled" ? "Enabled" : "Disabled"), 3),
								__props.timestamps[idx] ? ((0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, { key: 0 }, [_cache[4] || (_cache[4] = (0, vue.createTextVNode)(" · version dated ", -1)), (0, vue.createElementVNode)("b", null, (0, vue.toDisplayString)(__props.timestamps[idx]), 1)], 64)) : (0, vue.createCommentVNode)("", true),
								s.oldid ? ((0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, { key: 1 }, [(0, vue.createTextVNode)(" (rev " + (0, vue.toDisplayString)(s.oldid) + ")", 1)], 64)) : (0, vue.createCommentVNode)("", true)
							])]),
							(0, vue.createElementVNode)("div", _hoisted_11, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxMenuButton), {
								selected: null,
								"menu-items": get_menu_items(s, idx),
								disabled: __props.busy_idx === idx,
								"aria-label": "Actions for " + s.pagename,
								"onUpdate:selected": ($event) => on_select($event, idx)
							}, {
								default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxIcon), { icon: (0, vue.unref)(F4) }, null, 8, ["icon"])]),
								_: 1
							}, 8, [
								"menu-items",
								"disabled",
								"aria-label",
								"onUpdate:selected"
							])])
						], 2);
					}), 128))]))]);
				};
			}
		}, [["__scopeId", "data-v-e58ee679"]]);
		//#endregion
		//#region src/script_store.js
		var BLOCK_RE = /\/\* scriptmanager:begin !DO NOT EDIT THIS LINE MANUALLY!\*\/([\s\S]*?)\/\* scriptmanager:end !DO NOT EDIT THIS LINE MANUALLY!\*\//;
		var COMMON_JS = "User:" + mw.config.get("wgUserName") + "/common.js";
		var SCRIPT_TAG = " (using [[User:DVRTed/script-ctl.js|script-ctl]])";
		var script_store = {
			async load() {
				const page = (await new mw.Api().get({
					action: "query",
					prop: "revisions",
					titles: COMMON_JS,
					rvprop: "content",
					rvslots: "main",
					formatversion: 2
				})).query.pages[0];
				if (page.missing) return [];
				const match = page.revisions[0].slots.main.content.match(BLOCK_RE);
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
				const page = (await api.get({
					action: "query",
					prop: "revisions",
					titles: COMMON_JS,
					rvprop: "content",
					rvslots: "main",
					formatversion: 2
				})).query.pages[0];
				const old_content = page.missing ? "" : page.revisions[0].slots.main.content;
				const block = `/* scriptmanager:begin !DO NOT EDIT THIS LINE MANUALLY!*/\n// Backlinks: ${list.map((item) => `[[${item.pagename}]]`).join(", ")}\n${JSON.stringify(list, null, "	")}\n/* scriptmanager:end !DO NOT EDIT THIS LINE MANUALLY!*/`;
				const new_content = old_content.match(BLOCK_RE) ? old_content.replace(BLOCK_RE, block) : old_content + (old_content ? "\n\n" : "") + block;
				return api.postWithToken("csrf", {
					action: "edit",
					title: COMMON_JS,
					text: new_content,
					summary: summary + SCRIPT_TAG
				});
			},
			async add(pagename, oldid) {
				const list = await this.load();
				list.push({
					pagename,
					oldid,
					status: "enabled"
				});
				await this.save(list, `Installed [[${pagename}]]`);
			},
			async update(idx, oldid) {
				const list = await this.load();
				const old_oldid = list[idx].oldid;
				list[idx].oldid = oldid;
				await this.save(list, `Updated [[${list[idx].pagename}]] (${old_oldid} -> ${oldid})`);
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
			}
		};
		//#endregion
		//#region src/App.vue
		var _hoisted_1 = { class: "smgr-body" };
		var _hoisted_2 = { key: 1 };
		var _hoisted_3 = { key: 2 };
		var _hoisted_4 = ["href"];
		var _hoisted_5 = { key: 0 };
		var _hoisted_6 = { key: 1 };
		var _hoisted_7 = { style: {
			"display": "flex",
			"gap": "8px",
			"justify-content": "flex-end"
		} };
		var App_default = /* @__PURE__ */ _plugin_vue_export_helper_default({
			__name: "App",
			setup(__props, { expose: __expose }) {
				const is_open = (0, vue.ref)(false);
				const notice = (0, vue.ref)({
					text: "",
					type: "notice"
				});
				const busy_install = (0, vue.ref)(false);
				const show_warning = (0, vue.ref)(false);
				const pending_action = (0, vue.ref)({
					type: "install",
					name: "",
					idx: null,
					oldid: null
				});
				const busy_idx = (0, vue.ref)(null);
				const loading = (0, vue.ref)(false);
				const scripts = (0, vue.ref)([]);
				const updates = (0, vue.ref)([]);
				const timestamps = (0, vue.ref)([]);
				const current_view = (0, vue.ref)("list");
				const install_form_ref = (0, vue.ref)(null);
				const open = () => {
					notice.value = {
						text: "",
						type: "notice"
					};
					is_open.value = true;
					current_view.value = "list";
					if (install_form_ref.value) install_form_ref.value.clear_input();
					render_list();
				};
				__expose({ open });
				const get_url = (pagename) => {
					return mw.util.getUrl(pagename);
				};
				const on_dialog_update = (val) => {
					is_open.value = val;
				};
				const set_notice = (text, type) => {
					notice.value = {
						text,
						type
					};
				};
				const clear_notice = () => {
					set_notice("");
				};
				const check_updates_and_timestamps = async (all_scripts) => {
					console.log(all_scripts);
					const current_scripts = all_scripts.filter((s) => s.status === "enabled");
					if (!current_scripts.length) return;
					updates.value = new Array(current_scripts.length).fill(false);
					timestamps.value = new Array(current_scripts.length).fill(null);
					const oldids = current_scripts.map((s) => s.oldid);
					for (let i = 0; i < oldids.length; i += 50) {
						const chunk = oldids.slice(i, i + 50);
						try {
							const data2 = await new mw.Api().get({
								action: "query",
								prop: "revisions",
								revids: chunk.join("|"),
								rvprop: "timestamp|ids",
								formatversion: 2
							});
							const ts_map = {};
							for (const page of data2.query.pages || []) for (const rev of page.revisions || []) ts_map[rev.revid] = new Date(rev.timestamp).toLocaleDateString(void 0, {
								year: "numeric",
								month: "short",
								day: "numeric"
							});
							for (let idx = 0; idx < current_scripts.length; idx++) if (ts_map[current_scripts[idx].oldid]) timestamps.value[idx] = ts_map[current_scripts[idx].oldid];
						} catch (e) {}
					}
					const pagenames = current_scripts.map((s) => s.pagename);
					try {
						const latest_map = await fetch_latest_revisions(pagenames);
						for (let idx = 0; idx < current_scripts.length; idx++) {
							const s = current_scripts[idx];
							const latest = latest_map[s.pagename];
							if (latest && latest !== s.oldid) updates.value[idx] = true;
						}
					} catch (e) {
						console.error("Failed to check for updates", e);
					}
				};
				const render_list = async () => {
					loading.value = true;
					scripts.value = await script_store.load();
					loading.value = false;
					check_updates_and_timestamps(scripts.value);
				};
				const on_install_requested = async (pagename_input) => {
					const pagename = pagename_input.trim();
					if (!pagename) return set_notice("Enter a page name.", "error");
					busy_install.value = true;
					clear_notice();
					try {
						const info = await fetch_page_info(pagename);
						if (!info.exists) set_notice(`Page not found: ${pagename}`, "error");
						else if (info.content_model !== "javascript") set_notice(`Script must have javascript content model (got: ${info.content_model})`, "error");
						else {
							if ((await script_store.load()).some((s) => s.pagename === info.normalized_title)) return set_notice(`${info.normalized_title} is already installed.`, "warning");
							pending_action.value = {
								type: "install",
								name: info.normalized_title,
								oldid: info.oldid,
								idx: null
							};
							show_warning.value = true;
						}
					} catch {
						set_notice(`Failed to fetch script info for ${pagename}.`, "error");
					} finally {
						busy_install.value = false;
					}
				};
				const confirm_action = async () => {
					if (pending_action.value.type === "install") await perform_install();
					else await perform_update();
				};
				const perform_install = async () => {
					const pagename = pending_action.value.name;
					const oldid = pending_action.value.oldid;
					show_warning.value = false;
					busy_install.value = true;
					clear_notice();
					try {
						await load_script(pagename, oldid);
						await script_store.add(pagename, oldid);
						if (install_form_ref.value) install_form_ref.value.clear_input();
						set_notice(`Installed ${pagename} (oldid ${oldid}).`, "success");
						current_view.value = "list";
						await render_list();
					} catch {
						set_notice(`Failed to install ${pagename}.`, "error");
					} finally {
						busy_install.value = false;
					}
				};
				const on_update = async (idx) => {
					pending_action.value = {
						type: "update",
						name: (await script_store.load())[idx].pagename,
						idx
					};
					show_warning.value = true;
				};
				const perform_update = async () => {
					const idx = pending_action.value.idx;
					show_warning.value = false;
					const script = (await script_store.load())[idx];
					busy_idx.value = idx;
					clear_notice();
					try {
						const info = await fetch_page_info(script.pagename);
						if (!info.exists) set_notice(`Page not found: ${script.pagename}`, "error");
						else if (info.oldid === script.oldid) {
							set_notice(`${script.pagename} is already up to date.`, "notice");
							await render_list();
						} else {
							await load_script(script.pagename, info.oldid);
							await script_store.update(idx, info.oldid);
							set_notice(`Updated ${script.pagename} to the latest version (oldid ${info.oldid}).`, "success");
							await render_list();
						}
					} catch {
						set_notice(`Failed to update ${script.pagename}.`, "error");
					} finally {
						busy_idx.value = null;
					}
				};
				const on_toggle = async (idx, current_status) => {
					const new_status = current_status === "enabled" ? "disabled" : "enabled";
					busy_idx.value = idx;
					clear_notice();
					try {
						await script_store.set_status(idx, new_status);
						await render_list();
					} catch {
						set_notice("Failed to update status.", "error");
					} finally {
						busy_idx.value = null;
					}
				};
				const on_uninstall = async (idx) => {
					busy_idx.value = idx;
					clear_notice();
					try {
						set_notice(`Removed ${(await script_store.remove(idx)).pagename}.`, "warning");
						await render_list();
					} catch {
						set_notice("Failed to remove script.", "error");
					} finally {
						busy_idx.value = null;
					}
				};
				return (_ctx, _cache) => {
					return (0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, null, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxDialog), {
						open: is_open.value,
						"onUpdate:open": [_cache[3] || (_cache[3] = ($event) => is_open.value = $event), on_dialog_update],
						class: "smgr-dialog",
						title: "Script Manager",
						"close-button-label": "Close"
					}, {
						default: (0, vue.withCtx)(() => [(0, vue.createElementVNode)("div", _hoisted_1, [notice.value.text ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", {
							key: 0,
							class: (0, vue.normalizeClass)(["smgr-notice", `smgr-notice--${notice.value.type}`])
						}, (0, vue.toDisplayString)(notice.value.text), 3)) : (0, vue.createCommentVNode)("", true), current_view.value === "install" ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_2, [(0, vue.createVNode)(InstallForm_default, {
							ref_key: "install_form_ref",
							ref: install_form_ref,
							busy: busy_install.value,
							onInstall: on_install_requested,
							onCancel: _cache[0] || (_cache[0] = ($event) => current_view.value = "list")
						}, null, 8, ["busy"])])) : ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_3, [(0, vue.createVNode)(ScriptList_default, {
							scripts: scripts.value,
							updates: updates.value,
							timestamps: timestamps.value,
							loading: loading.value,
							busy_idx: busy_idx.value,
							onToggle: _cache[1] || (_cache[1] = ($event) => on_toggle($event.idx, $event.current_status)),
							onUpdate: on_update,
							onUninstall: on_uninstall,
							onAdd_new: _cache[2] || (_cache[2] = ($event) => current_view.value = "install")
						}, null, 8, [
							"scripts",
							"updates",
							"timestamps",
							"loading",
							"busy_idx"
						])]))])]),
						_: 1
					}, 8, ["open"]), (0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxDialog), {
						open: show_warning.value,
						"onUpdate:open": [_cache[5] || (_cache[5] = ($event) => show_warning.value = $event), _cache[6] || (_cache[6] = ($event) => show_warning.value = $event)],
						title: "Security Warning",
						"close-button-label": "Cancel",
						"use-close-button": true
					}, {
						footer: (0, vue.withCtx)(() => [(0, vue.createElementVNode)("div", _hoisted_7, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxButton), { onClick: _cache[4] || (_cache[4] = ($event) => show_warning.value = false) }, {
							default: (0, vue.withCtx)(() => [..._cache[13] || (_cache[13] = [(0, vue.createTextVNode)("Cancel", -1)])]),
							_: 1
						}), (0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxButton), {
							action: "destructive",
							weight: "primary",
							onClick: confirm_action,
							disabled: busy_install.value
						}, {
							default: (0, vue.withCtx)(() => [(0, vue.createTextVNode)((0, vue.toDisplayString)(pending_action.value.type === "install" ? "I Understand, Install" : "I Understand, Update"), 1)]),
							_: 1
						}, 8, ["disabled"])])]),
						default: (0, vue.withCtx)(() => [(0, vue.createElementVNode)("p", null, [
							_cache[7] || (_cache[7] = (0, vue.createElementVNode)("strong", null, "WARNING:", -1)),
							_cache[8] || (_cache[8] = (0, vue.createTextVNode)(" Userscripts could contain malicious content capable of compromising your account. You are encouraged to review the source code of the script before installing it: ", -1)),
							(0, vue.createElementVNode)("a", {
								href: get_url(pending_action.value.name),
								target: "_blank"
							}, [(0, vue.createElementVNode)("strong", null, (0, vue.toDisplayString)(pending_action.value.name), 1)], 8, _hoisted_4)
						]), pending_action.value.type === "install" ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("p", _hoisted_5, [
							_cache[9] || (_cache[9] = (0, vue.createTextVNode)(" Are you absolutely sure you want to install and trust ", -1)),
							(0, vue.createElementVNode)("code", null, (0, vue.toDisplayString)(pending_action.value.name), 1),
							_cache[10] || (_cache[10] = (0, vue.createTextVNode)("? ", -1))
						])) : ((0, vue.openBlock)(), (0, vue.createElementBlock)("p", _hoisted_6, [
							_cache[11] || (_cache[11] = (0, vue.createTextVNode)(" Are you absolutely sure you want to update and trust the new version of ", -1)),
							(0, vue.createElementVNode)("code", null, (0, vue.toDisplayString)(pending_action.value.name), 1),
							_cache[12] || (_cache[12] = (0, vue.createTextVNode)("? ", -1))
						]))]),
						_: 1
					}, 8, ["open"])], 64);
				};
			}
		}, [["__scopeId", "data-v-16e71b71"]]);
		//#endregion
		//#region src/init.js
		async function init() {
			(await script_store.load()).filter((s) => s.status === "enabled").forEach((s) => load_script(s.pagename, s.oldid));
			let app_instance = null;
			const link = mw.util.addPortletLink("p-personal", "#", "Script Manager", "pt-scriptmanager", "Install and manage userscripts");
			if (!link) return;
			link.addEventListener("click", (e) => {
				e.preventDefault();
				if (!app_instance) {
					const app_mount = document.createElement("div");
					app_mount.id = "script-manager-vue-root";
					document.body.appendChild(app_mount);
					app_instance = (0, vue.createApp)(App_default).mount(app_mount);
				}
				if (app_instance && typeof app_instance.open === "function") app_instance.open();
			});
		}
		init();
		//#endregion
	})(require("vue"), require("@wikimedia/codex"));
});
(function() {
	//#region \0vite/all-css
	try {
		if (typeof document != "undefined") {
			var elementStyle = document.createElement("style");
			elementStyle.appendChild(document.createTextNode(".smgr-install-view[data-v-c9d3050c] {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.smgr-header[data-v-c9d3050c] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  border-bottom: 1px solid #eaecf0;\n  padding-bottom: 12px;\n}\n.smgr-header h3[data-v-c9d3050c] {\n  margin: 0;\n  padding: 0;\n  font-size: 1.2em;\n  font-weight: bold;\n}\n.smgr-card[data-v-c9d3050c] {\n  background: #fff;\n  border: 1px solid #c8ccd1;\n  border-radius: 4px;\n  padding: 16px;\n}\n.skin-theme-clientpref-night .smgr-card[data-v-c9d3050c] {\n  background: #202122;\n  border-color: #54595d;\n}\n.smgr-install-card[data-v-c9d3050c] {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.smgr-label[data-v-c9d3050c] {\n  font-weight: bold;\n  font-size: 0.9em;\n}\n.smgr-install-row[data-v-c9d3050c] {\n  display: flex;\n  gap: 10px;\n}\n.smgr-input[data-v-c9d3050c] {\n  flex: 1;\n}\n.smgr-examples-card[data-v-c9d3050c] {\n  background: #f8f9fa;\n  border-color: #eaecf0;\n  display: flex;\n  flex-direction: column;\n}\n.skin-theme-clientpref-night .smgr-examples-card[data-v-c9d3050c] {\n  background: #202122;\n  border-color: #54595d;\n}\n.smgr-examples-title[data-v-c9d3050c] {\n  margin: 0 0 10px 0;\n  font-size: 0.95em;\n}\n.smgr-browse-loading[data-v-c9d3050c] {\n  font-size: 0.9em;\n  color: #72777d;\n  font-style: italic;\n  padding: 10px 0;\n}\n.smgr-browse-list-container[data-v-c9d3050c] {\n  height: 250px;\n  overflow-y: auto;\n  border: 1px solid #eaecf0;\n  border-radius: 4px;\n  background: #fff;\n}\n.skin-theme-clientpref-night .smgr-browse-list-container[data-v-c9d3050c] {\n  background: #141414;\n  border-color: #54595d;\n}\n.smgr-example-list[data-v-c9d3050c] {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: flex;\n  flex-direction: column;\n}\n.smgr-browse-item[data-v-c9d3050c] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 10px 12px;\n  border-bottom: 1px solid #eaecf0;\n  gap: 12px;\n}\n.smgr-browse-item[data-v-c9d3050c]:last-child {\n  border-bottom: none;\n}\n.smgr-browse-item[data-v-c9d3050c]:hover {\n  background: #f8f9fa;\n}\n.skin-theme-clientpref-night .smgr-browse-item[data-v-c9d3050c]:hover {\n  background: #1a1a1a;\n}\n.smgr-browse-info[data-v-c9d3050c] {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  min-width: 0;\n}\n.smgr-browse-info strong[data-v-c9d3050c] {\n  font-size: 0.95em;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.smgr-browse-info strong a[data-v-c9d3050c] {\n  color: #0645ad;\n  text-decoration: none;\n}\n.skin-theme-clientpref-night .smgr-browse-info strong a[data-v-c9d3050c] {\n  color: #4e94ce;\n}\n.smgr-browse-info strong a[data-v-c9d3050c]:hover {\n  text-decoration: underline;\n}\n.smgr-browse-author[data-v-c9d3050c] {\n  font-size: 0.9em;\n  font-weight: normal;\n}\n.smgr-browse-desc[data-v-c9d3050c] {\n  font-size: 0.85em;\n  line-height: 1.3;\n}\n.smgr-install-btn[data-v-c9d3050c] {\n  flex-shrink: 0;\n}\n\n.smgr-scripts-view[data-v-e58ee679] {\r\n  display: flex;\r\n  flex-direction: column;\r\n  gap: 0;\n}\n.smgr-header[data-v-e58ee679] {\r\n  display: flex;\r\n  justify-content: space-between;\r\n  align-items: center;\r\n  padding-bottom: 12px;\r\n  margin-bottom: 4px;\r\n  border-bottom: 1px solid #eaecf0;\n}\n.smgr-header-title[data-v-e58ee679] {\r\n  font-size: 1em;\r\n  font-weight: 600;\n}\n.smgr-state[data-v-e58ee679] {\r\n  padding: 24px 0;\r\n  text-align: center;\n}\n.smgr-empty[data-v-e58ee679] {\r\n  color: #72777d;\r\n  font-size: 0.9em;\r\n  font-style: italic;\n}\n.smgr-list[data-v-e58ee679] {\r\n  list-style: none;\r\n  margin: 0;\r\n  padding: 0;\r\n  display: flex;\r\n  flex-direction: column;\n}\n.smgr-row[data-v-e58ee679] {\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 12px;\r\n  padding: 10px 12px 10px 0;\r\n  border-bottom: 1px solid #eaecf0;\r\n  transition: background 0.1s ease;\n}\n.smgr-row[data-v-e58ee679]:last-child {\r\n  border-bottom: none;\n}\n.smgr-row[data-v-e58ee679]:hover {\r\n  background: #f8f9fa;\n}\n.skin-theme-clientpref-night .smgr-row[data-v-e58ee679]:hover {\r\n  background: #1a1a1a;\n}\n.smgr-row--disabled .smgr-row-body[data-v-e58ee679] {\r\n  opacity: 0.45;\n}\n.smgr-stripe[data-v-e58ee679] {\r\n  flex-shrink: 0;\r\n  width: 3px;\r\n  align-self: stretch;\r\n  border-radius: 0 2px 2px 0;\n}\n.smgr-stripe--on[data-v-e58ee679] {\r\n  background: #14866d;\n}\n.smgr-stripe--off[data-v-e58ee679] {\r\n  background: #c8ccd1;\n}\n.smgr-row-body[data-v-e58ee679] {\r\n  flex: 1;\r\n  min-width: 0;\r\n  display: flex;\r\n  flex-direction: column;\r\n  gap: 2px;\n}\n.smgr-row-top[data-v-e58ee679] {\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 8px;\r\n  flex-wrap: wrap;\n}\n.smgr-pagename[data-v-e58ee679] {\r\n  font-size: 0.95em;\r\n  font-weight: 600;\r\n  color: #0645ad;\r\n  text-decoration: none;\r\n  overflow-wrap: anywhere;\n}\n.smgr-pagename[data-v-e58ee679]:hover {\r\n  text-decoration: underline;\n}\n.smgr-meta[data-v-e58ee679] {\r\n  margin: 0;\r\n  font-size: 0.78em;\r\n  color: #72777d;\r\n  letter-spacing: 0.01em;\n}\n.smgr-status-text[data-v-e58ee679] {\r\n  font-weight: 600;\n}\n.smgr-status-text--on[data-v-e58ee679] {\r\n  color: #14866d;\n}\n.smgr-status-text--off[data-v-e58ee679] {\r\n  color: #72777d;\n}\n.smgr-update-chip[data-v-e58ee679] {\r\n  display: inline-flex;\r\n  align-items: center;\r\n  gap: 3px;\r\n  font-size: 0.72em;\r\n  font-weight: 600;\r\n  color: #3366cc;\r\n  background: #eaf3fb;\r\n  padding: 1px 6px;\r\n  border-radius: 3px;\r\n  white-space: nowrap;\n}\n.smgr-update-chip .cdx-icon[data-v-e58ee679] {\r\n  width: 12px;\r\n  height: 12px;\n}\n.smgr-row-actions[data-v-e58ee679] {\r\n  flex-shrink: 0;\n}\r\n\n.smgr-body[data-v-16e71b71] {\r\n  display: flex;\r\n  flex-direction: column;\r\n  gap: 20px;\r\n  min-height: 500px;\n}\n.smgr-notice[data-v-16e71b71] {\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 8px;\r\n  padding: 10px 14px;\r\n  border-radius: 4px;\r\n  border-left: 4px solid;\r\n  font-size: 0.9rem;\r\n  font-weight: 500;\n}\n.smgr-notice--success[data-v-16e71b71] {\r\n  background: #f0fdf4;\r\n  border-color: #22c55e;\r\n  color: #15803d;\n}\n.smgr-notice--error[data-v-16e71b71] {\r\n  background: #fef2f2;\r\n  border-color: #ef4444;\r\n  color: #b91c1c;\n}\n.smgr-notice--warning[data-v-16e71b71] {\r\n  background: #fffbeb;\r\n  border-color: #f59e0b;\r\n  color: #b45309;\n}\n.smgr-notice--notice[data-v-16e71b71] {\r\n  background: #eff6ff;\r\n  border-color: #3b82f6;\r\n  color: #1d4ed8;\n}\r\n\n.smgr-dialog.cdx-dialog__window,\r\n.smgr-dialog .cdx-dialog__window,\r\n.smgr-dialog {\r\n  width: 800px !important;\r\n  max-width: 90vw !important;\n}\r\n/*$vite$:1*/"));
			document.head.appendChild(elementStyle);
		}
	} catch (e) {
		console.error("vite-plugin-css-injected-by-js", e);
	}
	//#endregion
})();
