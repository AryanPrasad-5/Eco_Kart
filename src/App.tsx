import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { useHashRoute } from './hooks/useHashRoute';
import { ToastProvider } from './hooks/useToast';
import { ProductLanding } from './pages/Landing';
import { Marketplace } from './pages/Marketplace';
import { ListingDetails } from './pages/ListingDetails';
import { CreateListing } from './pages/CreateListing';
import { Dashboard } from './pages/Dashboard';
import { RecyclerDashboard } from './pages/RecyclerDashboard';
import { Transactions, TransactionDetail } from './pages/Transactions';
import { Pickups } from './pages/Pickups';
import { Analytics } from './pages/Analytics';
import { ImpactPage } from './pages/Impact';
import { SignIn, SignUp } from './pages/Auth';
import { MyListings } from './pages/MyListings';
import { Settings } from './pages/Settings';
import { Help } from './pages/Help';
import { AuthProvider } from './auth/AuthContext';

/** The Earth-first experience is its own chunk — the product loads without it. */
const ExperiencePage = lazy(() => import('./experience/ExperiencePage'));

function AppRoutes() {
  const route = useHashRoute();

  // scroll to top on page change (in-page anchors don't change the route)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.name]);

  let page: ReactNode;
  const experience = (
    <Suspense fallback={null}>
      <ExperiencePage />
    </Suspense>
  );
  switch (route.name) {
    case 'product':
      page = <ProductLanding />;
      break;
    case 'experience':
      page = experience;
      break;
    case 'marketplace':
      page = <Marketplace />;
      break;
    case 'listing':
      page = <ListingDetails id={route.id} />;
      break;
    case 'create-listing':
      page = <CreateListing />;
      break;
    case 'dashboard':
      page = <Dashboard />;
      break;
    case 'recycler':
      page = <RecyclerDashboard />;
      break;
    case 'transactions':
      page = <Transactions />;
      break;
    case 'transaction':
      page = <TransactionDetail id={route.id} />;
      break;
    case 'pickups':
      page = <Pickups />;
      break;
    case 'analytics':
      page = <Analytics />;
      break;
    case 'impact':
      page = <ImpactPage />;
      break;
    case 'my-listings':
      page = <MyListings />;
      break;
    case 'signin':
      page = <SignIn />;
      break;
    case 'signup':
      page = <SignUp />;
      break;
    case 'settings':
      page = <Settings />;
      break;
    case 'help':
      page = <Help />;
      break;
    default:
      page = <ProductLanding />;
  }

  return (
    <ToastProvider>
      <AuthProvider>{page}</AuthProvider>
    </ToastProvider>
  );
}

export default function App() {
  return <AppRoutes />;
}
