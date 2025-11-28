"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewClientPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    occupation: "doctor",
    moving_date: "",
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create client");
      }

      // 성공 시 클라이언트 상세 페이지로 이동
      router.push(`/agent/client/${data.client.id}`);
    } catch (error) {
      console.error("Error creating client:", error);
      alert("클라이언트 생성에 실패했습니다. 다시 시도해주세요.");
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">새 클라이언트 추가</h1>
        <p className="text-gray-600">
          클라이언트의 기본 정보를 입력해주세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">이름 *</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="홍길동"
          />
        </div>

        <div>
          <Label htmlFor="email">이메일 *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="hong@example.com"
          />
        </div>

        <div>
          <Label htmlFor="phone">전화번호</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="010-1234-5678"
          />
        </div>

        <div>
          <Label htmlFor="occupation">직업 *</Label>
          <select
            id="occupation"
            name="occupation"
            required
            value={formData.occupation}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="doctor">의사</option>
            <option value="employee">회사직원</option>
            <option value="student">학생</option>
          </select>
        </div>

        <div>
          <Label htmlFor="moving_date">이주 예정일 *</Label>
          <Input
            id="moving_date"
            name="moving_date"
            type="date"
            required
            value={formData.moving_date}
            onChange={handleChange}
          />
        </div>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            취소
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "생성 중..." : "클라이언트 생성"}
          </Button>
        </div>
      </form>
    </div>
  );
}

