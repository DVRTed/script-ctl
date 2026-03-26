<template>
  <div class="smgr-scripts-view">
    <div v-if="loading" class="smgr-state">
      <cdx-progress-bar aria-label="Loading scripts..." />
    </div>

    <cdx-table v-else caption="Installed scripts" :columns="columns" :data="tableData">


      <template #item-script="{ row }">
        <div :class="['smgr-script-cell', { 'smgr-dimmed': row.status === 'disabled' }]">
          <span :class="['smgr-stripe', row.status === 'enabled' ? 'smgr-stripe--on' : 'smgr-stripe--off']" />
          <a :href="get_url(row.pagename, row.oldid)" target="_blank" class="smgr-pagename">
            {{ row.pagename }}
          </a>
          <span v-if="updates[row.pagename]" class="smgr-update-chip">
            <cdx-icon :icon="cdxIconAlert" /> Update available
          </span>
        </div>
      </template>

      <template #item-status="{ row }">
        <cdx-info-chip :status="row.status === 'enabled' ? 'success' : 'warning'">
          {{ row.status === 'enabled' ? 'Enabled' : 'Disabled' }}
        </cdx-info-chip>

      </template>

      <template #item-version="{ row }">
        <template v-if="timestamps[row.pagename]">
          {{ timestamps[row.pagename] }}<template v-if="row.oldid"> (rev {{ row.oldid }})</template>
        </template>
        <span v-else style="color: #72777d">—</span>
      </template>

      <template #item-actions="{ row }">
        <cdx-menu-button :selected="null" :menu-items="get_menu_items(row)" :disabled="busy_idx === row._idx"
          :aria-label="'Actions for ' + row.pagename" @update:selected="on_select($event, row._idx)">
          <cdx-icon :icon="cdxIconEllipsis" />
        </cdx-menu-button>
      </template>
    </cdx-table>

    <div v-if="!loading && !scripts.length" class="smgr-state">
      No scripts installed yet.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { CdxButton, CdxIcon, CdxInfoChip, CdxMenuButton, CdxProgressBar, CdxTable } from '@wikimedia/codex';
import {
  cdxIconAdd, cdxIconAlert, cdxIconBlock, cdxIconCheck,
  cdxIconEllipsis, cdxIconReload, cdxIconTrash,
} from '@wikimedia/codex-icons';

const props = defineProps({
  scripts: { type: Array, required: true },
  updates: { type: Object, required: true },
  timestamps: { type: Object, default: () => ({}) },
  loading: { type: Boolean, required: true },
  busy_idx: { type: Number, default: null },
});

const emit = defineEmits(['toggle', 'update', 'uninstall', 'add_new']);

const columns = [
  { id: 'script', label: 'Script' },
  { id: 'status', label: 'Status' },
  { id: 'version', label: 'Version' },
  { id: 'actions', label: 'Action', align: 'end' },
];

const tableData = computed(() => props.scripts.map((s, idx) => ({ ...s, _idx: idx })));

function get_menu_items(row) {
  return [
    { label: 'Update', value: 'update', icon: cdxIconReload, disabled: !props.updates[row.pagename] },
    { label: row.status === 'enabled' ? 'Disable' : 'Enable', value: 'toggle', icon: row.status === 'enabled' ? cdxIconBlock : cdxIconCheck },
    { label: 'Remove', value: 'uninstall', icon: cdxIconTrash, action: 'destructive' },
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
.smgr-state {
  padding: 24px 0;
  text-align: center;
  color: #72777d;
}

.smgr-script-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: -12px;
}

.smgr-dimmed {
  opacity: 0.45;
}

.smgr-pagename {
  font-weight: 600;
  color: #0645ad;
  text-decoration: none;
}

.smgr-pagename:hover {
  text-decoration: underline;
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
}

.smgr-update-chip .cdx-icon {
  width: 12px;
  height: 12px;
}
</style>