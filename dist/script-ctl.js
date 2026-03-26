mw.loader.using([
	"vue",
	"@wikimedia/codex",
	"mediawiki.api",
	"mediawiki.util"
]).then(function() {
	const require = mw.loader.require;
	(function(vue, _wikimedia_codex) {
		//#region node_modules/@wikimedia/codex-icons/dist/codex-icons.js
		var M = "<path d=\"M11 9V4H9v5H4v2h5v5h2v-5h5V9z\"/>", g = "<path d=\"M11.53 2.3A1.85 1.85 0 0010 1.21 1.85 1.85 0 008.48 2.3L.36 16.36C-.48 17.81.21 19 1.88 19h16.24c1.67 0 2.36-1.19 1.52-2.64zM11 16H9v-2h2zm0-4H9V6h2z\"/>", D = "<path d=\"M10 1a9 9 0 109 9 9 9 0 00-9-9m5 10H5V9h10z\"/>", v1 = "<path d=\"M7 14.17 2.83 10l-1.41 1.41L7 17 19 5l-1.41-1.42z\"/>", f1 = "<circle cx=\"10\" cy=\"10\" r=\"2\"/><circle cx=\"3\" cy=\"10\" r=\"2\"/><circle cx=\"17\" cy=\"10\" r=\"2\"/>", W2 = "<path d=\"m4 10 9 9 1.4-1.5L7 10l7.4-7.5L13 1z\"/>", _2 = "<path d=\"M15.65 4.35A8 8 0 1017.4 13h-2.22a6 6 0 11-1-7.22L11 9h7V2z\"/>", t5 = "<path d=\"M12.2 13.6a7 7 0 111.4-1.4l5.4 5.4-1.4 1.4zM3 8a5 5 0 1010 0A5 5 0 003 8\"/>", N5 = "<path d=\"M17 2h-3.5l-1-1h-5l-1 1H3v2h14zM4 17a2 2 0 002 2h8a2 2 0 002-2V5H4z\"/>", C3 = M, F3 = g, Y3 = D, n4 = v1, F4 = f1, C7 = {
			ltr: W2,
			shouldFlip: !0
		}, W7 = _2, P7 = t5, y8 = N5;
		//#endregion
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
		var _hoisted_2$2 = { class: "smgr-card smgr-install-card" };
		var _hoisted_3$2 = { class: "smgr-install-row" };
		var _hoisted_4$2 = { class: "smgr-browse-footer" };
		var InstallForm_default = /* @__PURE__ */ _plugin_vue_export_helper_default({
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
				let timeout = null;
				const menu_items = (0, vue.computed)(() => {
					return suggestions.value.map((s) => ({
						value: s,
						label: s
					}));
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
				const open_browse = () => {
					window.open(mw.util.getUrl("Wikipedia:User scripts/List"), "_blank");
				};
				__expose({
					clear_input: () => {
						install_input.value = "";
						selected_script.value = null;
						suggestions.value = [];
					},
					set_input: (val) => {
						install_input.value = val;
						selected_script.value = null;
					}
				});
				return (_ctx, _cache) => {
					return (0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_1$2, [(0, vue.createElementVNode)("div", _hoisted_2$2, [
						_cache[3] || (_cache[3] = (0, vue.createElementVNode)("label", { class: "smgr-label" }, "Script Page Name", -1)),
						(0, vue.createElementVNode)("div", _hoisted_3$2, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxLookup), {
							selected: selected_script.value,
							"onUpdate:selected": _cache[0] || (_cache[0] = ($event) => selected_script.value = $event),
							"input-value": install_input.value,
							"onUpdate:inputValue": _cache[1] || (_cache[1] = ($event) => install_input.value = $event),
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
						}, 8, ["disabled"])]),
						(0, vue.createElementVNode)("div", _hoisted_4$2, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxButton), {
							weight: "quiet",
							action: "progressive",
							onClick: open_browse
						}, {
							default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxIcon), { icon: (0, vue.unref)(P7) }, null, 8, ["icon"]), _cache[2] || (_cache[2] = (0, vue.createTextVNode)("Browse community userscripts ", -1))]),
							_: 1
						})])
					])]);
				};
			}
		}, [["__scopeId", "data-v-c419cbd9"]]);
		//#endregion
		//#region src/components/ScriptList.vue
		var _hoisted_1$1 = { class: "smgr-scripts-view" };
		var _hoisted_2$1 = {
			key: 0,
			class: "smgr-state"
		};
		var _hoisted_3$1 = ["href"];
		var _hoisted_4$1 = {
			key: 0,
			class: "smgr-update-chip"
		};
		var _hoisted_5$1 = {
			key: 1,
			style: { "color": "#72777d" }
		};
		var _hoisted_6$1 = {
			key: 2,
			class: "smgr-state"
		};
		var ScriptList_default = /* @__PURE__ */ _plugin_vue_export_helper_default({
			__name: "ScriptList",
			props: {
				scripts: {
					type: Array,
					required: true
				},
				updates: {
					type: Object,
					required: true
				},
				timestamps: {
					type: Object,
					default: () => ({})
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
				const columns = [
					{
						id: "script",
						label: "Script"
					},
					{
						id: "status",
						label: "Status"
					},
					{
						id: "version",
						label: "Version"
					},
					{
						id: "actions",
						label: "Action",
						align: "end"
					}
				];
				const tableData = (0, vue.computed)(() => props.scripts.map((s, idx) => ({
					...s,
					_idx: idx
				})));
				function get_menu_items(row) {
					return [
						{
							label: "Update",
							value: "update",
							icon: W7,
							disabled: !props.updates[row.pagename]
						},
						{
							label: row.status === "enabled" ? "Disable" : "Enable",
							value: "toggle",
							icon: row.status === "enabled" ? Y3 : n4
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
					return (0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_1$1, [__props.loading ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_2$1, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxProgressBar), { "aria-label": "Loading scripts..." })])) : ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(_wikimedia_codex.CdxTable), {
						key: 1,
						caption: "Installed scripts",
						columns,
						data: tableData.value
					}, {
						"item-script": (0, vue.withCtx)(({ row }) => [(0, vue.createElementVNode)("div", { class: (0, vue.normalizeClass)(["smgr-script-cell", { "smgr-dimmed": row.status === "disabled" }]) }, [
							(0, vue.createElementVNode)("span", { class: (0, vue.normalizeClass)(["smgr-stripe", row.status === "enabled" ? "smgr-stripe--on" : "smgr-stripe--off"]) }, null, 2),
							(0, vue.createElementVNode)("a", {
								href: get_url(row.pagename, row.oldid),
								target: "_blank",
								class: "smgr-pagename"
							}, (0, vue.toDisplayString)(row.pagename), 9, _hoisted_3$1),
							__props.updates[row.pagename] ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("span", _hoisted_4$1, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxIcon), { icon: (0, vue.unref)(F3) }, null, 8, ["icon"]), _cache[0] || (_cache[0] = (0, vue.createTextVNode)(" Update available ", -1))])) : (0, vue.createCommentVNode)("", true)
						], 2)]),
						"item-status": (0, vue.withCtx)(({ row }) => [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxInfoChip), { status: row.status === "enabled" ? "success" : "warning" }, {
							default: (0, vue.withCtx)(() => [(0, vue.createTextVNode)((0, vue.toDisplayString)(row.status === "enabled" ? "Enabled" : "Disabled"), 1)]),
							_: 2
						}, 1032, ["status"])]),
						"item-version": (0, vue.withCtx)(({ row }) => [__props.timestamps[row.pagename] ? ((0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, { key: 0 }, [(0, vue.createTextVNode)((0, vue.toDisplayString)(__props.timestamps[row.pagename]), 1), row.oldid ? ((0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, { key: 0 }, [(0, vue.createTextVNode)(" (rev " + (0, vue.toDisplayString)(row.oldid) + ")", 1)], 64)) : (0, vue.createCommentVNode)("", true)], 64)) : ((0, vue.openBlock)(), (0, vue.createElementBlock)("span", _hoisted_5$1, "—"))]),
						"item-actions": (0, vue.withCtx)(({ row }) => [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxMenuButton), {
							selected: null,
							"menu-items": get_menu_items(row),
							disabled: __props.busy_idx === row._idx,
							"aria-label": "Actions for " + row.pagename,
							"onUpdate:selected": ($event) => on_select($event, row._idx)
						}, {
							default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxIcon), { icon: (0, vue.unref)(F4) }, null, 8, ["icon"])]),
							_: 1
						}, 8, [
							"menu-items",
							"disabled",
							"aria-label",
							"onUpdate:selected"
						])]),
						_: 1
					}, 8, ["data"])), !__props.loading && !__props.scripts.length ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_6$1, " No scripts installed yet. ")) : (0, vue.createCommentVNode)("", true)]);
				};
			}
		}, [["__scopeId", "data-v-1b27191a"]]);
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
		var _hoisted_1 = {
			key: 0,
			class: "smgr-header-nav"
		};
		var _hoisted_2 = {
			key: 1,
			class: "smgr-header-text"
		};
		var _hoisted_3 = { class: "smgr-body" };
		var _hoisted_4 = { key: 1 };
		var _hoisted_5 = { key: 2 };
		var _hoisted_6 = ["href"];
		var _hoisted_7 = { key: 0 };
		var _hoisted_8 = { key: 1 };
		var _hoisted_9 = { style: {
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
				const updates = (0, vue.ref)({});
				const timestamps = (0, vue.ref)({});
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
				const open_install = async (pagename) => {
					notice.value = {
						text: "",
						type: "notice"
					};
					is_open.value = true;
					current_view.value = "install";
					if (pagename) {
						on_install_requested(pagename);
						await (0, vue.nextTick)();
						if (install_form_ref.value) install_form_ref.value.set_input(pagename);
					}
					render_list();
				};
				__expose({
					open,
					open_install
				});
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
					const current_scripts = all_scripts.filter((s) => s.status === "enabled");
					if (!current_scripts.length) return;
					const new_updates = {};
					const new_timestamps = {};
					const oldids = current_scripts.map((s) => s.oldid).filter((id) => id);
					if (oldids.length > 0) for (let i = 0; i < oldids.length; i += 50) {
						const chunk = oldids.slice(i, i + 50);
						try {
							const data2 = await new mw.Api().get({
								action: "query",
								prop: "revisions",
								revids: chunk.join("|"),
								rvprop: "timestamp|ids",
								formatversion: 2
							});
							for (const page of data2.query.pages || []) for (const rev of page.revisions || []) {
								const ts = new Date(rev.timestamp).toLocaleDateString(void 0, {
									year: "numeric",
									month: "short",
									day: "numeric"
								});
								const script = current_scripts.find((s) => s.oldid === rev.revid);
								if (script) new_timestamps[script.pagename] = ts;
							}
						} catch (e) {}
					}
					const pagenames = current_scripts.map((s) => s.pagename);
					try {
						const latest_map = await fetch_latest_revisions(pagenames);
						for (const s of current_scripts) {
							const latest = latest_map[s.pagename];
							if (latest && latest !== s.oldid) new_updates[s.pagename] = true;
						}
					} catch (e) {
						console.error("Failed to check for updates", e);
					}
					updates.value = new_updates;
					timestamps.value = new_timestamps;
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
						"onUpdate:open": [_cache[5] || (_cache[5] = ($event) => is_open.value = $event), on_dialog_update],
						class: "smgr-dialog",
						"close-button-label": "Close"
					}, {
						header: (0, vue.withCtx)(() => [(0, vue.createElementVNode)("div", { class: (0, vue.normalizeClass)(["smgr-header-content", { "smgr-header-content--install": current_view.value === "install" }]) }, [current_view.value === "install" ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_1, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxButton), {
							onClick: _cache[0] || (_cache[0] = ($event) => current_view.value = "list"),
							action: "progressive",
							weight: "quiet",
							class: "smgr-back-btn"
						}, {
							default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxIcon), { icon: (0, vue.unref)(C7) }, null, 8, ["icon"]), _cache[9] || (_cache[9] = (0, vue.createTextVNode)("Back ", -1))]),
							_: 1
						}), _cache[10] || (_cache[10] = (0, vue.createElementVNode)("div", { class: "smgr-header-text" }, [(0, vue.createElementVNode)("span", { class: "cdx-dialog__header__title" }, "Install New Script")], -1))])) : ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_2, [..._cache[11] || (_cache[11] = [(0, vue.createElementVNode)("span", { class: "cdx-dialog__header__title" }, "script-ctl", -1), (0, vue.createElementVNode)("span", { class: "cdx-dialog__header__subtitle" }, "A security-focused user script manager", -1)])])), current_view.value === "list" ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(_wikimedia_codex.CdxButton), {
							key: 2,
							action: "progressive",
							weight: "primary",
							onClick: _cache[1] || (_cache[1] = ($event) => current_view.value = "install")
						}, {
							default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxIcon), { icon: (0, vue.unref)(C3) }, null, 8, ["icon"]), _cache[12] || (_cache[12] = (0, vue.createTextVNode)("Add script ", -1))]),
							_: 1
						})) : (0, vue.createCommentVNode)("", true)], 2)]),
						default: (0, vue.withCtx)(() => [(0, vue.createElementVNode)("div", _hoisted_3, [notice.value.text ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", {
							key: 0,
							class: (0, vue.normalizeClass)(["smgr-notice", `smgr-notice--${notice.value.type}`])
						}, (0, vue.toDisplayString)(notice.value.text), 3)) : (0, vue.createCommentVNode)("", true), current_view.value === "install" ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_4, [(0, vue.createVNode)(InstallForm_default, {
							ref_key: "install_form_ref",
							ref: install_form_ref,
							busy: busy_install.value,
							onInstall: on_install_requested,
							onCancel: _cache[2] || (_cache[2] = ($event) => current_view.value = "list")
						}, null, 8, ["busy"])])) : ((0, vue.openBlock)(), (0, vue.createElementBlock)("div", _hoisted_5, [(0, vue.createVNode)(ScriptList_default, {
							scripts: scripts.value,
							updates: updates.value,
							timestamps: timestamps.value,
							loading: loading.value,
							busy_idx: busy_idx.value,
							onToggle: _cache[3] || (_cache[3] = ($event) => on_toggle($event.idx, $event.current_status)),
							onUpdate: on_update,
							onUninstall: on_uninstall,
							onAdd_new: _cache[4] || (_cache[4] = ($event) => current_view.value = "install")
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
						"onUpdate:open": [_cache[7] || (_cache[7] = ($event) => show_warning.value = $event), _cache[8] || (_cache[8] = ($event) => show_warning.value = $event)],
						title: "Security Warning",
						"close-button-label": "Cancel",
						"use-close-button": true
					}, {
						footer: (0, vue.withCtx)(() => [(0, vue.createElementVNode)("div", _hoisted_9, [(0, vue.createVNode)((0, vue.unref)(_wikimedia_codex.CdxButton), { onClick: _cache[6] || (_cache[6] = ($event) => show_warning.value = false) }, {
							default: (0, vue.withCtx)(() => [..._cache[19] || (_cache[19] = [(0, vue.createTextVNode)("Cancel", -1)])]),
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
							_cache[13] || (_cache[13] = (0, vue.createElementVNode)("strong", null, "WARNING:", -1)),
							_cache[14] || (_cache[14] = (0, vue.createTextVNode)(" Userscripts could contain malicious content capable of compromising your account. You are encouraged to review the source code of the script before installing it: ", -1)),
							(0, vue.createElementVNode)("a", {
								href: get_url(pending_action.value.name),
								target: "_blank"
							}, [(0, vue.createElementVNode)("strong", null, (0, vue.toDisplayString)(pending_action.value.name), 1)], 8, _hoisted_6)
						]), pending_action.value.type === "install" ? ((0, vue.openBlock)(), (0, vue.createElementBlock)("p", _hoisted_7, [
							_cache[15] || (_cache[15] = (0, vue.createTextVNode)(" Are you absolutely sure you want to install and trust ", -1)),
							(0, vue.createElementVNode)("code", null, (0, vue.toDisplayString)(pending_action.value.name), 1),
							_cache[16] || (_cache[16] = (0, vue.createTextVNode)("? ", -1))
						])) : ((0, vue.openBlock)(), (0, vue.createElementBlock)("p", _hoisted_8, [
							_cache[17] || (_cache[17] = (0, vue.createTextVNode)(" Are you absolutely sure you want to update and trust the new version of ", -1)),
							(0, vue.createElementVNode)("code", null, (0, vue.toDisplayString)(pending_action.value.name), 1),
							_cache[18] || (_cache[18] = (0, vue.createTextVNode)("? ", -1))
						]))]),
						_: 1
					}, 8, ["open"])], 64);
				};
			}
		}, [["__scopeId", "data-v-b005dffc"]]);
		//#endregion
		//#region src/init.js
		async function init() {
			(await script_store.load()).filter((s) => s.status === "enabled").forEach((s) => load_script(s.pagename, s.oldid));
			let app_instance = null;
			const ensure_app_instance = () => {
				if (!app_instance) {
					const app_mount = document.createElement("div");
					app_mount.id = "script-manager-vue-root";
					document.body.appendChild(app_mount);
					app_instance = (0, vue.createApp)(App_default).mount(app_mount);
				}
				return app_instance;
			};
			const link = mw.util.addPortletLink("p-personal", "#", "Script Manager", "pt-scriptmanager", "Install and manage userscripts");
			if (link) link.addEventListener("click", (e) => {
				e.preventDefault();
				const inst = ensure_app_instance();
				if (inst && typeof inst.open === "function") inst.open();
			});
			if (mw.config.get("wgPageName") === "Wikipedia:User_scripts/List") document.querySelectorAll("span.scriptInstallerLink").forEach((span) => {
				const id = span.id;
				if (id && id.endsWith(".js")) {
					const install_link = document.createElement("a");
					install_link.textContent = " [install]";
					install_link.href = "#";
					install_link.style.cursor = "pointer";
					install_link.className = "script-ctl-install-link";
					install_link.addEventListener("click", (e) => {
						e.preventDefault();
						const inst = ensure_app_instance();
						if (inst && typeof inst.open_install === "function") inst.open_install(id);
					});
					span.after(install_link);
				}
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
			elementStyle.appendChild(document.createTextNode(".smgr-install-view[data-v-c419cbd9] {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.smgr-card[data-v-c419cbd9] {\n  background: #fff;\n  border: 1px solid #c8ccd1;\n  border-radius: 4px;\n  padding: 16px;\n}\n.skin-theme-clientpref-night .smgr-card[data-v-c419cbd9] {\n  background: #202122;\n  border-color: #54595d;\n}\n.smgr-install-card[data-v-c419cbd9] {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.smgr-label[data-v-c419cbd9] {\n  font-weight: bold;\n  font-size: 0.9em;\n}\n.smgr-install-row[data-v-c419cbd9] {\n  display: flex;\n  gap: 10px;\n}\n.smgr-input[data-v-c419cbd9] {\n  flex: 1;\n}\n.smgr-browse-footer[data-v-c419cbd9] {\n  margin-top: 4px;\n  display: flex;\n  justify-content: flex-start;\n}\n\n.smgr-state[data-v-1b27191a] {\r\n  padding: 24px 0;\r\n  text-align: center;\r\n  color: #72777d;\n}\n.smgr-script-cell[data-v-1b27191a] {\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 8px;\r\n  margin-left: -12px;\n}\n.smgr-dimmed[data-v-1b27191a] {\r\n  opacity: 0.45;\n}\n.smgr-pagename[data-v-1b27191a] {\r\n  font-weight: 600;\r\n  color: #0645ad;\r\n  text-decoration: none;\n}\n.smgr-pagename[data-v-1b27191a]:hover {\r\n  text-decoration: underline;\n}\n.smgr-update-chip[data-v-1b27191a] {\r\n  display: inline-flex;\r\n  align-items: center;\r\n  gap: 3px;\r\n  font-size: 0.72em;\r\n  font-weight: 600;\r\n  color: #3366cc;\r\n  background: #eaf3fb;\r\n  padding: 1px 6px;\r\n  border-radius: 3px;\n}\n.smgr-update-chip .cdx-icon[data-v-1b27191a] {\r\n  width: 12px;\r\n  height: 12px;\n}\r\n\n.smgr-body[data-v-b005dffc] {\r\n  display: flex;\r\n  flex-direction: column;\r\n  gap: 20px;\n}\n.smgr-header-content[data-v-b005dffc] {\r\n  display: flex;\r\n  justify-content: space-between;\r\n  align-items: center;\r\n  width: 100%;\n}\n.smgr-header-nav[data-v-b005dffc] {\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 8px;\r\n  margin-left: -8px;\n}\n.smgr-header-text[data-v-b005dffc] {\r\n  display: flex;\r\n  flex-direction: column;\n}\n.smgr-header-content--install .cdx-dialog__header__title[data-v-b005dffc] {\r\n  font-size: 1rem;\n}\n.smgr-notice[data-v-b005dffc] {\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 8px;\r\n  padding: 10px 14px;\r\n  border-radius: 4px;\r\n  border-left: 4px solid;\r\n  font-size: 0.9rem;\r\n  font-weight: 500;\n}\n.smgr-notice--success[data-v-b005dffc] {\r\n  background: #f0fdf4;\r\n  border-color: #22c55e;\r\n  color: #15803d;\n}\n.smgr-notice--error[data-v-b005dffc] {\r\n  background: #fef2f2;\r\n  border-color: #ef4444;\r\n  color: #b91c1c;\n}\n.smgr-notice--warning[data-v-b005dffc] {\r\n  background: #fffbeb;\r\n  border-color: #f59e0b;\r\n  color: #b45309;\n}\n.smgr-notice--notice[data-v-b005dffc] {\r\n  background: #eff6ff;\r\n  border-color: #3b82f6;\r\n  color: #1d4ed8;\n}\r\n\n.smgr-dialog.cdx-dialog__window,\r\n.smgr-dialog .cdx-dialog__window,\r\n.smgr-dialog {\r\n  width: 800px !important;\r\n  max-width: 90vw !important;\n}\r\n/*$vite$:1*/"));
			document.head.appendChild(elementStyle);
		}
	} catch (e) {
		console.error("vite-plugin-css-injected-by-js", e);
	}
	//#endregion
})();
