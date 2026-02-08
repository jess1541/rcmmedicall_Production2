import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DoctorList from './pages/DoctorList';
import DoctorProfile from './pages/DoctorProfile';
import ExecutiveCalendar from './pages/ExecutiveCalendar';
import ProceduresManager from './pages/ProceduresManager';
import Login from './components/Login';
import { parseData } from './constants';
import { Doctor, User, Procedure } from './types';
import { Menu, RefreshCw } from 'lucide-react';

const STORAGE_KEYS = {
    USER: 'rc_medicall_user_v5',
    SIDEBAR: 'rc_medicall_sidebar_collapsed'
};

const API_URL = '/api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>(() => parseData());
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
      return localStorage.getItem(STORAGE_KEYS.SIDEBAR) === 'true';
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const toggleSidebar = () => {
      const newState = !isSidebarCollapsed;
      setIsSidebarCollapsed(newState);
      localStorage.setItem(STORAGE_KEYS.SIDEBAR, String(newState));
  };

  const fetchData = async () => {
      if (!user) return;
      try {
          const [docsRes, procsRes] = await Promise.all([
              fetch(`${API_URL}/doctors`),
              fetch(`${API_URL}/procedures`)
          ]);

          if (docsRes.ok && procsRes.ok) {
              const docsFromServer = await docsRes.json();
              const procsFromServer = await procsRes.json();
              
              if (docsFromServer && docsFromServer.length > 0) {
                  setDoctors(docsFromServer);
              } else if (doctors.length > 0) {
                  // Primera carga masiva a MySQL 8.4
                  await fetch(`${API_URL}/doctors/bulk`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(doctors)
                  });
              }
              setProcedures(procsFromServer);
          }
      } catch (error) {
          console.error("Sync error:", error);
      } finally {
          setIsSyncing(false);
      }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (savedUser) setUser(JSON.parse(savedUser));
    fetchData();

    const interval = setInterval(() => {
        if (user) {
            setIsSyncing(true);
            fetchData(); 
        }
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
      setUser(loggedInUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const syncDoctorsState = async (updatedDocs: Doctor | Doctor[]) => {
      const docsArray = Array.isArray(updatedDocs) ? updatedDocs : [updatedDocs];
      setDoctors(prev => {
          const map = new Map(prev.map(d => [d.id, d]));
          docsArray.forEach(d => map.set(d.id, d));
          return Array.from(map.values());
      });

      try {
          if (docsArray.length > 1) {
              await fetch(`${API_URL}/doctors/bulk`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(docsArray)
              });
          } else {
              await fetch(`${API_URL}/doctors`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(docsArray[0])
              });
          }
      } catch (e) { console.error("MySQL Save failed", e); }
  };

  const deleteDoctor = async (id: string) => {
      setDoctors(prev => prev.filter(d => d.id !== id));
      try { await fetch(`${API_URL}/doctors/${id}`, { method: 'DELETE' }); } catch (e) {}
  };

  const handleDeleteVisit = async (doctorId: string, visitId: string) => {
      setDoctors(prev => prev.map(doc => {
          if (doc.id === doctorId) {
              return { ...doc, visits: (doc.visits || []).filter(v => v.id !== visitId) };
          }
          return doc;
      }));
      try { await fetch(`${API_URL}/doctors/${doctorId}/visits/${visitId}`, { method: 'DELETE' }); } catch (e) {}
  };

  const syncProcedure = async (proc: Procedure, isDelete = false) => {
      if (isDelete) {
          setProcedures(prev => prev.filter(p => p.id !== proc.id));
          await fetch(`${API_URL}/procedures/${proc.id}`, { method: 'DELETE' });
      } else {
          setProcedures(prev => {
              const other = prev.filter(p => p.id !== proc.id);
              return [...other, proc];
          });
          await fetch(`${API_URL}/procedures`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(proc)
          });
      }
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <Router>
      <div className="flex h-screen bg-[#f8fafc]">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 w-full bg-slate-900 text-white z-50 p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
                <span className="font-black text-cyan-400">RC</span>
                <span className="font-bold">MediCall</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-slate-800 rounded-lg">
                <Menu className="w-6 h-6 text-white" />
            </button>
        </div>

        <Sidebar 
            user={user} 
            onLogout={handleLogout} 
            isMobileOpen={isMobileMenuOpen} 
            closeMobileMenu={() => setIsMobileMenuOpen(false)} 
            isCollapsed={isSidebarCollapsed}
            toggleCollapse={toggleSidebar}
        />
        
        <div className={`flex-1 flex flex-col h-full relative pt-16 md:pt-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <div className="absolute top-4 right-4 z-50 pointer-events-none">
              {isSyncing && <div className="bg-white/90 px-3 py-1 rounded-full shadow-sm border border-slate-100 flex items-center text-[10px] font-bold text-blue-500"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> MySQL Active</div>}
          </div>
          
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 relative z-10 w-full">
            <div className="max-w-7xl mx-auto">
                <Routes>
                <Route path="/" element={<Dashboard doctors={doctors} user={user} procedures={procedures} />} />
                <Route path="/doctors" element={<DoctorList doctors={doctors} onAddDoctor={syncDoctorsState} onDeleteDoctor={deleteDoctor} user={user} />} />
                <Route path="/doctors/:id" element={<DoctorProfile doctors={doctors} onUpdate={syncDoctorsState} onDeleteVisit={handleDeleteVisit} user={user} />} />
                <Route path="/calendar" element={<ExecutiveCalendar doctors={doctors} onUpdateDoctors={syncDoctorsState} onDeleteVisit={handleDeleteVisit} user={user} />} />
                <Route path="/procedures" element={<ProceduresManager procedures={procedures} doctors={doctors} onAddProcedure={syncProcedure} onUpdateProcedure={syncProcedure} onDeleteProcedure={(id) => syncProcedure({id} as any, true)} user={user} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;