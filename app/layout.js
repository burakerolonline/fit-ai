export const metadata = { title: "FitAI - Virtual Try-On", description: "AI-powered virtual clothing try-on" };
export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" /></head>
      <body style={{ margin: 0, background: "#131313" }}>{children}</body>
    </html>
  );
}
