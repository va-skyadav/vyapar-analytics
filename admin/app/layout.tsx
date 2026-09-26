import "./globals.css";
import BrandDisplay from "../../components/brand-display";
export const metadata={title:"Vyapar Analytics Admin",description:"Vyapar Analytics Admin Control Center"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}<BrandDisplay admin /></body></html>}