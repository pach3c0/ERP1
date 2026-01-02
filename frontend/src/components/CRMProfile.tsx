import { ArrowLeft, Briefcase, Calendar, MessageSquare, Phone, Mail } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function CRMProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const history = [
    { type: 'meeting', title: 'Reunião de Alinhamento', date: '02/01/2026', desc: 'Cliente demonstrou interesse no produto X, ficou de retornar semana que vem.', user: 'Pacheco' },
    { type: 'call', title: 'Tentativa de Contato', date: '28/12/2025', desc: 'Liguei mas caiu na caixa postal.', user: 'Vendedor 1' },
    { type: 'email', title: 'Envio de Proposta', date: '20/12/2025', desc: 'Proposta comercial #4022 enviada por e-mail.', user: 'Pacheco' },
  ];

  const getIcon = (type: string) => {
    switch(type) {
        case 'meeting': return <Calendar size={18} className="text-blue-600"/>;
        case 'call': return <Phone size={18} className="text-green-600"/>;
        case 'email': return <Mail size={18} className="text-purple-600"/>;
        default: return <MessageSquare size={18} className="text-gray-600"/>;
    }
  };

  const getBg = (type: string) => {
    switch(type) {
        case 'meeting': return 'bg-blue-100';
        case 'call': return 'bg-green-100';
        case 'email': return 'bg-purple-100';
        default: return 'bg-gray-100';
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800 transition"><ArrowLeft size={20}/> Voltar para Lista</button>
      
      <div className="flex justify-between items-start mb-8">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><Briefcase className="text-blue-600" size={24}/></div>
                CRM - Histórico <span className="text-gray-400 font-normal text-lg ml-2">Cliente #{id}</span>
            </h1>
            <p className="text-gray-500 mt-1 ml-14">Acompanhamento de negociações e interações.</p>
        </div>
        <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition shadow-sm">Nova Interação</button>
      </div>

      <div className="space-y-6 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-200">
        {history.map((item, i) => (
            <div key={i} className="relative pl-20">
                {/* Linha do Tempo Dot */}
                <div className={`absolute left-4 top-4 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${getBg(item.type)}`}>
                    {getIcon(item.type)}
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-800 text-lg">{item.title}</h3>
                        <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded">{item.date}</span>
                    </div>
                    <p className="text-gray-600 mb-4 leading-relaxed">{item.desc}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 border-t border-gray-100 pt-3">
                        <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">{item.user.charAt(0)}</div>
                        Registrado por {item.user}
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}