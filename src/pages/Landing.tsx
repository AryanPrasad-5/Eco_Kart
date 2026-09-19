import { Navbar } from '../components/Navbar';
import { Hero } from '../components/landing/Hero';
import { LiveMarket } from '../components/landing/LiveMarket';
import { Stats } from '../components/landing/Stats';
import { HowItWorks } from '../components/landing/HowItWorks';
import { MaterialsExplorer } from '../components/landing/MaterialsExplorer';
import { MarketPreview } from '../components/landing/MarketPreview';
import { DashboardPreview } from '../components/landing/DashboardPreview';
import { ForBusinesses } from '../components/landing/ForBusinesses';
import { Impact } from '../components/landing/Impact';
import { Cta, Footer } from '../components/landing/Cta';

/** The product landing — reached from the Earth-first experience at #/product. */
export function ProductLanding() {
  return (
    <div className="min-h-dvh bg-void">
      <Navbar />
      <main id="main">
        <Hero />
        <LiveMarket />
        <Stats />
        <HowItWorks />
        <MaterialsExplorer />
        <MarketPreview />
        <DashboardPreview />
        <ForBusinesses />
        <Impact />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
