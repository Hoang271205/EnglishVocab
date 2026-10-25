# Phát triển và triển khai EnglishVocab

[← Về README](../README.md)

Tài liệu này đi cùng mã nguồn hiện tại. Các tài liệu kế hoạch cũ được giữ làm lịch sử; entrypoint đang dùng là `src/frontend/main.tsx`, `server/src/index.ts` và `api/index.ts` khi triển khai Vercel.

## Môi trường local

Dùng Node.js 22.x theo `package.json`. Backend có các nghiệp vụ dùng transaction, vì vậy MongoDB cần hỗ trợ transaction; MongoDB standalone chưa cấu hình replica set không phù hợp với luồng này.

```sh
npm ci
npm run build
npm run dev:server
```

Server mặc định dùng `HOST=127.0.0.1`, `PORT=3001`; origin mẫu là `http://127.0.0.1:3001`. Express phục vụ FE đã build từ `dist/` và API trên cùng origin. `npm run dev:server` theo dõi thay đổi server; chỉnh frontend cần build lại để cập nhật file tĩnh.

`npm start` là trình phục vụ file tĩnh cổng 5173, không thay thế API Express cho luồng tài khoản/MongoDB.

Giữ `.env` hiện có. Với môi trường mới, tạo file dựa trên [`.env.example`](../.env.example), điền kết nối MongoDB và session secret. Không đưa MongoDB credentials, session secret hoặc SMTP credentials vào FE, extension hay Git.

## Chuẩn bị database

```sh
npm run db:prepare
```

Lệnh chuẩn bị index, TTL và bộ đếm trên database được cấu hình; không xoá dữ liệu hiện có. Đây là bước riêng, không phải tác vụ chạy cho từng request hoặc từng cold start.

Khi cần nạp thư viện ban đầu:

```sh
npm run library:seed
```

Seed kiểm tra dữ liệu trước khi ghi, thêm nội dung chưa tồn tại và từ chối khi nội dung trùng ID nhưng khác dữ liệu hiện có. Không dùng seed như cách ghi đè thư viện đang vận hành.

Có thể đăng ký qua giao diện hoặc dùng `npm run user:create` khi cần công cụ tạo tài khoản. Các lệnh `db:migrate:topics` và `db:migrate:saved` dành cho migration cụ thể; đọc script và xác nhận database đích trước khi chạy.

## Build và kiểm tra

Chỉ build:

```sh
NODE_ENV=production npm run build
npm run build:server
npm run build:extension
```

Chạy server đã biên dịch:

```sh
npm run start:server
```

Các lệnh kiểm tra riêng:

```sh
npm run typecheck
npm run typecheck:server
npm run lint
npm test
```

`npm run check` gộp typecheck, lint và test. `npm run test:navigation` là kiểm tra trình duyệt; `npm run test:legacy` chạy riêng các test của phiên bản IndexedDB cũ. Không dùng browser harness cũ để kết luận chất lượng phiên bản MongoDB.

Việc liệt kê lệnh không xác nhận chúng đã chạy thành công. Build qua cũng không thay thế kiểm tra tương tác, âm thanh, gửi email hoặc hoạt động của deployment thật.

## Extension và đồng bộ

```sh
npm run build:extension
```

Origin của extension được chốt lúc build: `EXTENSION_APP_ORIGIN` được ưu tiên, tiếp theo là `APP_ORIGIN`, sau đó là local mặc định. Với domain deploy, dùng origin HTTPS rồi build lại và reload extension.

```sh
EXTENSION_APP_ORIGIN=https://your-project.vercel.app npm run build:extension
```

Load unpacked thư mục `dist-extension/` trong Chrome và đăng nhập từ icon extension. Phiên extension độc lập với phiên web. Luồng lưu mới là:

```text
Bôi đen → Tra từ → Chọn nghĩa / kiểm tra nội dung → Lưu → API → MongoDB
```

Chỉ báo thành công khi server xác nhận. Lượt lưu mới không được đưa vào hàng đợi offline. `extension/queue.ts` vẫn phục vụ việc chuyển hàng đợi tồn từ phiên bản cũ.

Sổ tay → Extension có công cụ nhận dữ liệu cũ hoặc gửi snapshot thư viện khi hai bên cùng tài khoản. Khi phân phối bản dùng thử, gửi nội dung build trong `dist-extension/`, không gửi `.env` hay MongoDB credentials.

## Đăng ký và khôi phục mật khẩu

Đăng ký thành công sẽ đăng nhập vào tài khoản vừa tạo. Các trang dùng fragment route:

```text
#/                       Giới thiệu / workspace nếu đã đăng nhập
#/login                  Đăng nhập
#/register               Tạo tài khoản
#/forgot-password        Yêu cầu khôi phục
#/reset-password?token=…  Đặt lại mật khẩu
```

Chỉ bổ sung cấu hình SMTP còn thiếu vào `.env`; không chép đè kết nối MongoDB hoặc `SESSION_SECRET` đang dùng. Ví dụ cấu hình Gmail SMTP có trong [`.env.example`](../.env.example). Với Gmail, dùng mật khẩu ứng dụng; tham khảo [trang quản lý mật khẩu ứng dụng của Google](https://myaccount.google.com/apppasswords) cho tài khoản gửi thư.

`APP_ORIGIN` phải là origin web người học mở. Liên kết khôi phục trong email được tạo từ biến này. Sau khi đổi biến môi trường trên hosting cần redeploy để áp dụng.

Token khôi phục được lưu dạng hash, dùng một lần và có hạn; TTL hỗ trợ dọn bản ghi hết hạn. Đổi mật khẩu làm mất hiệu lực phiên web/token extension trước đó. Yêu cầu quên mật khẩu trả thông báo chung. Cần kiểm tra cấu hình SMTP và việc nhận email thực tế trên môi trường đích; biên dịch thành công không xác nhận email đã gửi được.

## Triển khai Vercel

Cấu hình [vercel.json](../vercel.json) đặt FE và API chung domain:

- Build Command: `npm run build:vercel`.
- Output Directory: `dist`.
- API: `/api/*` được chuyển tới `api/index.ts`.
- Runtime Node.js theo `engines` trong `package.json`.

Frontend tĩnh được phục vụ riêng; ứng dụng API và pool MongoDB được dùng lại theo instance. Session được lưu trong MongoDB. Index/schema không được tạo lại trong từng request.

Trước triển khai, chuẩn bị index/TTL/bộ đếm bằng `npm run db:prepare` trên đúng database đích. Database mới có thể cần nạp thư viện. Không đưa các lệnh ghi database này vào build của Vercel.

Cấu hình các biến môi trường cần dùng trên hosting:

```text
NODE_ENV=production
MONGODB_URI
MONGODB_DB
SESSION_SECRET
APP_ORIGIN
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
```

Dùng `SESSION_SECRET` riêng và ổn định cho production. `APP_ORIGIN` là origin HTTPS chính xác, không kèm đường dẫn. Không đặt secret trong biến public của frontend. Atlas phải cho phép môi trường hosting kết nối; IP local không đại diện cho IP của hosting.

Deploy FE và API cùng phiên bản khi có thay đổi contract. Sau deploy, kiểm tra `/api/health`, tài khoản, giữ phiên khi reload, học/ôn, sổ tay, email và extension build cho domain đó. Ghi nhận kết quả thực tế thay vì suy ra từ build.

Các rate limiter trong RAM có phạm vi từng instance; không xem chúng như quota dùng chung toàn hệ thống. Cấu hình triển khai trong repo không xác nhận hạn mức, điều khoản gói hosting hoặc trạng thái deployment hiện tại.

## Dữ liệu crawl và sao lưu

Giữ `.crawl-cache/` làm kho nguồn lâu dài: bản nén Kaikki đầy đủ, bộ câu Anh–Việt `vie-eng.zip` và phản hồi API gốc trong `api/`. Các file ứng viên đã lọc không thay thế kho nguồn.

`content/crawl/` giữ seed topic, ứng viên, lựa chọn và nguồn/giấy phép. Một số dữ liệu staging được tạo lại và nằm ngoài Git. Không tự dọn kho raw sau khi lọc hoặc nhập thư viện.

```sh
npm run crawl:archive
npm run crawl:archive:verify
```

Archive lưu snapshot vào `.crawl-archive/`, gồm manifest và các đối tượng theo SHA-256. Snapshot cũ không bị ghi đè; nội dung giống nhau không sao chép lặp. Lệnh verify kiểm tra checksum snapshot. Không có tác vụ tự xoá kho hoặc snapshot.

Khi thêm topic:

1. Giữ seed và dữ liệu nguồn hiện có; tạo archive trước khi thay seed.
2. Dùng `crawl:bulk` để lọc từ bản Kaikki đã lưu.
3. `crawl:api` dùng lại phản hồi đã có; đặt `CRAWL_MAX_REQUESTS=0` nếu cần bảo đảm không gọi mạng.
4. Dùng `crawl:sentences` để ghép câu từ nguồn đã lưu.
5. Rà soát ứng viên, nguồn và giấy phép; `crawl:publish` xem trước, thêm `--write` mới ghi gói học.

Chỉ tải bổ sung khi nguồn local thiếu. Giữ CEFR ở trạng thái ước lượng khi chưa có nguồn xác thực. Với gói nhập đã rà soát, đọc script `library:import-reviewed` và nội dung gói trước khi dùng chế độ ghi.

Khi chuyển máy hoặc sao lưu, mang theo `.crawl-cache/`, `.crawl-archive/` và dữ liệu staging cần thiết trong `content/crawl/`. Export tài khoản trong ứng dụng không bao gồm kho xây bộ từ. Dữ liệu chỉ nằm trên một ổ đĩa vẫn có thể mất khi ổ hỏng.

## Giao diện và tài liệu liên quan

- CSS dùng chung nằm trong `src/frontend/styles/` và `styles/shared/`. Thứ tự import có ảnh hưởng đến cascade.
- Component biểu đồ: `src/frontend/components/charts/`.
- Ô nhập cloze: `src/frontend/components/study/`.
- [Giới thiệu, âm thanh và chuyển động](frontend-experience.md).
- [Cache và tối ưu tải](performance-improvements.md).
- [Thiết kế FE](../FRONTEND.md), [thiết kế hệ thống](../DESIGN.md), [tiến độ](../PHASES.md).
- [HTML mẫu ban đầu](mockups/english-vocab-frontend.html), [popup mẫu](mockups/english-vocab-lookup-popup.html).

`legacy/local/` giữ source/test/công cụ của phiên bản IndexedDB cũ để tham khảo, nằm ngoài phạm vi build/lint mặc định của bản online.
