# EnglishVocab

Ứng dụng học và ôn từ vựng: React/TypeScript, API Express và MongoDB. Dữ liệu cá nhân thuộc tài khoản; extension đăng nhập riêng và lưu từ trực tiếp qua API.

## Cấu trúc hiện tại

```text
src/
  frontend/       Giao diện online, component, hook và API client
  domain/         Kiểu dữ liệu và quy tắc học/ôn dùng chung
  shared/schemas/ Giao thức capture và snapshot dùng bởi extension
  audio/          Giọng đọc của trình duyệt
  dictionary/     Adapter tra từ và chuyển kết quả thành từ vựng
  content/        Schema nội dung, IPA và helper biên soạn
server/           API, đăng nhập, nghiệp vụ và MongoDB
extension/        Tra từ, đăng nhập và lưu trực tiếp
scripts/          Build, seed và công cụ dữ liệu
tests/            Các bài test dùng chung còn áp dụng
legacy/local/     Source, test và công cụ của bản IndexedDB cũ
docs/mockups/     Hai HTML mẫu thiết kế ban đầu
content/          Dữ liệu biên soạn, nguồn và kết quả lọc
public/           Nội dung tĩnh dùng khi build/seed
```

CSS nền và CSS dùng chung nằm trong `src/frontend/styles/` và `styles/shared/`; thứ tự import giữ nguyên để bảo toàn giao diện. Component biểu đồ nằm trong `components/charts/`, ô nhập cloze trong `components/study/`.

## Chạy phiên bản MongoDB

Giữ cấu hình `.env` đang dùng; không đưa thông tin kết nối MongoDB hoặc secret vào frontend/extension. Node.js từ 22.14.

```sh
npm ci
npm run build
npm run dev:server
```

Mở origin đã cấu hình trên server (môi trường local hiện dùng `http://127.0.0.1:3001`). API cũng phục vụ giao diện đã build từ `dist/`.

```sh
npm run user:create
npm run library:seed
```

Hai lệnh trên dùng khi cần tạo tài khoản và nhập thư viện vào database đã cấu hình. `npm start` vẫn là trình phục vụ file tĩnh cổng 5173; để dùng đăng nhập/API cùng origin, chạy server MongoDB như trên.

## Extension

```sh
npm run build:extension
```

Load unpacked folder `dist-extension/`, mở icon extension để đăng nhập. Tài khoản extension độc lập với phiên web. Bôi đen → icon → chọn nghĩa/kiểm tra bản dịch → Lưu từ → API → MongoDB. Chỉ báo thành công khi server xác nhận; lượt lưu mới không ghi hàng đợi offline.

`APP_ORIGIN` hoặc `EXTENSION_APP_ORIGIN` quyết định origin lúc build. Khi deploy, cấu hình domain HTTPS và build/reload extension cho domain đó. Không đóng gói `.env` trong extension.

Sổ tay → Extension chỉ nhận hàng đợi cũ hoặc đồng bộ thư viện khi hai bên cùng tài khoản. Giữ `extension/queue.ts` để chuyển dữ liệu tồn từ phiên bản cũ; đây không phải đường lưu từ mới.

## Code local cũ và kiểm kê

`legacy/local/` giữ source cũ cùng test và công cụ lịch sử, đã được đưa ra ngoài phạm vi build/lint mặc định. Các import đến phần dùng chung đã được cập nhật. Không chạy các browser harness cũ để kết luận chất lượng phiên bản MongoDB.

```sh
npm run check
npm run typecheck:server
npm run test:legacy
```

`check` chỉ chạy các bài test còn trong `tests/`; `test:legacy` dành riêng cho backend IndexedDB cũ. Các lệnh browser test cũ không còn nằm trong scripts mặc định. Sau đợt dọn này chưa chạy build/typecheck/lint/test; người dùng tự kiểm kê.

- [Tiến độ](PHASES.md)
- [Kế hoạch ban đầu](BUILD_PLAN.md) · [Thiết kế](DESIGN.md) · [Thiết kế FE](FRONTEND.md)
- [HTML mẫu](docs/mockups/english-vocab-frontend.html) · [Popup mẫu](docs/mockups/english-vocab-lookup-popup.html)

Các tài liệu kế hoạch/contract local cũ được giữ làm lịch sử; mã đang chạy lấy từ `src/frontend/main.tsx` và `server/src/index.ts`.

## Kho dữ liệu crawl để tái sử dụng

Giữ toàn bộ dữ liệu gốc tại `.crawl-cache/`: bản nén Kaikki đầy đủ (không chỉ những từ đã lọc), bộ câu Anh–Việt `vie-eng.zip` và phản hồi API gốc trong `api/`. Đây là kho nguồn lâu dài; không tự dọn sau khi lọc hoặc nhập thư viện. `content/crawl/` giữ seed topic, ứng viên, lựa chọn và nguồn/giấy phép. Các file ứng viên là kết quả lọc có thể tạo lại; chúng không thay thế kho nguồn.

`npm run crawl:archive` lưu thêm snapshot toàn bộ kho nguồn và kết quả lọc vào `.crawl-archive/`, gồm manifest và các đối tượng theo SHA-256. Snapshot cũ không bị ghi đè, nội dung giống nhau không sao chép lặp. `npm run crawl:archive:verify` kiểm tra checksum tất cả snapshot. Không có tác vụ tự xóa kho hoặc snapshot. Chạy archive sau mỗi lô crawl/lọc trước khi thay seed; snapshot lưu cả seed và lựa chọn để truy lại.

Khi thêm topic: thay seed, chạy `crawl:bulk` để lọc lại từ bản Kaikki đang lưu; `crawl:api` dùng lại phản hồi đã có (đặt `CRAWL_MAX_REQUESTS=0` để bảo đảm không gọi mạng); `crawl:sentences` ghép từ bộ câu đang lưu. Rà soát ứng viên rồi chạy `crawl:publish` xem trước, thêm `--write` mới ghi gói học. Chỉ tải bổ sung khi nguồn local thiếu; CEFR vẫn là ước lượng nếu chưa có nguồn xác thực.

Kho raw và archive nằm ngoài Git vì dung lượng lớn. Khi sao lưu hoặc chuyển máy, cần mang theo cả `.crawl-cache/`, `.crawl-archive/` và `content/crawl/`; backup tiến độ trong ứng dụng không bao gồm các kho dữ liệu xây bộ từ này. Dữ liệu chỉ ở ổ máy vẫn có thể mất khi ổ hỏng.

## Đăng ký và khôi phục mật khẩu qua Gmail SMTP

Đã thêm đăng ký tài khoản học viên, quên mật khẩu và đặt lại mật khẩu. Đăng ký thành công sẽ đăng nhập ngay. Các trang dùng fragment `#/login`, `#/register`, `#/forgot-password`, `#/reset-password?token=...`, nên không cần cấu hình thêm đường dẫn SPA trên server.

Giữ nguyên `.env` hiện tại. Chỉ bổ sung các biến SMTP từ `.env.example`, không chép đè MongoDB hoặc SESSION_SECRET đang dùng:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-account@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=EnglishVocab <your-account@gmail.com>
```

Bật xác minh hai bước cho tài khoản Gmail gửi thư, rồi tạo [Mật khẩu ứng dụng](https://myaccount.google.com/apppasswords). Điền mật khẩu ứng dụng vào SMTP_PASSWORD; không dùng mật khẩu Gmail thường và không commit `.env`. [Hướng dẫn Google](https://support.google.com/accounts/answer/185833). Một số tài khoản trường/công ty không hỗ trợ mật khẩu ứng dụng.

APP_ORIGIN phải đúng địa chỉ web người dùng mở, ví dụ `http://127.0.0.1:3001` khi chạy local hoặc `https://ten-mien-cua-ban` khi deploy. Liên kết trong email lấy từ biến này; triển khai thật phải sử dụng HTTPS. Không gửi SMTP_USER/SMTP_PASSWORD xuống FE hoặc extension.

Người dùng tự chạy sau khi cấu hình:

```sh
npm run build
npm run dev:server
```

Dừng server cũ trước khi khởi động lại. Với bản production, build và khởi động API bằng các lệnh hiện có (`npm run build:server`, `npm run start:server`). Nếu extension đang dùng token cũ sau đổi mật khẩu, cần đăng nhập lại extension.

Token khôi phục chỉ lưu hash, hết hạn sau 15 phút, dùng một lần; MongoDB tự dọn bản ghi bằng TTL. Mỗi tài khoản chỉ giữ một yêu cầu đang chờ, gửi lại cách ít nhất một phút; endpoint có giới hạn tần suất. Đổi mật khẩu làm mất hiệu lực phiên web và token extension trước đó. Yêu cầu quên mật khẩu trả thông báo chung để tránh xác nhận email có tài khoản; gửi thư chạy nền, lỗi SMTP chỉ ghi thông báo cấu hình ở server.

Chưa chạy build/typecheck/lint/test hoặc gửi email thật trong lượt triển khai này. Cần người dùng kiểm kê đăng ký, email trùng, email khôi phục, link hết hạn/đã dùng, đăng nhập bằng mật khẩu mới và giao diện mobile.

## Chuẩn bị deploy web miễn phí lên Vercel

Cấu hình trong `vercel.json` giữ FE và API chung domain: FE được build vào `dist/` và phục vụ qua CDN, mọi `/api/*` vào `api/index.ts`. Backend không mở cổng hoặc tạo index cho từng cold start. Kết nối/pool MongoDB được dùng lại theo instance, gắn attachDatabasePool để Vercel theo dõi kết nối nhàn rỗi; session vẫn nằm trong MongoDB. Đây là cấu hình triển khai, chưa phải xác nhận đã deploy thành công.

1. Giữ `.env` local hiện có. Chạy `npm run db:prepare` một lần với database Atlas sẽ dùng cho production để tạo index/TTL/bộ đếm, không xoá dữ liệu. Nếu dùng database mới, chạy thêm `npm run library:seed` để nạp thư viện. Không đưa các lệnh này vào build của Vercel.
2. Push code lên GitHub của bạn và Import repository trong Vercel. Root Directory là thư mục gốc dự án; Framework Preset là **Other**. File `vercel.json` cấu hình Build Command `npm run build:vercel`, Output Directory `dist`. Dùng Node.js 22.x trong Project Settings.
3. Điền biến môi trường trên Vercel (Production): `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET`, `APP_ORIGIN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. `NODE_ENV=production`. Dùng session secret riêng và ổn định cho production; không đặt các secret trong biến `VITE_*` hoặc `NEXT_PUBLIC_*`. `APP_ORIGIN` phải là origin HTTPS chính xác của domain production, không kèm đường dẫn.
4. Atlas Database User cần quyền đọc/ghi và tạo index cho database dùng ở bước chuẩn bị. Network Access cần cho phép kết nối từ môi trường hosting theo hướng dẫn MongoDB Atlas/Vercel; IP máy local không tự bao gồm IP Vercel. Chọn region function gần region Atlas khi cấu hình dự án để giảm độ trễ. Không thay Network Access hay dữ liệu Atlas trong lượt chỉnh code này.
5. Sau deploy, người dùng tự kiểm tra `/api/health`, đăng ký/đăng nhập, reload giữ phiên, học/ôn/lưu nháp/Skip, sổ tay và email khôi phục. Link email luôn trỏ về `APP_ORIGIN`. Khi thay domain hoặc biến môi trường, redeploy để áp dụng.
6. Trên máy local, đặt `EXTENSION_APP_ORIGIN=https://your-project.vercel.app` rồi chạy `npm run build:extension`. Nén **nội dung thư mục `dist-extension/`** để gửi cho nhóm dùng thử. Chỉ gửi file build, không gửi source, `.env` hoặc MongoDB credentials. Người nhận giải nén, Load unpacked thư mục có `manifest.json`, đăng nhập extension rồi thử lưu từ; không cần chạy server local.

Email nền được nối với `waitUntil()` để Vercel theo dõi tác vụ sau phản hồi API; vẫn dùng Gmail SMTP hiện tại. Cần kiểm kê việc gửi email trên deployment thật. Không có máy chủ SMTP riêng được tạo trong ứng dụng.

Lưu ý về gói miễn phí: Vercel Hobby dành cho mục đích cá nhân, phi thương mại và có hạn mức sử dụng; việc dự án có 5–10 người không tự đảm bảo đủ điều kiện. Nếu dùng cho hoạt động dạy học thu phí/kinh doanh, cần đối chiếu điều kiện Vercel trước khi chọn gói. Không tự nâng cấp hoặc phát sinh dịch vụ trả phí.

Nguồn: [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [tác vụ nền](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package), [Hobby](https://vercel.com/docs/plans/hobby).

Lượt này chỉ chỉnh code/cấu hình. Chưa chạy build/typecheck/lint/test, chưa chạy db:prepare/seed, chưa gửi email thật và chưa deploy. Các giới hạn request/rate limit trong RAM hiện tại áp dụng theo từng instance Vercel, không phải quota toàn hệ thống.
