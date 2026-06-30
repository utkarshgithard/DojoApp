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
    logo: "https://dojoclass.space/favicon.png",
    contactPoint: {
      "@type": "ContactPoint",
      email: "bceutkarsh@gmail.com",
      contactType: "customer support",
    },
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DojoClass",
    url: "https://dojoclass.space",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://dojoclass.space/community?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  const siteNavigationSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "DojoClass Navigation",
    itemListElement: [
      {
        "@type": "SiteNavigationElement",
        position: 1,
        name: "Community Feed",
        url: "https://dojoclass.space/community"
      },
      {
        "@type": "SiteNavigationElement",
        position: 2,
        name: "Exam Prep",
        url: "https://dojoclass.space/exam-prep"
      },
      {
        "@type": "SiteNavigationElement",
        position: 3,
        name: "Log In",
        url: "https://dojoclass.space/login"
      },
      {
        "@type": "SiteNavigationElement",
        position: 4,
        name: "Sign Up",
        url: "https://dojoclass.space/register"
      },
      {
        "@type": "SiteNavigationElement",
        position: 5,
        name: "About Us",
        url: "https://dojoclass.space/about"
      },
      {
        "@type": "SiteNavigationElement",
        position: 6,
        name: "Contact Us",
        url: "https://dojoclass.space/contact"
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I track my college attendance by subject on DojoClass?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "DojoClass provides an intuitive, one-tap dashboard to mark present, absent, or cancelled classes for each of your subjects. It automatically recalculates your attendance percentage in real-time, helping you visualize your progress and stay on track with your academic criteria."
        }
      },
      {
        "@type": "Question",
        "name": "What is a study buddy streak and how does it keep me motivated?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A study buddy streak is a built-in motivation system where you pair up with a classmate. You can check each other's attendance statistics, monitor streaks, and keep each other accountable through friendly competition so that neither of you falls below 75%."
        }
      },
      {
        "@type": "Question",
        "name": "Are the study rooms and group video calls secure?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. DojoClass study sessions, chat messages, and group video/audio calls are fully secured. Study rooms feature private, host-controlled access to guarantee a focused and distraction-free collaboration space."
        }
      },
      {
        "@type": "Question",
        "name": "How does the weekly class scheduler predict my future attendance?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "By entering your weekly class schedule once, DojoClass maps out your repeating timetable. It automatically forecasts your future attendance percentages and alerts you if upcoming absences might push your criteria below safe limits."
        }
      }
    ]
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(siteNavigationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
    </>
  );
}
