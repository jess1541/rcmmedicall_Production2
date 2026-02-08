
import React, { useMemo, useState } from 'react';
import { Doctor, User, Procedure, Visit } from '../types';
// Add Clock to the list of imports from lucide-react
import { ShieldCheck, Download, Calendar, ArrowRight, CheckCircle2, MapPin, Activity, FileSpreadsheet, Stethoscope, Check, Filter, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  doctors: Doctor[];
  user: User;
  procedures: Procedure[];
}

const Dashboard: React.FC<DashboardProps> = ({ doctors, user, procedures }) => {
  const navigate = useNavigate();
  const [filterExecutive, setFilterExecutive] = useState<string | null>(user.role === 'executive' ? user.name : null);

  const filteredDoctors = useMemo(() => {
      return filterExecutive ? doctors.filter(d => d.executive === filterExecutive) : doctors;
  }, [doctors, filterExecutive]);

  const todaysAgenda = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const agenda: { doctor: Doctor, visit: Visit }[] = [];
      filteredDoctors.forEach(doc => {
          (doc.visits || []).forEach(visit => {
              if (visit.date === todayStr && visit.status === 'planned' && visit.outcome !== 'CITA') {
                  agenda.push({ doctor: doc, visit });
              }
          });
      });
      return agenda.sort((a, b) => (a.visit.time || '00:00').localeCompare(b.visit.time || '00:00'));
  }, [filteredDoctors]);

  const stats = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    let completedVisits = 0;
    let plannedVisits = 0;
    const classifications = { A: 0, B: 0, C: 0, None: 0 };

    filteredDoctors.forEach(doc => {
        (doc.visits || []).forEach(v => {
            const vDate = new Date(v.date + 'T00:00:00');
            if (vDate.getMonth() === currentMonth && vDate.getFullYear() === currentYear) {
                if (v.status === 'completed') completedVisits++;
                else plannedVisits++;
            }
        });
        if (doc.classification === 'A') classifications.A++;
        else if (doc.classification === 'B') classifications.B++;
        else if (doc.classification === 'C') classifications.C++;
        else classifications.None++;
    });

    const relevantProcedures = procedures.filter(p => {
        const pDate = new Date(p.date + 'T00:00:00');
        const belongs = filterExecutive ? filteredDoctors.some(d => d.id === p.doctorId) : true;
        return p.status === 'performed' && pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear && belongs;
    });

    return { 
        totalDoctors: filteredDoctors.length, 
        completedVisits, 
        proceduresCount: relevantProcedures.length,
        totalRevenue: relevantProcedures.reduce((a, c) => a + (c.cost || 0), 0),
        performance: (plannedVisits + completedVisits) > 0 ? Math.round((completedVisits / (plannedVisits + completedVisits)) * 100) : 0,
        classifications
    };
  }, [filteredDoctors, procedures, filterExecutive]);

  const handleExport = () => {
    const headers = ["Ejecutivo", "Efectividad %", "Visitas Realizadas", "Ventas Estimadas"];
    const row = [filterExecutive || user.name, `${stats.performance}%`, stats.completedVisits, `$${stats.totalRevenue}`];
    const csvContent = headers.join(',') + '\n' + row.join(',');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_Mensual_${user.name}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Hola, <span className="text-blue-600">{user.name}</span></h1>
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] flex items-center gap-2 mt-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> {user.role === 'admin' ? 'ESTADÍSTICAS GLOBALES' : 'RESUMEN DE MI CARTERA'}
            </p>
          </div>
          <div className="flex gap-3">
            {user.role === 'admin' && filterExecutive && (
                <button onClick={() => setFilterExecutive(null)} className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all hover:bg-blue-700 active:scale-95">
                    <Filter className="w-3 h-3" /> Ver Todo el Equipo
                </button>
            )}
            <button onClick={handleExport} className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-slate-900/20 flex items-center gap-2 transition-all hover:bg-slate-800 active:scale-95">
                <Download className="w-3 h-3" /> Generar Excel
            </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-3"><Calendar className="w-5 h-5 text-blue-500" /> Agenda Pendiente</h3>
                      <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase">{todaysAgenda.length} Visitas hoy</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto p-6 space-y-3 no-scrollbar">
                      {todaysAgenda.length > 0 ? todaysAgenda.map((item, idx) => (
                          <div key={idx} onClick={() => navigate(`/calendar?exec=${item.doctor.executive}`)} className="flex items-center justify-between p-5 rounded-3xl border border-slate-50 hover:border-blue-200 transition-all bg-white shadow-sm cursor-pointer group">
                              <div className="flex items-center gap-4">
                                  <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-blue-50 transition-colors">
                                      <Clock className="w-4 h-4 text-slate-300 group-hover:text-blue-400" />
                                      <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-600 mt-1">{item.visit.time || '--:--'}</span>
                                  </div>
                                  <div>
                                      <h4 className="font-black text-slate-800 uppercase text-xs group-hover:text-blue-700 transition-colors">{item.doctor.name}</h4>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {item.doctor.hospital || item.doctor.address.substring(0, 35)}</p>
                                  </div>
                              </div>
                              <div className="p-3 bg-green-50 text-green-600 rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-all"><Check className="w-5 h-5" /></div>
                          </div>
                      )) : (
                        <div className="text-center py-20">
                            <CheckCircle2 className="h-12 w-12 text-slate-100 mx-auto mb-4" />
                            <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Sin visitas pendientes para hoy</p>
                        </div>
                      )}
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
                      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp className="w-32 h-32" /></div>
                      <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-2">Efectividad Mes</p>
                      <p className="text-4xl font-black">{stats.performance}%</p>
                      <div className="w-full bg-white/20 h-2 rounded-full mt-6 overflow-hidden"><div className="bg-white h-full shadow-[0_0_10px_white]" style={{ width: `${stats.performance}%` }}></div></div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Procedimientos</p>
                      <p className="text-4xl font-black text-slate-800">{stats.proceduresCount}</p>
                      <Activity className="w-5 h-5 text-red-400 mt-4" />
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ventas Brutas</p>
                      <p className="text-3xl font-black text-slate-800">${(stats.totalRevenue/1000).toFixed(1)}k</p>
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400 mt-5" />
                  </div>
              </div>
          </div>

          <div className="space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase mb-6 tracking-[0.2em] border-b border-slate-50 pb-4">Clasificación Cartera</h3>
                  <div className="space-y-4">
                      {['A', 'B', 'C'].map(cat => (
                          <div key={cat} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-default">
                              <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase ${cat === 'A' ? 'bg-emerald-50 text-emerald-600' : cat === 'B' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>{cat === 'A' ? 'VIP' : cat === 'B' ? 'REG' : 'BAS'} ({cat})</span>
                              <span className="text-lg font-black text-slate-700">{(stats.classifications as any)[cat]}</span>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                  <h3 className="text-[11px] font-black text-slate-500 uppercase mb-6 tracking-[0.2em] flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Resumen de Activos</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">Total Médicos</span>
                        <span className="text-xl font-black">{stats.totalDoctors}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">Visitas Logradas</span>
                        <span className="text-xl font-black text-emerald-400">{stats.completedVisits}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-800">
                        <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed tracking-wider">Los datos se actualizan automáticamente cada 20 segundos.</p>
                    </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
