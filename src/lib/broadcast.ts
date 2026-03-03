import { broadcast } from "./edgeFunction";
import { EdgeFunctionError } from "./edgeFunction";

/**
 * 透過 LINE OA 廣播 Flex Message
 * 使用 Supabase Edge Function 呼叫 LINE Messaging API
 * @param flexMessages Flex Message 內容陣列
 * @param altText 替代文字
 * @returns 廣播結果
 */
export async function broadcastFlexMessage(
  flexMessages: object[],
  altText: string = "您收到新訊息"
): Promise<{ success: boolean; error?: string }> {
  try {
    // LINE 官方限制：Broadcast 一次最多 5 則訊息
    if (flexMessages.length > 5) {
      return {
        success: false,
        error: "LINE 官方限制：一次最多只能廣播 5 則訊息"
      };
    }

    console.log('[Broadcast] 🚀 開始廣播流程（使用 Edge Function）');
    console.log('[Broadcast] 📝 訊息數量:', flexMessages.length);

    // 呼叫 Edge Function
    const result = await broadcast(flexMessages, altText);

    console.log('[Broadcast] ✅ 廣播成功！');
    console.log('[Broadcast] 📊 結果:', result);

    return { success: true };

  } catch (error: unknown) {
    console.error('[Broadcast] ❌ 廣播失敗');

    // 處理 EdgeFunctionError
    if (error instanceof EdgeFunctionError) {
      console.error('[Broadcast] 錯誤代碼:', error.code);
      console.error('[Broadcast] 錯誤訊息:', error.message);

      // 提供友好的錯誤訊息
      let friendlyMessage = error.message;
      if (error.code === 'TOKEN_NOT_FOUND') {
        friendlyMessage = 'LINE Token 未設定，請先綁定 LINE Channel';
      } else if (error.code === 'LINE_API_ERROR') {
        friendlyMessage = 'LINE API 調用失敗，請檢查 Token 是否有效';
      } else if (error.code === 'NO_SESSION') {
        friendlyMessage = '請先登入才能發送廣播';
      }

      return { success: false, error: friendlyMessage };
    }

    // 處理一般錯誤
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    console.error('[Broadcast] 錯誤訊息:', errorMessage);

    return {
      success: false,
      error: `廣播失敗：${errorMessage}`
    };
  }
}
