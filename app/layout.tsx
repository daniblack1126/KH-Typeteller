// app/layout.tsx
import "./app/global.css";

export const metadata = {
  title: "KeraNova Hair – TypeTeller",
  description: "Upload a hair photo to see your hair type.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
