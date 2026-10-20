# EnglishVocab

Ứng dụng học từ cá nhân chạy local. **BE đã đạt kiểm tra kỹ thuật và đang dừng để bạn nghiệm thu; chưa có FE sản phẩm để sử dụng.** Theo lựa chọn của bạn, hoàn thiện bộ 2.000 từ là task nội dung riêng; hiện có 677 mục trong thư viện.

- [Tiến độ phase và điểm tiếp tục](PHASES.md)
- [Task chi tiết](TASKS.md) · [Backlog JSON](tasks.json) · [Kế hoạch](BUILD_PLAN.md)
- [Thiết kế hệ thống](DESIGN.md) · [Thiết kế FE](FRONTEND.md) · [200 topic](TOPICS.md)
- [HTML tham khảo](english-vocab-frontend.html) · [Popup tham khảo](english-vocab-lookup-popup.html)

## Chạy phần BE hiện có

Node.js từ 22.14, npm. Trong thư mục dự án:

```sh
npm ci --ignore-scripts
npm run check
npm run test:browser
npm run test:extension
npm run progress
npm run check:gate
```

`check:gate` hiện trả mã 1 vì BE chưa đủ điều kiện và chưa được người dùng nghiệm thu; đây là cổng chặn FE, không phải lỗi unit test. Browser/extension tests dùng profile riêng, cần Chrome/Chrome for Testing trên máy. Có thể chỉ định đường dẫn executable bằng `ENGLISHVOCAB_CHROME`. Không chạy hai bộ browser test cùng lúc vì origin kiểm thử cố định localhost:5173; cổng bận sẽ báo lỗi.

`npm run test:dictionary:live` kiểm tra API qua CORS thật, cần mạng và phụ thuộc trạng thái dịch vụ. `npm run build:extension` tạo nền worker/bridge trong dist-extension; popup bôi đen sẽ được viết ở FE sau nghiệm thu BE.

```sh
npm run validate:content -- public/content/pilot/pilot-200.json
```

Bộ pilot có 200 từ/cụm từ tự biên soạn và 20 topic có nội dung trong catalog 200 topic. CEFR đều ghi ước lượng; có 37 IPA tham khảo nhãn Mỹ rõ ràng, 163 mục còn thiếu hoặc nhiều cách đọc chưa chọn. IPA sao chép tự động giữ nguồn/giấy phép và chưa đánh dấu đã nghe kiểm tra. Đây là dữ liệu thật để phát triển, không phải 2.000 từ đã hoàn chỉnh. Import không tạo tiến độ học.

Facade cho FE sau này: `src/backend.ts` → createBackend(), gồm học–ôn, truy vấn, cài đặt, từ cá nhân, nhập bộ từ, sao lưu, tra từ và chuyển capture. IndexedDB giữ tiến độ; server không giữ nghiệp vụ. Không cần login, DB server hoặc Docker.

`npm start` chỉ phục vụ dist khi đã có bản build FE, mở cố định http://localhost:5173; hiện chưa có dist nên báo chưa có bản build. Hai HTML tham khảo là bản mẫu thiết kế, không phải ứng dụng đã nối BE.

Tra online dùng [FreeDictionaryAPI.com](https://freedictionaryapi.com/), dữ liệu Wiktionary CC BY-SA 4.0. Kết quả giữ link trang gốc, giấy phép và ghi công nhà cung cấp; FE phải hiện các trường này. CEFR/nghĩa Việt không có trong API vẫn để trống hoặc nhập thủ công. API cũ dictionaryapi.dev được giữ adapter riêng cho tương thích, không nằm trên đường tra mặc định.

Gói IELTS topic 11–55 đã đủ 450 vị trí trong 5 phần; cộng thêm 27 mục tuyển từ dữ liệu crawl, tổng hiện có 677/2.000 mục. Chỉ mục thực tế nằm ở `public/content/index.json`, cập nhật bằng `npm run content:index`. Các file biên soạn nằm trong `content/authored/`. `content:build` tạo gói mới và từ chối ghi đè gói đã tuyển chọn; `enrich:ipa` dùng cache, chỉ sao chép IPA Mỹ khớp từ loại và không có nhiều biến thể. Catalog rỗng khi nhập lại không xóa nội dung topic từ gói khác.

Bảng IPA hiện **chỉ dạng chữ** theo yêu cầu mới: ký hiệu, nhóm và từ ví dụ; không có file hoặc nút phát từng âm. Nghe từ/câu vẫn dùng en-US, kể cả từ cá nhân bản nháp chưa có IPA. `backend.audio.speakEntry` không cần tra API để đọc từ. Chrome có cửa sổ đã xác nhận thấy giọng Mỹ trên máy và đọc hoàn tất một từ cá nhân thử không có IPA (test tắt âm lượng). Máy/trình duyệt khác vẫn cần có giọng en-US, không tự chuyển sang giọng UK.

Kiểm tra giọng thật trên macOS: `ENGLISHVOCAB_AUDIO_HEADFUL=1 npm run test:audio:browser`. Chrome chạy ẩn có thể không cung cấp giọng hệ thống; test phải báo trạng thái này thay vì giả pass phát âm. Không có frontend sản phẩm trước nghiệm thu BE.

## Kho dữ liệu crawl để tái sử dụng

Giữ toàn bộ dữ liệu gốc tại `.crawl-cache/`: bản nén Kaikki đầy đủ (không chỉ những từ đã lọc), bộ câu Anh–Việt `vie-eng.zip` và phản hồi API gốc trong `api/`. Đây là kho nguồn lâu dài; không tự dọn sau khi lọc hoặc nhập thư viện. `content/crawl/` giữ seed topic, ứng viên, lựa chọn và nguồn/giấy phép. Các file ứng viên là kết quả lọc có thể tạo lại; chúng không thay thế kho nguồn.

`npm run crawl:archive` lưu thêm snapshot toàn bộ kho nguồn và kết quả lọc vào `.crawl-archive/`, gồm manifest và các đối tượng theo SHA-256. Snapshot cũ không bị ghi đè, nội dung giống nhau không sao chép lặp. `npm run crawl:archive:verify` kiểm tra checksum tất cả snapshot. Không có tác vụ tự xóa kho hoặc snapshot. Chạy archive sau mỗi lô crawl/lọc trước khi thay seed; snapshot lưu cả seed và lựa chọn để truy lại.

Khi thêm topic: thay seed, chạy `crawl:bulk` để lọc lại từ bản Kaikki đang lưu; `crawl:api` dùng lại phản hồi đã có (đặt `CRAWL_MAX_REQUESTS=0` để bảo đảm không gọi mạng); `crawl:sentences` ghép từ bộ câu đang lưu. Rà soát ứng viên rồi chạy `crawl:publish` xem trước, thêm `--write` mới ghi gói học. Chỉ tải bổ sung khi nguồn local thiếu; CEFR vẫn là ước lượng nếu chưa có nguồn xác thực.

Kho raw và archive nằm ngoài Git vì dung lượng lớn. Khi sao lưu hoặc chuyển máy, cần mang theo cả `.crawl-cache/`, `.crawl-archive/` và `content/crawl/`; backup tiến độ trong ứng dụng không bao gồm các kho dữ liệu xây bộ từ này. Dữ liệu chỉ ở ổ máy vẫn có thể mất khi ổ hỏng.

## Bàn giao BE để nghiệm thu

17 task BE đã hoàn tất. Kiểm tra hiện tại: typecheck/lint và 43 test đạt; Chrome thật đạt 7 kiểm tra storage/thư viện cùng live API qua CORS; extension đạt 5 kiểm tra; giọng en-US đọc xong từ cá nhân không có IPA khi Internet bị chặn (test tắt âm lượng). Luồng native kiểm tra toàn bộ 677 mục, học một từ crawl, lên L5 +5 ngày, sai về L1 +2 giờ, nhập lại giữ tiến độ và xuất backup. `npm run check:gate` vẫn chặn FE chỉ vì chờ bạn nghiệm thu. Chọn tách dữ liệu khỏi BE chưa đồng nghĩa đã nghiệm thu BE.

Nguồn đầu vào đã giữ thêm 41.513 câu CC0 và 2.039.120 câu tiếng Anh có ID/tác giả từ Tatoeba. Đây là kho nguồn; không phải số từ đã nhập. `npm run crawl:filter` tạo lại ứng viên cho 135 topic hoàn toàn offline, luôn đặt giới hạn API bằng 0 và lưu snapshot trước khi lọc. Danh sách `proposals.json` còn cần rà soát nghĩa–từ loại–câu; không được tự coi là ready. Chỉ 27 mục crawl đã chọn được đưa vào production hiện tại.

Nếu cần chuẩn bị kho từ máy mới: `crawl:download`, `crawl:download:sentences`, `crawl:download:sentences:full`; file cặp câu Việt `vie-eng.zip` lấy từ link ManyThings đã ghi trong nguồn. Kho raw, pool câu và staging lớn không đưa vào Git; giữ trên ổ và trong snapshot. `content/crawl/reviewed-source-extract.json` là phần nguồn nhỏ cho lô đã chọn, giúp test không cần tải toàn bộ kho.
