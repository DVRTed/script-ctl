import { createApp as create_app } from "vue";
import app from "./App.vue";
import { script_store } from "./script_store.js";
import { load_script } from "./helpers.js";

async function init() {
  const scripts = await script_store.load();
  scripts
    .filter((s) => s.status === "enabled")
    .forEach((s) => load_script(s.pagename, s.oldid));

  let app_instance = null;

  const link = mw.util.addPortletLink(
    "p-personal",
    "#",
    "Script Manager",
    "pt-scriptmanager",
    "Install and manage userscripts",
  );

  if (!link) return;

  link.addEventListener("click", (e) => {
    e.preventDefault();
    if (!app_instance) {
      const app_mount = document.createElement("div");
      app_mount.id = "script-manager-vue-root";
      document.body.appendChild(app_mount);

      const vue_app = create_app(app);
      app_instance = vue_app.mount(app_mount);
    }

    if (app_instance && typeof app_instance.open === "function") {
      app_instance.open();
    }
  });
}

init();
