import { useAppContext } from './context/AppContext';
import Login from './components/Login';
import TopBar from './components/common/TopBar';
import Sidebar from './components/common/Sidebar';
import YearsView from './components/views/YearsView';
import MonthsView from './components/views/MonthsView';
import SheetView from './components/views/SheetView';
import VehicleAnalyticsView from './components/views/VehicleAnalyticsView';
import Toast from './components/common/Toast';

function App() {
  const { currentUser, view } = useAppContext();

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      
      {/* Mobile Overlay handles in Sidebar component via portal or simple state */}
      
      <div className="flex flex-1 min-h-[calc(100vh-54px)]">
        <Sidebar />
        
        <main className="flex-1 p-[1.6rem] px-[1.75rem] overflow-x-hidden">
          {view === 'years' && <YearsView />}
          {view === 'months' && <MonthsView />}
          {view === 'sheet' && <SheetView />}
          {view === 'vehicle' && <VehicleAnalyticsView />}
        </main>
      </div>

      <Toast />
    </div>
  );
}

export default App;
