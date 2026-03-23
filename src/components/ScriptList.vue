<template>
  <div class="smgr-scripts-view">
    <div class="smgr-header">
      <span class="smgr-header-title">Installed scripts</span>
      <cdx-button action="progressive" weight="primary" @click="$emit('add_new')">
        <cdx-icon :icon="cdxIconAdd" />
        Add script
      </cdx-button>
    </div>

    <div v-if="loading" class="smgr-state">
      <cdx-progress-bar aria-label="Loading scripts..." />
    </div>

    <div v-else-if="!scripts.length" class="smgr-state smgr-empty">
      No scripts installed yet.
    </div>

    <ul v-else class="smgr-list">
      <li v-for="(s, idx) in scripts" :key="idx" :class="['smgr-row', s.status === 'disabled' && 'smgr-row--disabled']">
        <span :class="['smgr-stripe', s.status === 'enabled' ? 'smgr-stripe--on' : 'smgr-stripe--off']" />

        <div class="smgr-row-body">
          <div class="smgr-row-top">
            <a :href="get_url(s.pagename, s.oldid)" target="_blank" class="smgr-pagename">
              {{ s.pagename }}
            </a>
            <span v-if="updates[idx]" class="smgr-update-chip">
              <cdx-icon :icon="cdxIconAlert" />
              Update available
            </span>
          </div>

          <p class="smgr-meta">
            <span
              :class="['smgr-status-text', s.status === 'enabled' ? 'smgr-status-text--on' : 'smgr-status-text--off']">{{
                s.status === 'enabled' ? 'Enabled' : 'Disabled' }}</span>
            <template v-if="timestamps[idx]"> · version dated <b>{{ timestamps[idx] }}</b></template>
            <template v-if="s.oldid"> (rev {{ s.oldid }})</template>
          </p>
        </div>

        <div class="smgr-row-actions">
          <cdx-menu-button :selected="null" :menu-items="get_menu_items(s, idx)" :disabled="busy_idx === idx"
            :aria-label="'Actions for ' + s.pagename" @update:selected="on_select($event, idx)">
            <cdx-icon :icon="cdxIconEllipsis" />
          </cdx-menu-button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { CdxButton, CdxIcon, CdxMenuButton, CdxProgressBar } from '@wikimedia/codex';
import {
  cdxIconAdd,
  cdxIconAlert,
  cdxIconBlock,
  cdxIconCheck,
  cdxIconEllipsis,
  cdxIconReload,
  cdxIconTrash,
} from '@wikimedia/codex-icons';

const props = defineProps({
  scripts: { type: Array, required: true },
  updates: { type: Array, required: true },
  timestamps: { type: Array, default: () => [] },
  loading: { type: Boolean, required: true },
  busy_idx: { type: Number, default: null },
});

const emit = defineEmits(['toggle', 'update', 'uninstall', 'add_new']);

function get_menu_items(s, idx) {
  return [
    {
      label: 'Update',
      value: 'update',
      icon: cdxIconReload,
      disabled: !props.updates[idx],
    },
    {
      label: s.status === 'enabled' ? 'Disable' : 'Enable',
      value: 'toggle',
      icon: s.status === 'enabled' ? cdxIconBlock : cdxIconCheck,
    },
    {
      label: 'Remove',
      value: 'uninstall',
      icon: cdxIconTrash,
      action: 'destructive',
    },
  ];
}

function on_select(value, idx) {
  if (value === 'update') emit('update', idx);
  if (value === 'toggle') emit('toggle', { idx, current_status: props.scripts[idx].status });
  if (value === 'uninstall') emit('uninstall', idx);
}

const get_url = (pagename, oldid) => {
  if (typeof mw === 'undefined' || !mw.util) return '#';
  return mw.util.getUrl(pagename, oldid ? { oldid } : {});
};
</script>

<style scoped>
.smgr-scripts-view {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.smgr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid #eaecf0;
}

.smgr-header-title {
  font-size: 1em;
  font-weight: 600;
}

.smgr-state {
  padding: 24px 0;
  text-align: center;
}

.smgr-empty {
  color: #72777d;
  font-size: 0.9em;
  font-style: italic;
}

.smgr-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.smgr-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px 10px 0;
  border-bottom: 1px solid #eaecf0;
  transition: background 0.1s ease;
}

.smgr-row:last-child {
  border-bottom: none;
}

.smgr-row:hover {
  background: #f8f9fa;
}

.skin-theme-clientpref-night .smgr-row:hover {
  background: #1a1a1a;
}

.smgr-row--disabled .smgr-row-body {
  opacity: 0.45;
}

.smgr-stripe {
  flex-shrink: 0;
  width: 3px;
  align-self: stretch;
  border-radius: 0 2px 2px 0;
}

.smgr-stripe--on {
  background: #14866d;
}

.smgr-stripe--off {
  background: #c8ccd1;
}

.smgr-row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.smgr-row-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.smgr-pagename {
  font-size: 0.95em;
  font-weight: 600;
  color: #0645ad;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.smgr-pagename:hover {
  text-decoration: underline;
}

.smgr-meta {
  margin: 0;
  font-size: 0.78em;
  color: #72777d;
  letter-spacing: 0.01em;
}

.smgr-status-text {
  font-weight: 600;
}

.smgr-status-text--on {
  color: #14866d;
}

.smgr-status-text--off {
  color: #72777d;
}

.smgr-update-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.72em;
  font-weight: 600;
  color: #3366cc;
  background: #eaf3fb;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.smgr-update-chip .cdx-icon {
  width: 12px;
  height: 12px;
}

.smgr-row-actions {
  flex-shrink: 0;
}
</style>