export const metadata = {
  title: "KeraNova Hair – TypeTeller",
  description: "Upload a hair photo to get a hair type prediction.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
