import "./globals.css";

export const metadata = {
  title: "Vyapar Analytics",
  description: "Business intelligence and predictive analytics platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
