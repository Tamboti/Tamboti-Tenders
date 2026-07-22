import { Helmet } from "react-helmet-async";

const DEFAULT_DESCRIPTION =
  "Search, track, and get alerted on procurement tenders across Africa. Free to browse — no account required.";
const DEFAULT_IMAGE =
  "https://luykyredvhhcamcmgahp.supabase.co/storage/v1/object/public/Company%20assets/Gemini_Generated_Image_k92dq5k92dq5k92d-removebg-preview.png";

export const Seo = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  noIndex = false,
}: {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}) => {
  const fullTitle = `${title} — Tender Compass`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {url && <link rel="canonical" href={url} />}
    </Helmet>
  );
};
