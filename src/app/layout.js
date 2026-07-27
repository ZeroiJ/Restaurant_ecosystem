import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/context/SocketContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata = {
  title: "VibeDine — Smart Restaurant Management System",
  description: "A real-time, premium restaurant management solution by VibeDine.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-zinc-950 text-zinc-100 font-sans flex flex-col antialiased selection:bg-rose-500 selection:text-white">
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
