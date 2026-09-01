(() => {
  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement)) return;

  const storageKey = "inspr-language";
  const currentLocale = script.dataset.currentLocale;
  const englishPath = script.dataset.englishPath;
  const germanPath = script.dataset.germanPath;
  const shouldDetect = script.dataset.detectLocale === "true";

  if (!englishPath || !germanPath || !["en", "de"].includes(currentLocale)) return;

  const readPreference = () => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === "en" || stored === "de" ? stored : null;
    } catch {
      return null;
    }
  };

  const firstSupportedBrowserLocale = () => {
    const languages = Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

    for (const language of languages) {
      const primary = String(language || "").toLowerCase().split("-")[0];
      if (primary === "de" || primary === "en") return primary;
    }
    return "en";
  };

  const explicitPreference = readPreference();
  const preferredLocale = explicitPreference
    || (shouldDetect ? firstSupportedBrowserLocale() : currentLocale);

  if (preferredLocale !== currentLocale) {
    const targetPath = preferredLocale === "de" ? germanPath : englishPath;
    const target = `${targetPath}${window.location.search}${window.location.hash}`;
    window.location.replace(target);
    return;
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-language-choice]").forEach((link) => {
      link.addEventListener("click", () => {
        const choice = link.getAttribute("data-language-choice");
        if (choice !== "en" && choice !== "de") return;
        try {
          window.localStorage.setItem(storageKey, choice);
        } catch {
          // The link still changes language when storage is unavailable.
        }
      });
    });
  }, { once: true });
})();
