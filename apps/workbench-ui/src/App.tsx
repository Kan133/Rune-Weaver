import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { FeatureList } from '@/components/feature/FeatureList';
import { FeatureDetail } from '@/components/feature/FeatureDetail';
import { WizardDialog } from '@/components/wizard/WizardDialog';

function App() {
  return (
    <>
      <div className="h-screen w-screen flex flex-col bg-[#1a1a1a] overflow-hidden">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <FeatureList />
          <FeatureDetail />
        </div>
        <StatusBar />
      </div>
      <WizardDialog />
    </>
  );
}

export default App;
