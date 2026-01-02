import { ArrowLeft, DollarSign, Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function FinancialProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto">
      <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800 transition">
        <ArrowLeft size={20}/> Voltar para Lista
      </button>
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><Wallet className="text-green-600" size={24}/></div>
            Ficha Financeira <span className="text-gray-400 font-normal text-lg ml-2">Cliente #{id}</span>
        </h1>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2">
            <DollarSign size={18}/> Novo Título
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
                <p className="text-gray-500 text-sm font-medium uppercase">Em Aberto</p>
                <AlertCircle className="text-orange-400" size={20}/>
            </div>
            <p className="text-3xl font-bold text-gray-800">R$ 1.250,00</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
                <p className="text-gray-500 text-sm font-medium uppercase">Vencidos</p>
                <AlertCircle className="text-red-500" size={20}/>
            </div>
            <p className="text-3xl font-bold text-gray-400">R$ 0,00</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
                <p className="text-gray-500 text-sm font-medium uppercase">Limite de Crédito</p>
                <CheckCircle className="text-green-500" size={20}/>
            </div>
            <p className="text-3xl font-bold text-green-600">R$ 5.000,00</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 h-64 flex flex-col items-center justify-center text-gray-400 gap-3">
        <Wallet size={48} className="opacity-20"/>
        <p>Histórico de Títulos e Movimentações virá aqui.</p>
      </div>
    </div>
  );
}