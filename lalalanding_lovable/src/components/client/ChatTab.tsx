import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender: "agent" | "client";
  timestamp: Date;
}

interface ChatTabProps {
  userType: "agent" | "client";
}

const ChatTab = ({ userType }: ChatTabProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "안녕하세요! 무엇을 도와드릴까요?",
      sender: "agent",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      content: "네, 안녕하세요. 집 계약 관련 질문이 있습니다.",
      sender: "client",
      timestamp: new Date(Date.now() - 3500000),
    },
    {
      id: "3",
      content: "네, 말씀하세요. 어떤 부분이 궁금하신가요?",
      sender: "agent",
      timestamp: new Date(Date.now() - 3400000),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: userType,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-[600px] bg-background rounded-lg border border-border">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.sender === userType ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "flex flex-col",
                message.sender === userType ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  message.sender === userType
                    ? "chat-bubble-agent"
                    : "chat-bubble-client"
                )}
              >
                {message.content}
              </div>
              <span className="text-xs text-muted-foreground mt-1">
                {formatTime(message.timestamp)}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatTab;
