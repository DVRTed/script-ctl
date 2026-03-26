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

  const ensure_app_instance = () => {
    if (!app_instance) {
      const app_mount = document.createElement("div");
      app_mount.id = "script-manager-vue-root";
      document.body.appendChild(app_mount);

      const vue_app = create_app(app);
      app_instance = vue_app.mount(app_mount);
    }
    return app_instance;
  };

  const link = mw.util.addPortletLink(
    "p-personal",
    "#",
    "Script Manager",
    "pt-scriptmanager",
    "Install and manage userscripts",
  );

  if (link) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const inst = ensure_app_instance();
      if (inst && typeof inst.open === "function") {
        inst.open();
      }
    });
  }

  if (mw.config.get("wgPageName") === "Wikipedia:User_scripts/List") {
    document.querySelectorAll("span.scriptInstallerLink").forEach((span) => {
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
          if (inst && typeof inst.open_install === "function") {
            inst.open_install(id);
          }
        });
        span.after(install_link);
      }
    });
  }
}

init();
