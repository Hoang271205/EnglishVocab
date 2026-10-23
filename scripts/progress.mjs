import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const phases=JSON.parse(readFileSync(new URL('phases.json',root),'utf8')).phases;
const backlog=JSON.parse(readFileSync(new URL('tasks.json',root),'utf8'));
const tasks=backlog.tasks;
const lines=['# EnglishVocab — tiến độ triển khai','',
 '**Đọc file này trước khi làm task tiếp theo. Dừng sau BE để người dùng nghiệm thu; không tự bắt đầu FE.**',
 '', 'Chỉ giữ checklist gọn và kiểm thử trong mã; không có Markdown evidence hoặc reviewer riêng. `[x]` nghĩa là task đã triển khai và kiểm tra đạt, chưa có nghĩa người dùng nghiệm thu toàn bộ BE.',''];
for(const phase of phases){
 const items=phase.tasks.map(id=>tasks.find(t=>t.id===id));
 const done=items.filter(t=>t?.status==='Done').length;
 lines.push(`## ${done===items.length?'[x]':'[ ]'} ${phase.id} — ${phase.title}`, '', `${done}/${items.length} task hoàn tất.`, '');
 for(const t of items){
  lines.push(`- [${t.status==='Done'?'x':' '}] **${t.id}** ${t.title} — ${t.status} / ${t.verification}.`);
  if(t.remaining)lines.push('  Còn lại: '+t.remaining);
  if(t.limitations)lines.push('  Giới hạn đã ghi nhận: '+t.limitations);
 }
 lines.push('');
}
lines.push('## Kết quả kiểm tra hiện tại','',
 `- Unit/integration: ${backlog.verificationSummary.unitTests} test, ${backlog.verificationSummary.unitResult}.`,
 `- Chrome/IndexedDB thật: ${backlog.verificationSummary.nativeBrowserChecks} kiểm tra đạt.`,
 `- Worker/queue/bridge thật: ${backlog.verificationSummary.nativeExtensionChecks} kiểm tra đạt.`,
 `- API live: ${backlog.verificationSummary.liveDictionary}.`,
 `- Nội dung: ${backlog.verificationSummary.productionEntries}/2.000 mục; thiếu IPA: ${backlog.verificationSummary.missingIPA}; bảng IPA: ${backlog.verificationSummary.ipaChartRows??0} hàng dạng chữ (không audio từng âm).`,
 '', '## Điểm tiếp tục','',
 '1. Xem task đang In progress và phần Còn lại ở trên; không làm lại các task đã tích.',
 '2. BE đã đạt kiểm tra kỹ thuật; dừng chờ người dùng nghiệm thu. Technical Pass không phải xác nhận của người dùng.',
 '3. Bộ đủ 2.000 từ đã tách sang P-DATA theo lựa chọn người dùng. Giữ raw/snapshot, rà soát proposals trước publish; hiện 677 mục, không tự nhập ứng viên chưa rà soát.',
 '4. Chỉ sau xác nhận trực tiếp của người dùng mới đánh dấu backend accepted và mở task FE. Không tự bắt đầu FE trong lượt bàn giao.',
 '', 'Lệnh: `npm run check`, `npm run test:legacy`, `npm run validate:content -- public/content/pilot/pilot-200.json`, `npm run check:gate`. Chạy `npm run progress:update` sau khi đổi tasks.json để cập nhật checklist này.','');
if(process.argv.includes('--write')){writeFileSync(new URL('PHASES.md',root),lines.join('\n'));console.log('Updated PHASES.md');}
else for(const phase of phases){const items=phase.tasks.map(id=>tasks.find(t=>t.id===id));console.log(`${items.every(t=>t.status==='Done')?'[x]':'[ ]'} ${phase.id}: ${items.filter(t=>t.status==='Done').length}/${items.length} done — ${phase.title}`);}
