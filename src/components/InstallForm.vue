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
    </div>

    <div class="smgr-card smgr-examples-card">
      <h4 class="smgr-examples-title">Browse Scripts (from <a :href="get_url('Wikipedia:User scripts/List')"
          target="_blank">Wikipedia:User scripts/List</a>)</h4>
      <div v-if="loading_browse" class="smgr-browse-loading">Loading scripts...</div>
      <div v-else class="smgr-browse-list-container">
        <ul class="smgr-example-list">
          <li v-for="s in browse_scripts" :key="s.code" class="smgr-browse-item">
            <div class="smgr-browse-info">
              <strong>
                <a :href="get_url(s.doc)" target="_blank">{{ s.name }}</a>
                <span v-if="s.user" class="smgr-browse-author"> by <a :href="get_url('User:' + s.user)"
                    target="_blank">{{ s.user }}</a></span>
              </strong>
              <div v-if="s.desc" class="smgr-browse-desc">{{ s.desc }}</div>
            </div>
            <cdx_button class="smgr-install-btn" @click="install_from_list(s.code)">Install</cdx_button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { CdxButton as cdx_button, CdxLookup as cdx_lookup } from '@wikimedia/codex';
import { search_scripts, fetch_browse_scripts } from '../helpers.js';

const props = defineProps({
  busy: { type: Boolean, default: false }
});

const emit = defineEmits(['install', 'cancel']);
const install_input = ref('');
const selected_script = ref(null);
const suggestions = ref([]);
const browse_scripts = ref([]);
const loading_browse = ref(false);
let timeout = null;

const menu_items = computed(() => {
  return suggestions.value.map(s => ({
    value: s,
    label: s
  }));
});

const get_url = (pagename) => mw.util.getUrl(pagename);

onMounted(async () => {
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
  if (val) {
    emit('install', typeof val === 'string' ? val : val.value);
  }
};

const install_from_list = (name) => {
  if (props.busy) return;
  install_input.value = name;
  emit('install', name);
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

.smgr-examples-card {
  background: #f8f9fa;
  border-color: #eaecf0;
  display: flex;
  flex-direction: column;
}

.skin-theme-clientpref-night .smgr-examples-card {
  background: #202122;
  border-color: #54595d;
}

.smgr-examples-title {
  margin: 0 0 10px 0;
  font-size: 0.95em;
}

.smgr-browse-loading {
  font-size: 0.9em;
  color: #72777d;
  font-style: italic;
  padding: 10px 0;
}

.smgr-browse-list-container {
  height: 250px;
  overflow-y: auto;
  border: 1px solid #eaecf0;
  border-radius: 4px;
  background: #fff;
}

.skin-theme-clientpref-night .smgr-browse-list-container {
  background: #141414;
  border-color: #54595d;
}

.smgr-example-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.smgr-browse-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #eaecf0;
  gap: 12px;
}

.smgr-browse-item:last-child {
  border-bottom: none;
}

.smgr-browse-item:hover {
  background: #f8f9fa;
}

.skin-theme-clientpref-night .smgr-browse-item:hover {
  background: #1a1a1a;
}

.smgr-browse-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.smgr-browse-info strong {
  font-size: 0.95em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.smgr-browse-info strong a {
  color: #0645ad;
  text-decoration: none;
}

.skin-theme-clientpref-night .smgr-browse-info strong a {
  color: #4e94ce;
}

.smgr-browse-info strong a:hover {
  text-decoration: underline;
}

.smgr-browse-author {
  font-size: 0.9em;
  font-weight: normal;
}

.smgr-browse-desc {
  font-size: 0.85em;
  line-height: 1.3;
}

.smgr-install-btn {
  flex-shrink: 0;
}
</style>
