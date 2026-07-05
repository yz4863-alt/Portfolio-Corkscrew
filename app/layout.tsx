import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPIRAL Catheter | Yusheng (Jason) Zhang",
  description:
    "Interactive portfolio page for the SPIRAL helical neural implant project, highlighting intracerebral microfluidic catheter design, FEA, mechanical testing, and publication impact.",
  openGraph: {
    title: "SPIRAL Catheter | Yusheng (Jason) Zhang",
    description:
      "Helical neural implants for localized intracerebral drug delivery, with an interactive Three.js brain and animated infusion hero.",
    images: ["/hero-brain-catheter-3d.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SPIRAL Catheter | Yusheng (Jason) Zhang",
    description:
      "Interactive project page for a published helical intracerebral microfluidic catheter.",
    images: ["/hero-brain-catheter-3d.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/hero-brain-catheter-3d.png" as="image" />
        <link rel="preload" href="/brain-cad-modified.stl" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/corkscrew.stl" as="fetch" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}

