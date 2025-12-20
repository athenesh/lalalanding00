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
  Paperclip,
  FileText,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChecklistItem, TimelinePhase, ChecklistFile } from "@/types/checklist";
import { useToast } from "@/hooks/use-toast";

interface ChecklistTabProps {
  movingDate?: string; // 클라이언트의 이주 날짜
  // 추가: Supabase 연동용 props (optional)
  initialData?: ChecklistItem[]; // API에서 받은 데이터
  onSave?: (
    items: ChecklistItem[],
    options?: { showToast?: boolean },
  ) => Promise<void>; // 저장 핸들러 (옵션으로 토스트 표시 여부 제어)
  isLoading?: boolean; // 로딩 상태
  onRefresh?: () => Promise<void>; // 데이터 새로고침 콜백 (파일 업로드 후 사용)
}

// ChecklistRow 컴포넌트 - 개별 체크리스트 항목
const ChecklistRow = ({
  item,
  onUpdateItem,
  onToggle,
  onExpand,
  isExpanded,
  onRefresh,
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
  onRefresh?: () => Promise<void>;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const memoDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const templateId = item.templateId;
    let itemId = item.id;

    if (!templateId) {
      console.error("[checklist-tab] 템플릿 ID가 없습니다.");
      toast({
        title: "업로드 실패",
        description: "체크리스트 항목 정보가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    // 로딩 상태 표시를 위한 임시 파일 추가
    const tempFile: ChecklistFile = {
      id: `temp-${Date.now()}`,
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file), // 임시 미리보기용
      timestamp: Date.now(),
    };

    // 낙관적 업데이트: 즉시 UI에 표시 (저장하지 않음)
    onUpdateItem(
      templateId,
      {
        files: [...item.files, tempFile],
      },
      false,
    ); // shouldSave = false로 설정하여 서버 저장 방지

    try {
      console.log("[checklist-tab] 파일 업로드 시작:", {
        fileName: file.name,
        fileSize: file.size,
        itemId,
        templateId,
        hasItemId: !!itemId,
      });

      // 체크리스트 항목이 없으면 먼저 생성
      if (!itemId) {
        console.log("[checklist-tab] 체크리스트 항목 생성 시작:", {
          templateId,
        });

        try {
          // 체크리스트 항목 생성 (최소한의 데이터만)
          const createResponse = await fetch("/api/client/checklist", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              items: [
                {
                  templateId: templateId,
                  is_completed: false,
                  notes: null,
                  completed_at: null,
                },
              ],
            }),
          });

          if (!createResponse.ok) {
            const error = await createResponse.json();
            console.error("[checklist-tab] 체크리스트 항목 생성 실패:", error);
            throw new Error(
              error.error || "체크리스트 항목 생성 실패",
            );
          }

          const createResult = await createResponse.json();
          console.log("[checklist-tab] 체크리스트 항목 생성 성공:", createResult);

          // 생성된 항목의 ID 가져오기
          const createdItem = createResult.updated?.find(
            (u: any) => u.template_id === templateId,
          );
          if (createdItem?.id) {
            itemId = createdItem.id;
            console.log("[checklist-tab] 생성된 항목 ID:", itemId);

            // 로컬 상태 업데이트 (생성된 ID 반영)
            // templateId로 찾아서 id를 업데이트
            onUpdateItem(
              templateId,
              {
                id: itemId,
              },
              false,
            );
          } else {
            // updated 배열이 비어있거나 찾을 수 없는 경우, count를 확인
            if (createResult.count > 0) {
              // 항목이 생성되었지만 응답 형식이 다를 수 있음
              // 다시 조회해서 ID 가져오기
              console.log("[checklist-tab] 생성된 항목을 다시 조회합니다.");
              // 일단 templateId를 itemId로 사용하고, 파일 업로드 시 다시 확인
              // 실제로는 체크리스트를 다시 로드해야 하지만, 일단 진행
            } else {
              throw new Error("생성된 항목 ID를 찾을 수 없습니다.");
            }
          }
        } catch (createError) {
          console.error("[checklist-tab] 체크리스트 항목 생성 실패:", createError);
          throw new Error(
            `체크리스트 항목 생성 실패: ${
              createError instanceof Error
                ? createError.message
                : "알 수 없는 오류"
            }`,
          );
        }
      }

      if (!itemId) {
        throw new Error("체크리스트 항목 ID를 가져올 수 없습니다.");
      }

      // FormData 생성
      const formData = new FormData();
      formData.append("file", file);
      formData.append("item_id", itemId);

      console.log("[checklist-tab] 파일 업로드 API 호출:", {
        fileName: file.name,
        itemId,
      });

      // 파일 업로드 API 호출
      const response = await fetch("/api/client/checklist/files", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[checklist-tab] 파일 업로드 API 에러:", {
          status: response.status,
          error,
        });
        throw new Error(error.error || "파일 업로드 실패");
      }

      const result = await response.json();
      console.log("[checklist-tab] 파일 업로드 성공:", result);

      // 임시 파일을 실제 파일로 교체
      const uploadedFile: ChecklistFile = {
        id: result.documentId || tempFile.id,
        name: file.name,
        type: file.type,
        url: result.fileUrl || tempFile.url,
        timestamp: Date.now(),
        file_url: result.fileUrl,
        document_id: result.documentId,
      };

      // 현재 항목의 파일 목록 가져오기 (임시 파일 포함)
      // item.files는 이미 tempFile이 추가된 상태이므로, tempFile을 제거하고 uploadedFile을 추가
      const currentFiles = item.files || [];
      const updatedFiles = currentFiles
        .filter((f) => f.id !== tempFile.id)
        .concat(uploadedFile);

      console.log("[checklist-tab] 파일 목록 업데이트:", {
        beforeCount: currentFiles.length,
        afterCount: updatedFiles.length,
        tempFileId: tempFile.id,
        uploadedFileId: uploadedFile.id,
      });

      // 생성된 itemId가 있으면 그것을 사용, 없으면 templateId 사용
      const updateId = itemId || templateId;
      onUpdateItem(
        updateId,
        {
          files: updatedFiles,
          ...(itemId && !item.id ? { id: itemId } : {}), // 생성된 ID가 있으면 반영
        },
        false,
      ); // shouldSave = false로 설정하여 서버 저장 방지

      toast({
        title: "업로드 완료",
        description: "파일이 성공적으로 업로드되었습니다.",
      });

      // 파일 업로드 후 데이터 새로고침 (서버에서 최신 파일 목록 가져오기)
      if (onRefresh) {
        console.log("[checklist-tab] 파일 업로드 후 데이터 새로고침 시작");
        try {
          await onRefresh();
          console.log("[checklist-tab] 데이터 새로고침 완료");
        } catch (refreshError) {
          console.error("[checklist-tab] 데이터 새로고침 실패:", refreshError);
          // 새로고침 실패해도 업로드는 성공했으므로 계속 진행
        }
      }
    } catch (error) {
      console.error("[checklist-tab] 파일 업로드 실패:", error);

      // 에러 발생 시 임시 파일 제거
      const updatedFiles = item.files.filter((f) => f.id !== tempFile.id);
      const updateId = itemId || templateId;
      onUpdateItem(
        updateId,
        {
          files: updatedFiles,
        },
        false,
      ); // shouldSave = false로 설정

      // 사용자에게 에러 알림
      toast({
        title: "업로드 실패",
        description:
          error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const file = item.files.find((f) => f.id === fileId);
    if (!file) return;

    const itemId = item.id || item.templateId;
    if (!itemId) return;

    // 낙관적 업데이트: 즉시 UI에서 제거
    const updatedFiles = item.files.filter((f) => f.id !== fileId);
    // 파일 삭제는 이미 API를 통해 완료되므로 로컬 상태만 업데이트 (shouldSave: false)
    onUpdateItem(itemId, {
      files: updatedFiles,
    }, false); // shouldSave: false - 파일 삭제는 별도 API로 처리되므로 체크리스트 저장 불필요

    // 임시 파일이면 서버 삭제 불필요
    if (fileId.startsWith("temp-")) {
      return;
    }

    // 실제 파일이면 Supabase에서도 삭제
    if (file.document_id && file.file_url) {
      try {
        console.log("[checklist-tab] 파일 삭제 시작:", {
          documentId: file.document_id,
          fileUrl: file.file_url,
        });

        // file_url에서 경로 추출
        // 예: https://xxx.supabase.co/storage/v1/object/public/uploads/user_id/checklist/item_id/filename.jpg
        // -> user_id/checklist/item_id/filename.jpg
        const urlParts = file.file_url.split("/uploads/");
        const filePath = urlParts.length > 1 ? urlParts[1] : null;

        if (!filePath) {
          console.error(
            "[checklist-tab] 파일 경로를 추출할 수 없습니다:",
            file.file_url,
          );
          // 파일 경로 추출 실패 시 UI에서 파일 다시 추가
          onUpdateItem(itemId, {
            files: [...updatedFiles, file],
          }, false);
          return;
        }

        const response = await fetch(
          `/api/client/checklist/files?document_id=${
            file.document_id
          }&file_path=${encodeURIComponent(filePath)}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "파일 삭제 실패");
        }

        console.log("[checklist-tab] 파일 삭제 성공:", file.document_id);
        
        // 성공 메시지 표시
        toast({
          title: "파일 삭제 완료",
          description: `${file.name} 파일이 삭제되었습니다.`,
        });
      } catch (error) {
        console.error("[checklist-tab] 파일 삭제 실패:", error);

        // 에러 발생 시 파일 다시 추가 (로컬 상태만 업데이트)
        onUpdateItem(itemId, {
          files: [...updatedFiles, file],
        }, false); // shouldSave: false

        alert(
          `파일 삭제 실패: ${
            error instanceof Error ? error.message : "알 수 없는 오류"
          }`,
        );
      }
    }
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
          <div className="space-y-4 text-slate-600 text-sm leading-relaxed mb-6">
            {item.description.map((desc, idx) => {
              // 메인 설명 텍스트 (important가 true이고 subText가 없는 경우)
              if (desc.important && !desc.subText) {
                return (
                  <p key={idx} className="text-slate-700 leading-relaxed">
                    {desc.text}
                  </p>
                );
              }

              // "체크리스트" 제목 + 불릿 포인트 리스트 (스크린샷 스타일)
              if (desc.text === "체크리스트" && desc.subText) {
                return (
                  <div key={idx} className="space-y-2">
                    <h4 className="font-semibold text-slate-800 text-sm mb-2">
                      {desc.text}
                    </h4>
                    <ul className="space-y-1.5 text-slate-600">
                      {desc.subText.map((sub, sIdx) => (
                        <li key={sIdx} className="flex gap-2 items-start">
                          <span className="shrink-0 text-slate-400 mt-0.5">
                            •
                          </span>
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }

              // 일반 설명 텍스트 (subText가 없는 경우)
              if (!desc.subText) {
                return (
                  <p key={idx} className="text-slate-700 leading-relaxed">
                    {desc.text}
                  </p>
                );
              }

              // 제목 + 하위 항목이 있는 경우 (기타 제목들)
              return (
                <div key={idx} className="space-y-2">
                  <h4 className="font-semibold text-slate-800 text-sm">
                    {desc.text}
                  </h4>
                  {desc.subText && (
                    <ul className="mt-1 space-y-1.5 text-slate-500 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {desc.subText.map((sub, sIdx) => (
                        <li key={sIdx} className="flex gap-2">
                          <span className="shrink-0">•</span>
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
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
                          href={`/api/client/checklist/files/download?document_id=${file.document_id}`}
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
  onRefresh, // 추가
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
  const [isInitialized, setIsInitialized] = useState(false); // 초기화 여부
  // 변경된 항목 추적 (templateId 또는 id를 Set으로 저장)
  const [changedItems, setChangedItems] = useState<Set<string>>(new Set());

  // initialData가 변경되면 checklist 상태 업데이트
  // 단, 저장 중이 아닐 때만 업데이트 (무한 루프 방지)
  useEffect(() => {
    if (initialData !== undefined && !isSaving) {
      // 초기 로드 시에만 전체 덮어쓰기
      if (!isInitialized) {
        setChecklist(initialData);
        setIsInitialized(true);
      } else {
        // 이후에는 서버 응답과 로컬 상태를 병합 (편집 중인 메모 보호)
        setChecklist((prevChecklist) => {
          const updatedMap = new Map(
            initialData.map((item) => [item.templateId, item])
          );

          return prevChecklist.map((prevItem) => {
            const serverItem = updatedMap.get(prevItem.templateId);
            if (serverItem) {
              // 서버에서 받은 데이터로 업데이트하되, 메모는 현재 입력 중인 값 우선
              // (서버 응답이 현재 입력과 다를 수 있으므로)
              return {
                ...serverItem,
                // 메모는 현재 로컬 상태 유지 (사용자가 입력 중일 수 있음)
                memo: prevItem.memo !== undefined ? prevItem.memo : serverItem.memo || "",
              };
            }
            return prevItem;
          });
        });
      }
    }
  }, [initialData, isSaving, isInitialized]);

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
    shouldSave: boolean = false, // 기본값: false (저장 버튼으로만 저장)
  ) => {
    const previousChecklist = [...checklist]; // 이전 상태 저장 (에러 복구용)
    const updatedChecklist = checklist.map((item) => {
      if ((item.id || item.templateId) === id) {
        // files 배열이 있으면 기존 파일과 병합
        if (updates.files) {
          return { ...item, ...updates, files: updates.files };
        }
        return { ...item, ...updates };
      }
      return item;
    });

    console.log("[checklist-tab] updateChecklistItem 호출:", {
      id,
      hasFiles: !!updates.files,
      filesCount: updates.files?.length || 0,
      updatedChecklistLength: updatedChecklist.length,
      shouldSave,
    });

    // 로컬 상태 즉시 업데이트 (낙관적 업데이트)
    setChecklist(updatedChecklist);

    // 변경된 항목 추적 (파일 업로드/삭제와 메모는 제외)
    // 파일은 별도 API로 처리되고, 메모는 debounce로 자동 저장되므로 제외
    if (!updates.files && !updates.memo) {
      setChangedItems((prev) => new Set(prev).add(id));
      console.log("[checklist-tab] 변경된 항목 추가:", id);
    }

    // Supabase 연동 모드이고 onSave가 있고 shouldSave가 true면 저장
    // 단, 이미 저장 중이면 무시 (무한 루프 방지)
    if (onSave && shouldSave && !isSaving) {
      try {
        setIsSaving(true);
        // 메모 저장 시에는 토스트를 표시하지 않음 (showToast: false)
        await onSave(updatedChecklist, { showToast: false });
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

  const toggleCheck = (id: string) => {
    const item = checklist.find((i) => (i.id || i.templateId) === id);
    if (!item) return;

    const updates = {
      isCompleted: !item.isCompleted,
      completedAt: !item.isCompleted ? new Date() : undefined,
    };

    // shouldSave: false로 설정하여 로컬 상태만 업데이트 (저장 버튼으로만 저장)
    updateChecklistItem(id, updates, false);
  };

  // 저장 버튼 클릭 핸들러
  const handleSaveChanges = async () => {
    if (!onSave || changedItems.size === 0) {
      console.log("[checklist-tab] 저장할 항목이 없거나 onSave가 없습니다.");
      return;
    }

    try {
      setIsSaving(true);
      console.log("[checklist-tab] 변경된 항목 저장 시작:", {
        changedCount: changedItems.size,
        changedItems: Array.from(changedItems),
      });

      // 저장 버튼 클릭 시에는 토스트를 표시함 (showToast: true)
      await onSave(checklist, { showToast: true });
      
      // 저장 성공 시 변경 추적 초기화
      setChangedItems(new Set());
      
      console.log("[checklist-tab] 변경된 항목 저장 완료");
    } catch (error) {
      console.error("[checklist-tab] 저장 실패:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentItems = checklist.filter((item) => {
    // enum과 문자열 모두 비교 가능하도록
    const itemPhase = String(item.phase);
    const activePhase = String(activeTab);

    // 디버깅 로그 추가
    if (activeTab === TimelinePhase.SETTLEMENT_COMPLETE) {
      console.log("[checklist-tab] SETTLEMENT_COMPLETE 필터링:", {
        itemTitle: item.title,
        itemPhase,
        activePhase,
        matches: itemPhase === activePhase,
      });
    }

    return itemPhase === activePhase;
  });

  // 디버깅: 정착 완료 탭일 때 전체 체크리스트 확인
  useEffect(() => {
    if (activeTab === TimelinePhase.SETTLEMENT_COMPLETE) {
      console.log("[checklist-tab] 정착 완료 탭 활성화:", {
        activeTab,
        totalChecklistItems: checklist.length,
        settlementCompleteItems: checklist.filter(
          (item) =>
            String(item.phase) === String(TimelinePhase.SETTLEMENT_COMPLETE),
        ),
        currentItemsCount: currentItems.length,
      });
    }
  }, [activeTab, checklist, currentItems.length]);

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

      {/* 변경사항 알림 */}
      {changedItems.size > 0 && !isSaving && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 text-center">
          {changedItems.size}개의 변경사항이 저장되지 않았습니다.
        </div>
      )}

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
              onRefresh={onRefresh}
            />
          ))
        )}
      </div>

      {/* 저장 버튼 - 변경사항이 있을 때만 표시 */}
      {changedItems.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg p-4 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-amber-600">
                {changedItems.size}개
              </span>
              의 변경사항이 있습니다.
            </div>
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className={cn(
                "px-6 py-2.5 rounded-lg font-semibold text-sm transition-all",
                "bg-indigo-600 text-white hover:bg-indigo-700",
                "disabled:bg-slate-300 disabled:cursor-not-allowed",
                "shadow-md hover:shadow-lg",
              )}
            >
              {isSaving ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
