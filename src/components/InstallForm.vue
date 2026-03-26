<template>
  <div class="smgr-install-view">
    <div class="smgr-card smgr-install-card">
      <label class="smgr-label">Script Page Name</label>
      <div class="smgr-install-row">
        <cdx_lookup v-model:selected="selected_script" v-model:input-value="install_input" placeholder="User:Foo/bar.js"
          class="smgr-input" :menu-items="menu_items" @input="on_input" :disabled="busy" @keyup.enter="submit" />
        <cdx_button action="progressive" weight="primary" @click="submit" :disabled="busy">
          {{ busy ? 'Installing...' : 'Install' }}
        </cdx_button>
      </div>

      <div class="smgr-browse-footer">
        <cdx_button weight="quiet" action="progressive" @click="open_browse">
          <cdx-icon :icon="cdxIconSearch" />Browse community userscripts
        </cdx_button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { CdxButton as cdx_button, CdxLookup as cdx_lookup, CdxIcon } from '@wikimedia/codex';
import { cdxIconSearch } from '@wikimedia/codex-icons';
import { search_scripts } from '../helpers.js';

const props = defineProps({
  busy: { type: Boolean, default: false }
});

const emit = defineEmits(['install', 'cancel']);
const install_input = ref('');
const selected_script = ref(null);
const suggestions = ref([]);
let timeout = null;

const menu_items = computed(() => {
  return suggestions.value.map(s => ({
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
  if (val) {
    emit('install', typeof val === 'string' ? val : val.value);
  }
};

const open_browse = () => {
  window.open(mw.util.getUrl('Wikipedia:User scripts/List'), '_blank');
};

defineExpose({
  clear_input: () => {
    install_input.value = '';
    selected_script.value = null;
    suggestions.value = [];
  }
});
</script>

<style scoped>
.smgr-install-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.smgr-card {
  background: #fff;
  border: 1px solid #c8ccd1;
  border-radius: 4px;
  padding: 16px;
}

.skin-theme-clientpref-night .smgr-card {
  background: #202122;
  border-color: #54595d;
}

.smgr-install-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.smgr-label {
  font-weight: bold;
  font-size: 0.9em;
}

.smgr-install-row {
  display: flex;
  gap: 10px;
}

.smgr-input {
  flex: 1;
}

.smgr-browse-footer {
  margin-top: 4px;
  display: flex;
  justify-content: flex-start;
}
</style>
