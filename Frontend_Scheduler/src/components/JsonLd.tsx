export default function JsonLd() {
  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "DojoClass",
    url: "https://dojoclass.space",
    description:
      "Track your college attendance by subject, plan weekly schedules, and never fall below 75%. Free smart attendance tracker app built for students.",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    featureList: [
      "Track attendance by subject",
      "Plan weekly class schedule",
      "Visualize attendance summary",
      "Know how many classes you can bunk",
      "75% attendance threshold alerts",
    ],
    screenshot: "https://dojoclass.space/opengraph-image",
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DojoClass",
    url: "https://dojoclass.space",
    logo: "https://dojoclass.space/icon.svg",
    contactPoint: {
      "@type": "ContactPoint",
      email: "bceutkarsh@gmail.com",
      contactType: "customer support",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webAppSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
    </>
  );
}
