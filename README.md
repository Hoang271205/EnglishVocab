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

