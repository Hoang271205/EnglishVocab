function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function resetMailTemplate(resetUrl: URL) {
  const href = escapeHtml(resetUrl.href);
  const mascot = escapeHtml(
    new URL('/images/mascot/englishvocab-mascot.png', resetUrl).href,
  );
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đặt lại mật khẩu EnglishVocab</title></head>
<body style="margin:0;padding:0;background:#f1f5eb;color:#283126;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">Mình giúp bạn quay lại EnglishVocab. Liên kết khôi phục có hiệu lực trong 15 phút.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5eb;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border:1px solid #e1e8da;border-radius:24px;background:#ffffff;">
<tr><td align="center" style="padding:32px 28px 12px;color:#246d38;font-size:24px;font-weight:bold;">EnglishVocab</td></tr>
<tr><td align="center" style="padding:8px 28px;"><img src="${mascot}" width="180" height="167" alt="Linh thú EnglishVocab luôn đồng hành cùng bạn" style="display:block;width:180px;max-width:100%;height:auto;border:0;"></td></tr>
<tr><td style="padding:12px 32px 32px;line-height:1.8;">
<h1 style="font-size:27px;line-height:1.3;margin:12px 0 24px;text-align:center;color:#243c27;">Đặt lại mật khẩu của bạn</h1>
<p style="margin:0 0 12px;">Chào bạn,</p><p style="margin:0 0 24px;color:#65735e;">Chúng mình đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản EnglishVocab của bạn. Mình giúp bạn quay lại hành trình học nhé!</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#246d38" style="border-radius:12px;"><a href="${href}" style="display:block;padding:16px 24px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">Đặt lại mật khẩu</a></td></tr></table>
<p style="margin:20px 0;padding:14px 16px;background:#fff8de;border:1px solid #ecdfa9;border-radius:12px;color:#5a6137;font-size:14px;">Liên kết có hiệu lực trong <strong>15 phút</strong> và chỉ dùng được <strong>một lần</strong>.</p>
<p style="font-size:14px;color:#65735e;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
<p style="font-size:12px;color:#77836f;">Nếu nút không mở được, sao chép liên kết này vào trình duyệt:<br><a href="${href}" style="color:#246d38;word-break:break-all;">${href}</a></p>
<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e1e8da;text-align:center;font-size:12px;color:#77836f;">EnglishVocab — Mỗi ngày một chút, nhớ lâu hơn.</p>
</td></tr></table></td></tr></table></body></html>`;
}
