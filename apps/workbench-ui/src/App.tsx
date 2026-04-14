import { useState } from 'react';
import { Header, type HostType } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { FeatureList } from '@/components/feature/FeatureList';
import { FeatureDetail } from '@/components/feature/FeatureDetail';
import { WizardDialog } from '@/components/wizard/WizardDialog';
import { War3AnchorPanel } from '@/components/war3/War3AnchorPanel';

function App() {
  const [activeHost, setActiveHost] = useState<HostType>('dota2');

  return (
    <>
      <div className="h-screen w-screen flex flex-col bg-[#1a1a1a] overflow-hidden">
        <Header activeHost={activeHost} onHostChange={setActiveHost} />
        <div className="flex-1 flex overflow-hidden">
          {activeHost === 'dota2' ? (
            <>
              <Sidebar />
              <FeatureList />
              <FeatureDetail />
            </>
          ) : (
            <War3AnchorPanel variant="main" />
          )}
        </div>
        <StatusBar />
      </div>
      <WizardDialog />
    </>
  );
}

export default App;
