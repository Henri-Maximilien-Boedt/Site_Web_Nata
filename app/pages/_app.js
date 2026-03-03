import "@/styles/globals.css";
import "@/styles/floorplan.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isAdminPage = router.pathname.startsWith("/admin");

  /* Les pages admin gèrent leur propre layout via AdminLayout */
  if (isAdminPage) {
    return <Component {...pageProps} />;
  }

  return (
    <>
      <Header />
      <Component {...pageProps} />
      <Footer />
    </>
  );
}
