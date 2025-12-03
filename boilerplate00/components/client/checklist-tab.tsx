"use client";

/**
 * @file checklist-tab.tsx
 * @description 체크리스트 탭 컴포넌트
 *
 * Supabase에서 로드된 체크리스트 데이터를 표시하고 관리합니다.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  Plane,
  Home,
  Car,
  Flag,
  Calendar,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChecklistItem, TimelinePhase, ChecklistFile } from "@/types/checklist";

interface ChecklistTabProps {
  movingDate?: string; // 클라이언트의 이주 날짜
  // 추가: Supabase 연동용 props (optional)
  initialData?: ChecklistItem[]; // API에서 받은 데이터
  onSave?: (items: ChecklistItem[]) => Promise<void>; // 저장 핸들러
  isLoading?: boolean; // 로딩 상태
}

// D-Day Card 컴포넌트
const DDayCard = ({ movingDate }: { movingDate?: string }) => {
  const daysUntilMoving = movingDate
    ? Math.ceil(
        (new Date(movingDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center h-48 w-full">
      <Calendar className="w-8 h-8 text-slate-800 mb-2" />
      <div className="text-4xl font-bold text-slate-800 mb-1">
        D-{daysUntilMoving}
      </div>
      <div className="text-sm text-slate-500">이주까지</div>
      {movingDate && (
        <div className="text-sm text-slate-400 mt-2">
          {new Date(movingDate).toLocaleDateString("ko-KR")}
        </div>
      )}
    </div>
  );
};

// Progress Card 컴포넌트
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

// ChecklistRow 컴포넌트 - 개별 체크리스트 항목
const ChecklistRow = ({
  item,
  onUpdateItem,
  onToggle,
  onExpand,
  isExpanded,
}: {
  item: ChecklistItem;
  onUpdateItem: (
    id: string,
    updates: Partial<ChecklistItem>,
    shouldSave?: boolean,
  ) => void;
  onToggle: (id: string) => void;
  onExpand: (id: string) => void;
  isExpanded: boolean;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const memoDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newFile: ChecklistFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file), // 로컬 URL만 사용 (Phase 1)
        timestamp: Date.now(),
      };

      onUpdateItem(item.id || item.templateId!, {
        files: [...item.files, newFile],
      });
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = (fileId: string) => {
    onUpdateItem(item.id || item.templateId!, {
      files: item.files.filter((f) => f.id !== fileId),
    });
  };

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMemo = e.target.value;

    // 로컬 상태는 즉시 업데이트 (UI 반응성)
    onUpdateItem(item.id || item.templateId!, { memo: newMemo }, false);

    // debounce: 500ms 후에만 서버에 저장
    if (memoDebounceRef.current) {
      clearTimeout(memoDebounceRef.current);
    }
    memoDebounceRef.current = setTimeout(() => {
      onUpdateItem(item.id || item.templateId!, { memo: newMemo }, true);
    }, 500);
  };

  // cleanup: 컴포넌트 unmount 시 debounce 타이머 정리
  useEffect(() => {
    return () => {
      if (memoDebounceRef.current) {
        clearTimeout(memoDebounceRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "mb-4 bg-white border rounded-2xl transition-all duration-200 shadow-sm",
        item.isCompleted
          ? "border-emerald-100 bg-slate-50"
          : "border-slate-200 hover:border-indigo-300",
      )}
    >
      <div
        className="flex items-center p-5 cursor-pointer"
        onClick={() => onExpand(item.id || item.templateId!)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id || item.templateId!);
          }}
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
            <span
              className={cn(
                "text-[11px] font-bold px-2 py-0.5 rounded-md",
                item.category.includes("필수") || item.category.includes("서류")
                  ? "bg-red-100 text-red-600"
                  : item.category.includes("집")
                  ? "bg-orange-50 text-orange-600"
                  : item.category.includes("SSN")
                  ? "bg-purple-50 text-purple-600"
                  : item.category.includes("운전")
                  ? "bg-blue-50 text-blue-600"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {item.category}
            </span>
            {item.description.some((d) => d.important) && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                필수
              </span>
            )}
            {(item.memo || item.files.length > 0) && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium ml-2">
                {item.files.length > 0 && <Paperclip className="w-3 h-3" />}
                {item.memo && <FileText className="w-3 h-3" />}
              </span>
            )}
          </div>
          <h3
            className={cn(
              "font-bold text-lg text-slate-800",
              item.isCompleted && "line-through text-slate-400",
            )}
          >
            {item.title}
          </h3>
        </div>

        <button className="text-slate-400 ml-4">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 pl-[4.5rem] animate-fadeIn border-t border-slate-50 pt-4">
          {/* Main Description */}
          <div className="space-y-3 text-slate-600 text-sm leading-relaxed mb-6">
            {item.description.map((desc, idx) => (
              <div key={idx}>
                <p
                  className={cn(
                    "flex items-start gap-2",
                    desc.important && "font-semibold text-slate-800",
                  )}
                >
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
                    <div
                      key={file.id}
                      className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 shadow-sm group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        {file.type.includes("image") ? (
                          <ImageIcon className="w-4 h-4 text-purple-500 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-700 truncate hover:text-indigo-600 hover:underline"
                        >
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
              완료 시간: {new Date().toLocaleDateString()}{" "}
              {new Date().toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function ChecklistTab({
  movingDate,
  initialData, // 추가
  onSave, // 추가
  isLoading = false, // 추가
}: ChecklistTabProps) {
  // Supabase에서 로드된 데이터 사용 (하드코딩 데이터 제거됨)
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    initialData || [],
  );

  const [activeTab, setActiveTab] = useState<TimelinePhase>(
    TimelinePhase.PRE_DEPARTURE,
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false); // 저장 중 상태 추가

  // initialData가 변경되면 checklist 상태 업데이트
  useEffect(() => {
    if (initialData !== undefined) {
      // initialData가 로드되었을 때 (빈 배열 포함)
      setChecklist(initialData);
    }
  }, [initialData]);

  // Auto expand first uncompleted item of active phase
  useEffect(() => {
    const firstUncompleted = checklist.find(
      (i) => i.phase === activeTab && !i.isCompleted,
    );
    if (firstUncompleted) {
      setExpandedItems(
        new Set([firstUncompleted.id || firstUncompleted.templateId!]),
      );
    }
  }, [activeTab, checklist]);

  const updateChecklistItem = async (
    id: string,
    updates: Partial<ChecklistItem>,
    shouldSave: boolean = true, // 기본값: true (즉시 저장)
  ) => {
    const previousChecklist = [...checklist]; // 이전 상태 저장 (에러 복구용)
    const updatedChecklist = checklist.map((item) =>
      (item.id || item.templateId) === id ? { ...item, ...updates } : item,
    );

    // 로컬 상태 즉시 업데이트 (낙관적 업데이트)
    setChecklist(updatedChecklist);

    // Supabase 연동 모드이고 onSave가 있고 shouldSave가 true면 저장
    if (onSave && shouldSave) {
      try {
        setIsSaving(true);
        await onSave(updatedChecklist);
      } catch (error) {
        console.error("[ChecklistTab] 저장 실패:", error);
        // 에러 발생 시 이전 상태로 복구
        setChecklist(previousChecklist);
        throw error;
      } finally {
        setIsSaving(false);
      }
    }
  };

  const toggleCheck = async (id: string) => {
    const item = checklist.find((i) => (i.id || i.templateId) === id);
    if (!item) return;

    const updates = {
      isCompleted: !item.isCompleted,
      completedAt: !item.isCompleted ? new Date() : undefined,
    };

    await updateChecklistItem(id, updates);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentItems = checklist.filter((item) => item.phase === activeTab);

  // Stats
  const totalItems = checklist.length;
  const completedItems = checklist.filter((i) => i.isCompleted).length;
  const globalProgress = Math.round((completedItems / totalItems) * 100);

  const tabs = [
    {
      id: TimelinePhase.PRE_DEPARTURE,
      label: "출국 전 준비",
      sub: "Preparation",
      icon: Plane,
    },
    {
      id: TimelinePhase.ARRIVAL,
      label: "입국 직후",
      sub: "Arrival",
      icon: Home,
    },
    {
      id: TimelinePhase.EARLY_SETTLEMENT,
      label: "정착 초기",
      sub: "Settlement",
      icon: Car,
    },
    {
      id: TimelinePhase.SETTLEMENT_COMPLETE,
      label: "정착 완료",
      sub: "Complete",
      icon: Flag,
    },
  ];

  // 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-slate-400 font-medium">
            체크리스트를 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  // 로딩 중이거나 데이터가 없는 경우
  if (isLoading && checklist.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-slate-500">체크리스트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 저장 중 표시 */}
      {isSaving && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 text-center">
          저장 중...
        </div>
      )}

      {/* Top Dashboard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <DDayCard movingDate={movingDate} />
        <ProgressCard percent={globalProgress} />
      </div>

      {/* Global Progress Bar Section */}
      <div className="mb-10 animate-fadeIn">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-lg font-bold">전체 진행률</h2>
          <span className="text-2xl font-bold text-slate-900">
            {globalProgress}%
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden mb-2">
          <div
            className="bg-slate-900 h-4 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${globalProgress}%` }}
          />
        </div>
        <div className="text-xs text-slate-500">
          {completedItems}/{totalItems} 완료
        </div>
      </div>

      {/* Phase Navigation Tabs */}
      <div className="flex justify-between items-center mb-8 px-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-2 group transition-all duration-300 relative px-6 py-2",
                isActive ? "opacity-100" : "opacity-40 hover:opacity-70",
              )}
            >
              <Icon
                className={cn(
                  "w-8 h-8 transition-colors",
                  isActive
                    ? "text-emerald-500"
                    : "text-slate-400 group-hover:text-slate-600",
                )}
              />
              <span
                className={cn(
                  "text-sm font-bold",
                  isActive ? "text-slate-800" : "text-slate-400",
                )}
              >
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-4 w-12 h-1 bg-emerald-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Checklist Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-slate-800">
          {tabs.find((t) => t.id === activeTab)?.label}
        </h3>
        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
          {currentItems.filter((i) => i.isCompleted).length}/
          {currentItems.length} 완료
        </span>
      </div>

      {/* Tasks List */}
      <div className="space-y-4 pb-20">
        {currentItems.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">
              이 단계에 해당하는 항목이 없습니다.
            </p>
          </div>
        ) : (
          currentItems.map((item) => (
            <ChecklistRow
              key={item.id || item.templateId}
              item={item}
              onToggle={toggleCheck}
              onUpdateItem={updateChecklistItem}
              onExpand={toggleExpand}
              isExpanded={expandedItems.has(item.id || item.templateId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
