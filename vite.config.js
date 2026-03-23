import { defineConfig as define_config } from "vite";
import vue from "@vitejs/plugin-vue";
import css_injected_by_js_plugin from "vite-plugin-css-injected-by-js";
import path from "path";

export default define_config({
  plugins: [
    vue(),
    css_injected_by_js_plugin({ topExecutionPriority: false })
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/init.js"),
      name: "script_manager",
      fileName: () => "script-manager.js",
      formats: ["iife"]
    },
    rollupOptions: {
      external: ['vue', '@wikimedia/codex'],
      output: {
        banner: `mw.loader.using(["vue", "@wikimedia/codex", "mediawiki.api", "mediawiki.util"]).then(function () {\nconst require = mw.loader.require;\n`,
        footer: `\n});`,
        globals: {
          vue: 'require("vue")',
          '@wikimedia/codex': 'require("@wikimedia/codex")'
        }
      }
    },
    minify: false,
    outDir: "dist",
    emptyOutDir: true,
  },
  define: {
    "process.env.NODE_ENV": '"production"'
  }
});
