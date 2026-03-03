-- =========================================
-- 修復：新增缺失的 get_channel_status RPC 函數
-- 用途：讓用戶登入後能檢查是否已儲存 LINE Token
-- =========================================

-- get_channel_status: 前端用來取得 LINE Channel 狀態和資訊
create or replace function public.get_channel_status()
returns table(has_channel boolean, name text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    true as has_channel,
    c.name,
    c.updated_at
  from public.rm_line_channels c
  where c.user_id = auth.uid()
  limit 1;

  -- 如果沒有找到記錄，返回空結果（has_channel 會是 null）
  -- 前端會根據返回的結果判斷是否有 channel
end;
$$;

grant execute on function public.get_channel_status() to authenticated;

-- 驗證函數是否創建成功
select exists(
  select 1 from pg_proc
  where proname = 'get_channel_status'
) as function_created;
