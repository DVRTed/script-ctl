<template>
  <cdx_dialog v-model:open="is_open" class="smgr-dialog" title="script-ctl"
    subtitle="A security-focused user script manager" close-button-label="Close" @update:open="on_dialog_update">
    <div class="smgr-body">
      <div v-if="notice.text" class="smgr-notice" :class="`smgr-notice--${notice.type}`">
        {{ notice.text }}
      </div>

      <div v-if="current_view === 'install'">
        <install_form ref="install_form_ref" :busy="busy_install" @install="on_install_requested"
          @cancel="current_view = 'list'" />
      </div>

      <div v-else>
        <script_list :scripts="scripts" :updates="updates" :timestamps="timestamps" :loading="loading"
          :busy_idx="busy_idx" @toggle="on_toggle($event.idx, $event.current_status)" @update="on_update"
          @uninstall="on_uninstall" @add_new="current_view = 'install'" />
      </div>
    </div>
  </cdx_dialog>

  <cdx_dialog v-model:open="show_warning" title="Security Warning" close-button-label="Cancel" :use-close-button="true"
    @update:open="show_warning = $event">
    <p>
      <strong>WARNING:</strong> Userscripts could contain malicious content capable of compromising your account.
      You are encouraged to review the source code of the script before installing it: <a
        :href="get_url(pending_action.name)" target="_blank"><strong>{{ pending_action.name }}</strong></a>
    </p>
    <p v-if="pending_action.type === 'install'">
      Are you absolutely sure you want to install and trust <code>{{ pending_action.name }}</code>?
    </p>
    <p v-else>
      Are you absolutely sure you want to update and trust the new version of <code>{{ pending_action.name }}</code>?
    </p>
    <template #footer>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <cdx_button @click="show_warning = false">Cancel</cdx_button>
        <cdx_button action="destructive" weight="primary" @click="confirm_action" :disabled="busy_install">{{
          pending_action.type === 'install' ? 'I Understand, Install' : 'I Understand, Update' }}</cdx_button>
      </div>
    </template>
  </cdx_dialog>
</template>

<script setup>
import { ref } from 'vue';
import { CdxDialog as cdx_dialog, CdxButton as cdx_button } from '@wikimedia/codex';

import install_form from './components/InstallForm.vue';
import script_list from './components/ScriptList.vue';

import { script_store } from './script_store.js';
import { fetch_page_info, load_script, fetch_latest_oldid, fetch_latest_revisions } from './helpers.js';

const is_open = ref(false);
const notice = ref({ text: '', type: 'notice' });
const busy_install = ref(false);
const show_warning = ref(false);
const pending_action = ref({ type: 'install', name: '', idx: null, oldid: null });
const busy_idx = ref(null);
const loading = ref(false);
const scripts = ref([]);
const updates = ref({});
const timestamps = ref({});

const current_view = ref('list');
const install_form_ref = ref(null);

const open = () => {
  notice.value = { text: '', type: 'notice' };
  is_open.value = true;
  current_view.value = 'list';
  if (install_form_ref.value) install_form_ref.value.clear_input();
  render_list();
};

defineExpose({ open });

const get_url = (pagename) => {
  return mw.util.getUrl(pagename);
};

const on_dialog_update = (val) => {
  is_open.value = val;
};

const set_notice = (text, type) => {
  notice.value = { text, type };
};

const clear_notice = () => {
  set_notice("");
};

const check_updates_and_timestamps = async (all_scripts) => {
  const current_scripts = all_scripts.filter(s => s.status === "enabled");
  if (!current_scripts.length) return;

  const new_updates = {};
  const new_timestamps = {};

  const oldids = current_scripts.map(s => s.oldid).filter(id => id);
  if (oldids.length > 0) {
    for (let i = 0; i < oldids.length; i += 50) {
      const chunk = oldids.slice(i, i + 50);
      try {
        const data2 = await new mw.Api().get({
          action: "query",
          prop: "revisions",
          revids: chunk.join("|"),
          rvprop: "timestamp|ids",
          formatversion: 2,
        });
        for (const page of data2.query.pages || []) {
          for (const rev of page.revisions || []) {
            const ts = new Date(rev.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            const script = current_scripts.find(s => s.oldid === rev.revid);
            if (script) {
              new_timestamps[script.pagename] = ts;
            }
          }
        }
      } catch (e) { }
    }
  }

  const pagenames = current_scripts.map(s => s.pagename);
  try {
    const latest_map = await fetch_latest_revisions(pagenames);
    for (const s of current_scripts) {
      const latest = latest_map[s.pagename];
      if (latest && latest !== s.oldid) {
        new_updates[s.pagename] = true;
      }
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
    if (!info.exists) {
      set_notice(`Page not found: ${pagename}`, "error");
    } else if (info.content_model !== 'javascript') {
      set_notice(`Script must have javascript content model (got: ${info.content_model})`, "error");
    } else {
      const current_scripts = await script_store.load();
      if (current_scripts.some(s => s.pagename === info.normalized_title)) {
        return set_notice(`${info.normalized_title} is already installed.`, "warning");
      }

      pending_action.value = {
        type: 'install',
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
  if (pending_action.value.type === 'install') {
    await perform_install();
  } else {
    await perform_update();
  }
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
    current_view.value = 'list';
    await render_list();
  } catch {
    set_notice(`Failed to install ${pagename}.`, "error");
  } finally {
    busy_install.value = false;
  }
};

const on_update = async (idx) => {
  const current_scripts = await script_store.load();
  const script = current_scripts[idx];
  pending_action.value = { type: 'update', name: script.pagename, idx: idx };
  show_warning.value = true;
};

const perform_update = async () => {
  const idx = pending_action.value.idx;
  show_warning.value = false;
  const current_scripts = await script_store.load();
  const script = current_scripts[idx];

  busy_idx.value = idx;
  clear_notice();

  try {
    const info = await fetch_page_info(script.pagename);
    if (!info.exists) {
      set_notice(`Page not found: ${script.pagename}`, "error");
    } else if (info.oldid === script.oldid) {
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
    const removed = await script_store.remove(idx);
    set_notice(`Removed ${removed.pagename}.`, "warning");
    await render_list();
  } catch {
    set_notice("Failed to remove script.", "error");
  } finally {
    busy_idx.value = null;
  }
};
</script>

<style scoped>
.smgr-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 500px;
}

.smgr-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 4px;
  border-left: 4px solid;
  font-size: 0.9rem;
  font-weight: 500;
}

.smgr-notice--success {
  background: #f0fdf4;
  border-color: #22c55e;
  color: #15803d;
}

.smgr-notice--error {
  background: #fef2f2;
  border-color: #ef4444;
  color: #b91c1c;
}

.smgr-notice--warning {
  background: #fffbeb;
  border-color: #f59e0b;
  color: #b45309;
}

.smgr-notice--notice {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}
</style>

<style>
.smgr-dialog.cdx-dialog__window,
.smgr-dialog .cdx-dialog__window,
.smgr-dialog {
  width: 800px !important;
  max-width: 90vw !important;
}
</style>