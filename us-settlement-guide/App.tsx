import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  Plane, 
  Home, 
  Car, 
  Flag, 
  MessageSquare,
  X,
  Send,
  Info,
  Calendar,
  Search,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Trash2,
  Save
} from 'lucide-react';
import { CHECKLIST_DATA } from './constants';
import { ChecklistItem, TimelinePhase, ChatMessage, ChecklistFile } from './types';
import { sendMessageToGemini } from './services/geminiService';

// --- Components ---

const DDayCard = () => {
  // Hardcoded target date for demo: Dec 6, 2025
  const targetDate = new Date('2025-12-06');
  const today = new Date();
  const diffTime = Math.abs(targetDate.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center h-48 w-full">
      <Calendar className="w-8 h-8 text-slate-800 mb-2" />
      <div className="text-4xl font-bold text-slate-800 mb-1">D-{diffDays}</div>
      <div className="text-sm text-slate-500">이주까지</div>
      <div className="text-sm text-slate-400 mt-2">2025. 12. 6.</div>
    </div>
  );
};

const ProgressCard = ({ percent }: { percent: number }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center h-48 w-full">
      <div className="text-4xl font-bold text-green-500 mb-1">{percent}%</div>
      <div className="text-sm text-slate-500 mb-6">준비 진행도</div>
      
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
        <div 
          className="bg-slate-300 h-3 rounded-full transition-all duration-1000" 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

const ChecklistRow = ({ 
  item, 
  onUpdateItem,
  onToggle, 
  onExpand, 
  isExpanded 
}: { 
  item: ChecklistItem, 
  onUpdateItem: (id: string, updates: Partial<ChecklistItem>) => void,
  onToggle: (id: string) => void, 
  onExpand: (id: string) => void,
  isExpanded: boolean
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newFile: ChecklistFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file), // Create a temporary local URL
        timestamp: Date.now()
      };
      
      onUpdateItem(item.id, { files: [...item.files, newFile] });
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = (fileId: string) => {
    onUpdateItem(item.id, { files: item.files.filter(f => f.id !== fileId) });
  };

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateItem(item.id, { memo: e.target.value });
  };

  return (
    <div className={`mb-4 bg-white border rounded-2xl transition-all duration-200 shadow-sm ${item.isCompleted ? 'border-emerald-100 bg-slate-50' : 'border-slate-200 hover:border-indigo-300'}`}>
      <div className="flex items-center p-5 cursor-pointer" onClick={() => onExpand(item.id)}>
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
          className="mr-5 text-slate-300 hover:text-indigo-500 transition-colors focus:outline-none shrink-0"
        >
          {item.isCompleted ? (
            <CheckCircle className="w-7 h-7 text-emerald-500 fill-emerald-50" />
          ) : (
            <Circle className="w-7 h-7 stroke-[1.5]" />
          )}
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
             <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
               item.category.includes('필수') ? 'bg-red-100 text-red-600' :
               item.category.includes('집') ? 'bg-orange-50 text-orange-600' :
               item.category.includes('SSN') ? 'bg-purple-50 text-purple-600' :
               item.category.includes('운전') ? 'bg-blue-50 text-blue-600' :
               'bg-slate-100 text-slate-600'
             }`}>
               {item.category}
             </span>
             {item.description.some(d => d.important) && (
               <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">필수</span>
             )}
             {(item.memo || item.files.length > 0) && (
               <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium ml-2">
                 {item.files.length > 0 && <Paperclip className="w-3 h-3" />}
                 {item.memo && <FileText className="w-3 h-3" />}
               </span>
             )}
          </div>
          <h3 className={`font-bold text-lg text-slate-800 ${item.isCompleted ? 'line-through text-slate-400' : ''}`}>
            {item.title}
          </h3>
        </div>

        <button className="text-slate-400 ml-4">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 pl-[4.5rem] animate-fadeIn border-t border-slate-50 pt-4">
          
          {/* Main Description */}
          <div className="space-y-3 text-slate-600 text-sm leading-relaxed mb-6">
            {item.description.map((desc, idx) => (
              <div key={idx}>
                <p className={`flex items-start gap-2 ${desc.important ? 'font-semibold text-slate-800' : ''}`}>
                   {desc.text}
                </p>
                {desc.subText && (
                  <ul className="mt-1 space-y-1 text-slate-500 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {desc.subText.map((sub, sIdx) => (
                      <li key={sIdx} className="flex gap-2">
                        <span className="shrink-0">•</span>
                        <span>{sub}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* User Interactions Area: Memo & Files */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            
            {/* Memo Section */}
            <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
              <div className="flex items-center gap-2 mb-2 text-yellow-700 font-bold text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                <span>My Memo</span>
              </div>
              <textarea
                className="w-full bg-white border border-yellow-200 rounded-lg p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-none h-24"
                placeholder="이 항목과 관련해 기억해야 할 내용을 적어주세요."
                value={item.memo}
                onChange={handleMemoChange}
              />
            </div>

            {/* File Upload Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wider">
                  <Paperclip className="w-4 h-4" />
                  <span>Attachments</span>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 px-2 py-1 rounded-md shadow-sm transition-colors flex items-center gap-1"
                >
                  + Add File
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>

              <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
                {item.files.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 italic border-2 border-dashed border-slate-200 rounded-lg">
                    관련 서류나 사진을 업로드하세요.
                  </div>
                ) : (
                  item.files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 shadow-sm group">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {file.type.includes('image') ? (
                           <ImageIcon className="w-4 h-4 text-purple-500 shrink-0" />
                        ) : (
                           <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                        <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-slate-700 truncate hover:text-indigo-600 hover:underline">
                          {file.name}
                        </a>
                      </div>
                      <button 
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {item.isCompleted && (
            <div className="mt-4 text-xs text-slate-400 flex items-center justify-end">
              완료 시간: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AIChat = ({ onClose }: { onClose: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'model', text: '안녕하세요! 이주 준비 중 궁금한 점이 있으신가요? SSN, 집 렌트, 운전면허 등에 대해 물어보세요.', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const replyText = await sendMessageToGemini(input);
    const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: replyText, timestamp: new Date() };
    
    setMessages(prev => [...prev, modelMsg]);
    setLoading(false);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <span className="font-bold">AI Assistant</span>
        </div>
        <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-slate-50" ref={scrollRef}>
        {messages.map((m) => (
          <div key={m.id} className={`mb-4 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
             <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-2 items-center">
               <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
               <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75" />
               <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150" />
             </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input 
            type="text" 
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="궁금한 내용을 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(CHECKLIST_DATA);
  const [activeTab, setActiveTab] = useState<TimelinePhase>(TimelinePhase.ARRIVAL);
  const [mainTab, setMainTab] = useState<'profile' | 'housing' | 'checklist' | 'chat'>('checklist');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showChat, setShowChat] = useState(false);

  // Auto expand first uncompleted item of active phase
  useEffect(() => {
    const firstUncompleted = checklist.find(i => i.phase === activeTab && !i.isCompleted);
    if (firstUncompleted) {
      setExpandedItems(new Set([firstUncompleted.id]));
    }
  }, [activeTab]);

  const updateChecklistItem = (id: string, updates: Partial<ChecklistItem>) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const toggleCheck = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    ));
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentItems = checklist.filter(item => item.phase === activeTab);
  
  // Stats
  const totalItems = checklist.length;
  const completedItems = checklist.filter(i => i.isCompleted).length;
  const globalProgress = Math.round((completedItems / totalItems) * 100);

  const tabs = [
    { id: TimelinePhase.PRE_DEPARTURE, label: '출국 전 준비', sub: 'Preparation', icon: Plane },
    { id: TimelinePhase.ARRIVAL, label: '입국 직후', sub: 'Arrival', icon: Home },
    { id: TimelinePhase.EARLY_SETTLEMENT, label: '정착 초기', sub: 'Settlement', icon: Car },
    { id: TimelinePhase.SETTLEMENT_COMPLETE, label: '정착 완료', sub: 'Complete', icon: Flag },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-extrabold text-lg text-slate-800">내 이주 준비</div>
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-slate-400" />
            <div className="flex items-center gap-2">
               <span className="text-sm font-semibold text-slate-600">영설화</span>
               <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center text-white text-xs font-bold">U</div>
            </div>
            <button className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold">새로운 Chat</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Top Dashboard Widgets */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <DDayCard />
          <ProgressCard percent={globalProgress} />
        </div>

        {/* Main Tab Navigation */}
        <div className="flex mb-8 bg-slate-50 p-1 rounded-xl">
          {['내 프로필', '주거옵션', '체크리스트', '채팅'].map((label, idx) => {
            const key = ['profile', 'housing', 'checklist', 'chat'][idx] as any;
            return (
              <button
                key={key}
                onClick={() => setMainTab(key)}
                className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                  mainTab === key 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Global Progress Bar Section */}
        {mainTab === 'checklist' && (
          <div className="mb-10 animate-fadeIn">
            <div className="flex justify-between items-end mb-2">
              <h2 className="text-lg font-bold">전체 진행률</h2>
              <span className="text-2xl font-bold text-slate-900">{globalProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden mb-2">
               <div 
                 className="bg-slate-900 h-4 rounded-full transition-all duration-1000 ease-out" 
                 style={{ width: `${globalProgress}%` }} 
               />
            </div>
            <div className="text-xs text-slate-500">{completedItems}/{totalItems} 완료</div>
          </div>
        )}

        {/* Phase Tabs (Checklist Sub-navigation) */}
        {mainTab === 'checklist' && (
          <div>
            {/* Phase Navigation Tabs */}
            <div className="flex justify-between items-center mb-8 px-4">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center gap-2 group transition-all duration-300 relative px-6 py-2 ${
                      isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                    }`}
                  >
                    <Icon 
                      className={`w-8 h-8 transition-colors ${
                        isActive ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-600'
                      }`} 
                    />
                    <span className={`text-sm font-bold ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                      {tab.label}
                    </span>
                    {isActive && (
                      <div className="absolute -bottom-4 w-12 h-1 bg-emerald-500 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Checklist Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800">
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                {currentItems.filter(i => i.isCompleted).length}/{currentItems.length} 완료
              </span>
            </div>

            {/* Tasks List */}
            <div className="space-y-4 pb-20">
              {currentItems.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">No tasks found for this phase.</p>
                </div>
              ) : (
                currentItems.map(item => (
                  <ChecklistRow 
                    key={item.id} 
                    item={item} 
                    onToggle={toggleCheck} 
                    onUpdateItem={updateChecklistItem}
                    onExpand={toggleExpand}
                    isExpanded={expandedItems.has(item.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {mainTab !== 'checklist' && (
          <div className="text-center py-20 text-slate-400">
            <Info className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Content for {mainTab} tab is under construction.</p>
          </div>
        )}
      </main>

      {/* Floating Chat Button */}
      {!showChat && (
        <button 
          onClick={() => setShowChat(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all z-30"
        >
          <MessageSquare className="w-7 h-7" />
        </button>
      )}

      {/* Chat Sidebar */}
      {showChat && <AIChat onClose={() => setShowChat(false)} />}
    </div>
  );
}