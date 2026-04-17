export const SITE = {
  website: "https://www.cmasolo.xyz", // replace ed domain
  author: "Claudio Masolo",
  profile: "https://www.cmasolo.xyz",
  desc: "Senior Cloud/DevOps Engineer, Blogger, InfoQ Senior Contributor.",
  title: "Claudio Masolo",
  ogImage: "claudio_2.png", // replace with your own og image
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "https://github.com/satnaing/astro-paper/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Europe/Rome", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
