/**
 * 統一的 Edge Function 調用介面
 * 提供類型安全和一致的錯誤處理
 */

import { supabase } from './supabase';

/**
 * 統一的 Edge Function 響應格式
 */
export interface EdgeFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Edge Function 錯誤類型
 */
export class EdgeFunctionError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

/**
 * 調用 Edge Function 的通用方法
 *
 * @param functionName - Edge Function 名稱
 * @param body - 請求 body
 * @returns 解析後的響應數據
 * @throws {EdgeFunctionError} 如果調用失敗或返回錯誤
 *
 * @example
 * ```typescript
 * // 定義響應類型
 * interface ValidateTokenResult {
 *   valid: boolean;
 *   botName?: string;
 * }
 *
 * // 調用 Edge Function
 * const result = await invokeEdgeFunction<ValidateTokenResult>(
 *   'validate-token',
 *   { accessToken: 'xxx' }
 * );
 *
 * console.log(result.valid, result.botName);
 * ```
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body?: unknown
): Promise<T> {
  console.log(`[EdgeFunction] 🚀 調用 ${functionName}...`);
  console.log(`[EdgeFunction] 📅 時間: ${new Date().toISOString()}`);
  console.log(`[EdgeFunction] 📦 請求 body:`, {
    hasBody: !!body,
    bodySize: body ? JSON.stringify(body).length : 0,
    bodyPreview: body ? JSON.stringify(body).substring(0, 200) + '...' : null
  });

  // 🔍 檢查 Session 狀態
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  console.log(`[EdgeFunction] 🔐 Session 檢查:`, {
    hasSession: !!session,
    hasAccessToken: !!session?.access_token,
    tokenLength: session?.access_token?.length,
    tokenPrefix: session?.access_token?.substring(0, 30) + '...',
    expiresAt: session?.expires_at,
    expiresIn: session?.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) + '秒' : null,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    hasRefreshToken: !!session?.refresh_token
  });

  if (sessionError) {
    console.error(`[EdgeFunction] ❌ Session 錯誤:`, sessionError);
    throw new EdgeFunctionError(
      'SESSION_ERROR',
      '無法取得登入狀態，請重新登入',
      { originalError: sessionError }
    );
  }

  // 🚨 關鍵修復：確保有 session 和 access_token
  if (!session || !session.access_token) {
    console.error(`[EdgeFunction] ❌ 無有效 session 或 token`);
    throw new EdgeFunctionError(
      'NO_SESSION',
      '請先登入才能執行此操作',
      { hasSession: !!session, hasToken: !!session?.access_token }
    );
  }

  // 檢查 token 是否即將過期
  if (session.expires_at) {
    const expiresIn = session.expires_at * 1000 - Date.now();
    if (expiresIn < 5 * 60 * 1000) {
      console.warn(`[EdgeFunction] ⚠️ Token 即將過期（剩餘 ${Math.floor(expiresIn / 1000)} 秒），建議刷新`);
    }
  }

  try {
    console.log(`[EdgeFunction] 📤 發送請求到 ${functionName}...`);
    console.log(`[EdgeFunction] 🔑 Session 有效，SDK 將自動附加 Authorization header`);

    const startTime = Date.now();

    // 🚨 關鍵修復：移除手動 header，讓 SDK 自動處理
    // 原因：手動傳遞 header 可能與 SDK 內部機制衝突，導致 401 錯誤
    // 參考：Broadcast Function 的成功模式（不手動傳遞 header）
    const { data, error } = await supabase.functions.invoke<EdgeFunctionResponse<T>>(
      functionName,
      body ? { body: body as Record<string, any> } : undefined
    );

    const duration = Date.now() - startTime;
    console.log(`[EdgeFunction] ⏱️ 請求耗時: ${duration}ms`);

    // Supabase client 層面的錯誤
    if (error) {
      console.error(`[EdgeFunction] ❌ 調用失敗 (${functionName})`);
      console.error(`[EdgeFunction] 🔍 錯誤類型:`, {
        name: error.name,
        message: error.message,
        constructor: error.constructor?.name,
      });
      console.error(`[EdgeFunction] 🔍 HTTP 資訊:`, {
        status: (error as any).status,
        statusText: (error as any).statusText,
        context: (error as any).context,
      });
      console.error(`[EdgeFunction] 🔍 完整錯誤:`, error);

      throw new EdgeFunctionError(
        'INVOCATION_ERROR',
        `Edge Function 調用失敗: ${error.message}`,
        {
          originalError: error,
          status: (error as any).status,
          statusText: (error as any).statusText,
          context: (error as any).context,
          duration,
        }
      );
    }

    // 檢查響應格式
    console.log(`[EdgeFunction] 📥 收到響應:`, {
      hasData: !!data,
      dataType: typeof data,
      success: data?.success,
      hasError: !!data?.error,
    });

    // Edge Function 返回的業務邏輯錯誤
    if (data && !data.success) {
      console.error(`[EdgeFunction] ❌ 業務邏輯錯誤 (${functionName})`);
      console.error(`[EdgeFunction] 🔍 錯誤代碼:`, data.error?.code);
      console.error(`[EdgeFunction] 🔍 錯誤訊息:`, data.error?.message);
      console.error(`[EdgeFunction] 🔍 錯誤詳情:`, data.error?.details);

      throw new EdgeFunctionError(
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.message || '未知錯誤',
        {
          details: data.error?.details,
          duration,
          functionName,
        }
      );
    }

    console.log(`[EdgeFunction] ✅ ${functionName} 調用成功 (${duration}ms)`);
    console.log(`[EdgeFunction] 📊 響應數據:`, data?.data);

    return data?.data as T;

  } catch (error) {
    // 已經是 EdgeFunctionError，直接拋出
    if (error instanceof EdgeFunctionError) {
      throw error;
    }

    // 未知錯誤
    console.error(`[EdgeFunction] ❌ 未知錯誤 (${functionName}):`, error);
    console.error(`[EdgeFunction] 🔍 錯誤類型:`, error?.constructor?.name);
    console.error(`[EdgeFunction] 🔍 錯誤 stack:`, (error as Error)?.stack);

    throw new EdgeFunctionError(
      'UNEXPECTED_ERROR',
      error instanceof Error ? error.message : '未知錯誤',
      {
        originalError: error,
        errorType: error?.constructor?.name,
        stack: (error as Error)?.stack,
        functionName,
      }
    );
  }
}

/**
 * 獲取用戶友好的錯誤訊息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof EdgeFunctionError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '發生未知錯誤';
}

/**
 * 獲取錯誤代碼（用於 UI 展示或追蹤）
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof EdgeFunctionError) {
    return error.code;
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Edge Function 類型定義
 * 為每個 Edge Function 定義輸入和輸出類型
 */

// broadcast
export interface BroadcastRequest {
  flexMessages: unknown[];
  altText?: string;
}

export interface BroadcastResult {
  messageCount: number;
  targetCount: number;
}

export async function broadcast(
  flexMessages: unknown[],
  altText?: string
): Promise<BroadcastResult> {
  return invokeEdgeFunction<BroadcastResult>('broadcast', {
    flexMessages,
    altText,
  });
}
