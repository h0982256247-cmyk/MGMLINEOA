import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Drafts from "@/pages/Drafts";
import NewDraft from "@/pages/NewDraft";
import EditDraft from "@/pages/EditDraft";
import PreviewDraft from "@/pages/PreviewDraft";
import Share from "@/pages/Share";

// 路由保護
import ProtectedRoute from "@/components/ProtectedRoute";

// 診斷工具（僅在開發環境）
import { diagnoseSupabase } from "@/debug-supabase";
if (import.meta.env.DEV) {
  (window as any).diagnoseSupabase = diagnoseSupabase;
  console.log('💡 診斷工具已載入，請在 Console 中執行: diagnoseSupabase()');
}

export default function App() {
  return (
    <Routes>
      {/* 入口直接顯示登入 */}
      <Route path="/" element={<Login />} />

      {/* 受保護的路由 - 需要登入才能訪問 */}
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />

      {/* Flex Message 編輯器 - 需要登入 */}
      <Route path="/drafts" element={<ProtectedRoute><Drafts /></ProtectedRoute>} />
      <Route path="/drafts/new" element={<ProtectedRoute><NewDraft /></ProtectedRoute>} />
      <Route path="/drafts/:id/edit" element={<ProtectedRoute><EditDraft /></ProtectedRoute>} />
      <Route path="/drafts/:id/preview" element={<ProtectedRoute><PreviewDraft /></ProtectedRoute>} />

      {/* 分享頁面 - 公開訪問，不需要登入 */}
      <Route path="/share" element={<Share />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
