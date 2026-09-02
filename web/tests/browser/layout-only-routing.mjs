const nonLayoutResourceTypes = new Set(["image", "media"]);

export const installLayoutOnlyRouting = (page) =>
  page.route("**/*", (route) => {
    if (nonLayoutResourceTypes.has(route.request().resourceType())) {
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
