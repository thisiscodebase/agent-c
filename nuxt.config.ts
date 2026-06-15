export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@comark/nuxt", "eve/nuxt", "@nuxthub/core"],
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  compatibilityDate: "latest",
  hub: {
    db: "sqlite",
  },
  runtimeConfig: {
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
  },
});
