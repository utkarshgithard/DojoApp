import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/calendar",
          "/settings",
          "/setup-schedule",
          "/verify",
          "/verify-email",
        ],
      },
    ],
    sitemap: "https://dojoclass.space/sitemap.xml",
  };
}
