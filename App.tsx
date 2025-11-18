
import React, { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import TimetableGrid from './components/TimetableGrid/TimetableGrid';
import Sidebar from './components/Sidebar/Sidebar';
import Toolbar from './components/Toolbar';
import AlertLegend from './components/AlertLegend';
import ManagementPage from './pages/ManagementPage';
import ProfessorViewPage from './pages/ProfessorViewPage';
import DashboardPage from './pages/DashboardPage'; // Import new dashboard page
import Toast from './components/Toast';
import ClearDataModal from './components/ClearDataModal';
import LoadExampleModal from './components/LoadExampleModal';
import { GridType } from './types';
import ErrorBoundary from './components/ErrorBoundary';

export type View = 'dashboard' | 'grid' | 'management' | 'professor';

const AppUI: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('grid');
  const [activeGrid, setActiveGrid] = useState<GridType>('regular');
  const [isFocusModeEnabled, setIsFocusModeEnabled] = useState(false); // Default is off
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [isLoadExampleModalOpen, setIsLoadExampleModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { state, dispatch } = useData();

  const renderMainContent = () => {
    switch(currentView) {
      case 'dashboard':
        return <DashboardPage />;
      case 'grid':
        return (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Grid type tabs */}
            <div className="flex-shrink-0 px-4 pt-2 border-b border-gray-200 bg-gray-50">
              <nav className="flex space-x-2" aria-label="Tabs">
                <button
                  onClick={() => setActiveGrid('regular')}
                  className={`px-3 py-2 font-medium text-sm rounded-t-md ${
                    activeGrid === 'regular' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Grade Regular
                </button>
                <button
                  onClick={() => setActiveGrid('modular')}
                  className={`px-3 py-2 font-medium text-sm rounded-t-md ${
                    activeGrid === 'modular' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Grade Modular
                </button>
              </nav>
            </div>
            {/* Grid and Sidebar container */}
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 flex flex-col overflow-auto">
                <TimetableGrid isFocusModeEnabled={isFocusModeEnabled} gridType={activeGrid} />
                <footer className="bg-white p-2 border-t">
                  <AlertLegend />
                </footer>
              </div>
              <aside className={`bg-gray-50 border-l border-gray-200 overflow-y-auto flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-0' : 'w-64 lg:w-80'}`}>
                 <div className={`h-full overflow-hidden ${isSidebarCollapsed ? 'invisible' : 'visible'}`}>
                  <Sidebar gridType={activeGrid} />
                </div>
              </aside>
            </div>
          </div>
        );
      case 'management':
        return <ManagementPage />;
      case 'professor':
        return <ProfessorViewPage />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans text-gray-800">
      <header className="bg-white shadow-md z-20">
        <Toolbar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          activeGrid={activeGrid}
          isFocusModeEnabled={isFocusModeEnabled}
          onFocusModeChange={setIsFocusModeEnabled}
          onOpenClearDataModal={() => setIsClearDataModalOpen(true)}
          onOpenLoadExampleModal={() => setIsLoadExampleModalOpen(true)}
        />
      </header>
      <main className="flex flex-1 overflow-hidden relative">
        <ErrorBoundary>
          {renderMainContent()}
        </ErrorBoundary>
        {currentView === 'grid' && (
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`absolute top-1/2 -translate-y-1/2 z-30 bg-white hover:bg-gray-100 text-gray-600 border border-gray-300 rounded-full w-8 h-8 flex items-center justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 ease-in-out ${
              isSidebarCollapsed ? 'right-0 translate-x-1/2' : 'right-[16rem] lg:right-[20rem] translate-x-1/2'
            }`}
            title={isSidebarCollapsed ? 'Expandir painel' : 'Recolher painel'}
          >
            {isSidebarCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        )}
      </main>
      {state.toastMessage && (
        <Toast 
          message={state.toastMessage}
          onClose={() => dispatch({ type: 'SHOW_TOAST', payload: null })}
        />
      )}
       <ClearDataModal
        isOpen={isClearDataModalOpen}
        onClose={() => setIsClearDataModalOpen(false)}
      />
      <LoadExampleModal
        isOpen={isLoadExampleModalOpen}
        onClose={() => setIsLoadExampleModalOpen(false)}
      />
    </div>
  );
};


const App: React.FC = () => {
  return (
    <DataProvider>
      <AppUI />
    </DataProvider>
  );
};

export default App;
