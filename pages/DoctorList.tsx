import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doctor, User } from '../types';
import { Search, Filter, MapPin, Stethoscope, Download, Plus, X, ArrowRight, Building2, Briefcase, ChevronDown, Save, Activity } from 'lucide-react';

interface DoctorListProps {
  doctors: Doctor[];
  onAddDoctor?: (doc: Doctor) => void;
  onDeleteDoctor?: (id: string) => void;
  user: User;
}

type TabType = 'MEDICO' | 'ADMINISTRATIVO' | 'HOSPITAL';

const DoctorList: React.FC<DoctorListProps> = ({ doctors, onAddDoctor, user }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState('TODOS');
  const [activeTab, setActiveTab] = useState<TabType>('MEDICO');
  const [visibleCount, setVisibleCount] = useState(24);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<Doctor>>({
    name: '',
    specialty: '',
    address: '',
    executive: user.role === 'executive' ? user.name : 'LUIS',
    category: 'MEDICO'
  });
  
  const executives = useMemo(() => {
    const execs = new Set(doctors.map(d => d.executive.trim().toUpperCase()));
    return ['TODOS', ...Array.from(execs).sort()];
  }, [doctors]);

  const filteredItems = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return doctors.filter(doc => {
      const category = doc.category || 'MEDICO';
      const matchesSearch = doc.name.toLowerCase().includes(searchLower) || 
                            (doc.specialty && doc.specialty.toLowerCase().includes(searchLower));
      const docExec = doc.executive.trim().toUpperCase();
      const matchesExec = selectedExecutive === 'TODOS' || docExec === selectedExecutive;
      const matchesTab = category === activeTab;
      return matchesSearch && matchesExec && matchesTab;
    });
  }, [doctors, searchTerm, selectedExecutive, activeTab]);

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);

  const handleExport = () => {
    const headers = ["Ejecutivo", "Nombre", "Especialidad", "Direccion", "Hospital"];
    const csvRows = [headers.join(','), ...filteredItems.map(doc => [
        `"${doc.executive}"`, `"${doc.name}"`, `"${doc.specialty || ''}"`, `"${doc.address}"`, `"${doc.hospital || ''}"`
    ].join(','))];
    const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `directorio_medicall_${activeTab.toLowerCase()}.csv`;
    link.click();
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !onAddDoctor) return;
    const newDoc = { 
        ...formData, 
        id: `man-${Date.now()}`, 
        category: activeTab, 
        visits: [], 
        schedule: [],
        name: formData.name.toUpperCase(),
        address: (formData.address || '').toUpperCase(),
        specialty: (formData.specialty || '').toUpperCase()
    } as Doctor;
    onAddDoctor(newDoc);
    setIsAddModalOpen(false);
    setFormData({ name: '', specialty: '', address: '', executive: user.name, category: 'MEDICO' });
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Directorio</h1>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Base de Datos Centralizada</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => setIsAddModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition font-black text-xs uppercase shadow-lg shadow-blue-500/20"><Plus className="h-4 w-4 mr-2" /> Nuevo Registro</button>
            <button onClick={handleExport} className="flex-1 md:flex-none flex items-center justify-center px-4 py-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-100 transition font-black text-xs uppercase"><Download className="h-4 w-4 mr-2" /> Exportar</button>
        </div>
      </div>

      <div className="flex space-x-1 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
          {(['MEDICO', 'ADMINISTRATIVO', 'HOSPITAL'] as TabType[]).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setVisibleCount(24); }} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab === 'MEDICO' ? 'MÉDICOS' : (tab === 'ADMINISTRATIVO' ? 'ADMINISTRATIVO' : 'HOSPITALES')}
              </button>
          ))}
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative group">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input type="text" className="block w-full pl-12 pr-4 py-3 border border-slate-100 rounded-2xl text-sm bg-slate-50 text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 uppercase font-medium transition-all" placeholder="Buscar por nombre o especialidad..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="relative">
            <Filter className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <select className="block w-full pl-10 pr-4 py-3 text-xs font-black border border-slate-100 bg-slate-50 text-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer" value={selectedExecutive} onChange={(e) => setSelectedExecutive(e.target.value)}>
                {executives.map(exec => <option key={exec} value={exec}>{exec}</option>)}
            </select>
        </div>
      </div>

      {visibleItems.length > 0 ? (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleItems.map((item) => (
                <div key={item.id} onClick={() => navigate(`/doctors/${item.id}`)} className="group bg-white rounded-[2.5rem] border border-slate-100 hover:border-blue-300 cursor-pointer transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 relative overflow-hidden">
                    <div className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`rounded-2xl p-3 text-white shadow-lg ${activeTab === 'MEDICO' ? 'bg-blue-500 shadow-blue-500/20' : activeTab === 'ADMINISTRATIVO' ? 'bg-purple-500 shadow-purple-500/20' : 'bg-emerald-500 shadow-emerald-500/20'}`}>
                                {activeTab === 'MEDICO' ? <Stethoscope className="h-6 w-6" /> : activeTab === 'ADMINISTRATIVO' ? <Briefcase className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                            </div>
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-tighter">{item.executive}</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-800 line-clamp-2 uppercase group-hover:text-blue-600 transition-colors leading-tight">{item.name}</h3>
                        <div className="mt-4 space-y-2">
                            <p className="text-xs text-slate-500 font-bold uppercase truncate flex items-center"><Activity className="w-3 h-3 mr-2 text-slate-300" /> {item.specialty || 'GENERAL'}</p>
                            <div className="flex items-start text-xs text-slate-400 uppercase line-clamp-2 leading-relaxed"><MapPin className="h-3 w-3 mr-2 mt-1 flex-shrink-0" /> {item.address}</div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ver Expediente</span>
                            <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </div>
                    </div>
                </div>
            ))}
            </div>
            {filteredItems.length > visibleCount && (
                <button onClick={() => setVisibleCount(prev => prev + 24)} className="w-full py-4 bg-white border border-slate-100 rounded-[2rem] text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-2">Cargar más resultados <ChevronDown className="w-4 h-4" /></button>
            )}
        </div>
      ) : (
          <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-[3rem]">
              <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-black text-sm uppercase tracking-widest">Sin coincidencias</p>
          </div>
      )}
      
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Nuevo {activeTab}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase">Registro Manual de Contacto</p>
                      </div>
                      <button onClick={() => setIsAddModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X className="h-6 w-6 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleCreate} className="p-8 space-y-5">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nombre Completo</label>
                          <input type="text" required className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold uppercase focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="EJ: DR. ALEJANDRO PÉREZ" />
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Especialidad / Área</label>
                              <input type="text" className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold uppercase focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} placeholder="EJ: UROLOGÍA" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Ejecutivo Asignado</label>
                              <select className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm appearance-none cursor-pointer" value={formData.executive} onChange={e => setFormData({...formData, executive: e.target.value})}>
                                  {executives.filter(e => e !== 'TODOS').map(e => <option key={e} value={e}>{e}</option>)}
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Dirección de Consultorio / Hospital</label>
                          <textarea className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-bold uppercase focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm resize-none" rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="CALLE, NÚMERO, COLONIA, CIUDAD..." />
                      </div>
                      <div className="pt-6 flex justify-end gap-3">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-3 text-xs font-black text-slate-400 uppercase hover:text-slate-600 transition-colors">Cancelar</button>
                          <button type="submit" className="px-10 py-3 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95"><Save className="w-4 h-4" /> Guardar en Directorio</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default DoctorList;