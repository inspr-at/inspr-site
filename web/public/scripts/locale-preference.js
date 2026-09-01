// Blocking, same-origin locale decision. Kept external so script-src 'self'
// covers it without a content hash; the release-id query prevents stale code.
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

  const writePreference = (choice) => {
    try {
      window.localStorage.setItem(storageKey, choice);
      return true;
    } catch {
      return false;
    }
  };

  const query = new URLSearchParams(window.location.search);
  const queryLocale = query.get("lang");
  const arrivalPreference = queryLocale === "en" || queryLocale === "de" ? queryLocale : null;
  const arrivalWasStored = arrivalPreference ? writePreference(arrivalPreference) : false;

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

  const explicitPreference = arrivalPreference || readPreference();
  const preferredLocale = explicitPreference
    || (shouldDetect ? firstSupportedBrowserLocale() : currentLocale);

  if (preferredLocale !== currentLocale) {
    const targetPath = preferredLocale === "de" ? germanPath : englishPath;
    const target = `${targetPath}${window.location.search}${window.location.hash}`;
    window.location.replace(target);
    return;
  }

  if (arrivalPreference && arrivalWasStored) {
    query.delete("lang");
    const cleanSearch = query.toString();
    const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", cleanUrl);
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-language-choice]").forEach((link) => {
      link.addEventListener("click", () => {
        const choice = link.getAttribute("data-language-choice");
        if (choice !== "en" && choice !== "de") return;
        writePreference(choice);
        // Carry the reader's place across the switch: keep the current
        // section hash and any non-language query parameters on the way to
        // the alternate locale. The static link cannot know them at render
        // time, so they are merged at click time.
        try {
          const target = new URL(link.getAttribute("href"), window.location.href);
          const current = new URLSearchParams(window.location.search);
          current.delete("lang");
          current.forEach((value, key) => {
            if (!target.searchParams.has(key)) target.searchParams.append(key, value);
          });
          const hash = window.location.hash;
          link.setAttribute(
            "href",
            `${target.pathname}${target.search}${hash || target.hash}`,
          );
        } catch {
          // A degraded environment still navigates through the plain link.
        }
      });
    });
  }, { once: true });
})();
