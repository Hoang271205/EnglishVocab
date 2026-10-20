# EnglishVocab — đặc tả giao diện

Ngày: 20/10/2026. Trạng thái: thiết kế FE theo ảnh tham khảo và workflow người dùng đã chốt; chưa phải ứng dụng hoàn chỉnh.

**Điều kiện bắt đầu FE:** toàn bộ task FE-01…FE-09 trong [TASKS.md](TASKS.md) đang Blocked đến khi Gate-BE kỹ thuật Pass và người dùng xác nhận nghiệm thu BE theo [BUILD_PLAN.md](BUILD_PLAN.md). Tài liệu/preview FE là đầu vào thiết kế, chưa phải UI đã triển khai.

## 1. Phạm vi và bố cục

Thanh điều hướng có đúng **3 tab: Ôn tập – Học từ mới – Sổ tay**. Màn học và màn làm bài ôn là phiên con mở từ các tab này. Popup tra từ là thành phần nổi, không phải một tab thứ tư.

Trang mặc định là Ôn tập; số liệu tổng quan được đặt tại đây. Reading, Từ của tôi, IPA, nhập/xuất dữ liệu và cài đặt mở bên trong Sổ tay bằng bộ lọc, hộp thoại hoặc bảng phụ. Các nhóm chức năng này không trở thành các mục điều hướng chính riêng.

Tham khảo ảnh người dùng gửi: thanh trên sáng, ba mục có biểu tượng; nền xám nhạt với mây nhẹ; vùng nội dung trắng nằm giữa; tiêu đề/topic màu vàng; hành động chính màu xanh lá; thẻ và nút bo tròn. Dùng tên EnglishVocab và biểu tượng/minh họa riêng của dự án.

Desktop: thanh trên cao khoảng 72px, vùng nội dung tối đa 1.040px; nền trang rộng hai bên. Thanh trên có tên ứng dụng ở trái, ba tab ở giữa, nút tùy chọn nhỏ ở phải. Có thể đặt thống kê gọn cạnh nội dung khi đủ chỗ; không tạo thêm dashboard.

Mobile: ba tab vẫn có nhãn, nội dung một cột; topic/thẻ học vừa chiều ngang; các ô điền chữ và nút thao tác xuống dòng khi cần. Không phụ thuộc hover. Cỡ chữ nội dung 16px, nút chính có vùng bấm tối thiểu 44px. Trong phiên học/ôn, thanh X + tiến độ thay cho thanh điều hướng để tập trung làm bài.

## 2. Tab Học từ mới

Phần đầu chọn **IELTS Vocabulary — B1–C2** hoặc **Giao tiếp hằng ngày — A1–B2**. Dưới đó là tên bộ trên dải vàng, ô tìm topic và danh sách topic theo hàng như ảnh tham khảo.

Mỗi hàng gồm hình/biểu tượng topic bên trái, tên Anh nổi bật, tên Việt nhỏ bên dưới, số đã học/tổng số đã có và nút hoặc mũi tên bắt đầu ở phải. Topic đang học được nhấn vàng; các hàng còn lại nền xám sáng. Không khóa topic theo thứ tự: người dùng tự chọn topic.

100 topic/bộ là mục tiêu dữ liệu. Chỉ hiển thị hàng sử dụng được khi có từ; đếm số topic và số từ thực có. Khi chưa có nội dung: thông báo cần nhập bộ từ và nút mở Quản lý dữ liệu trong Sổ tay.

Bấm topic mở phiên học các từ chưa học, tối đa 10 mục. Topic có phiên dở hiện Tiếp tục học; đã học hết hiện Đã học xong và cho xem từ trong Sổ tay, không khởi tạo lại progress.

## 3. Phiên học từ mới

Giữ workflow gốc người dùng xác nhận: **xem đầy đủ → Next ẩn từ → viết lại đúng → lưu L1 và chuyển tiếp**. Ảnh thẻ học là tham khảo bố cục; không bắt buộc có thêm một màn xem hình trước màn xem từ.

### Mặt xem

- Thanh đầu: đóng phiên, tiến độ đã hoàn thành/tổng số từ của lượt và tên topic.
- Thẻ giữa: hình minh họa nếu có; từ tiếng Anh, loại từ, nghĩa Việt, CEFR tham khảo, IPA Anh-Mỹ và câu ví dụ có làm nổi từ đang học.
- Hai nút nghe giọng Anh-Mỹ: nghe bình thường và nghe chậm; có thể nghe riêng câu ví dụ. Nếu chưa có giọng/audio phù hợp thì trạng thái nút nói rõ chưa sẵn sàng, không chặn nút Next.
- Nút chính **Next / Viết lại** dưới thẻ. Hình minh họa là tùy chọn; khi thiếu, bố cục thu gọn hoặc dùng biểu tượng có sẵn, vẫn đủ nội dung để học.

### Mặt viết lại

Ẩn từ tiếng Anh, IPA, câu chứa đáp án và nút nghe. Hiện nghĩa Việt, loại từ, tên topic và một ô nhập toàn bộ từ/cụm từ. Không giữ ảnh có chữ hoặc chi tiết trực tiếp làm lộ đáp án.

Nút chính **Kiểm tra**, hỗ trợ Enter. Sai thì báo Chưa đúng, thử lại, giữ câu hiện tại; không tạo progress. Có nút Xem lại để trở về mặt xem, sau đó vẫn phải viết lại đúng. Trong lúc đang gõ không tự chấm.

Đúng thì ghi progress L1, hạn +2 giờ trước khi chuyển sang từ tiếp theo. Hiện thông báo gọn Đã học [từ] · Level 1 · ôn sau 2 giờ; không bắt buộc qua thêm màn giải nghĩa/nhấn Tiếp tục riêng. Cuối lượt hiện số từ mới hoàn thành và thời điểm ôn sớm nhất.

Đóng phiên giữ các từ đã ghi và trạng thái phiên dở. Không có nút tự nhận Mình đã biết để bỏ qua bước xác nhận chính tả rồi tạo level. Số tiến độ chỉ tăng sau khi ghi thành công; ghi lỗi thì giữ nguyên bài và cho thử lưu lại.

## 4. Tab Ôn tập

Giữ bố cục tập trung như ảnh: minh họa/biểu tượng ở giữa, thông điệp ngắn, một hành động chính; thống kê đã học gọn ở cạnh hoặc bên dưới.

Ba trạng thái thực tế:

1. **Chưa học từ nào:** Chưa có từ để ôn. Học những từ đầu tiên nhé! → nút Học từ mới.
2. **Đã học nhưng chưa đến hạn:** Bạn đã ôn xong các từ đến hạn → hiện mốc ôn tiếp theo và nút Học từ mới. Không mở lượt ôn có chấm điểm cho từ tương lai.
3. **Có từ đến hạn:** [N] từ đang chờ bạn ôn → chọn lượt 10/20 từ, mặc định lấy số còn lại nếu ít hơn → nút Ôn ngay. Có bộ lọc nguồn từ: tất cả/IELTS/giao tiếp/cá nhân.

Hiển thị số đã học và số thành thạo từ dữ liệu thật. “Thành thạo” ở L5 vẫn có hạn +5 ngày. Không dùng khái niệm thời điểm vàng như một tính năng chưa được đặc tả.

## 5. Phiên ôn tập

Dùng chung khung thẻ học: X + tiến độ ở đầu, câu hỏi giữa, vùng trả lời và nút chính dưới. Từ đến hạn cũ nhất được xếp trước; danh sách cố định trong lượt.

Mặt câu hỏi chỉ hiện nghĩa Việt, loại từ và câu khuyết. Các chữ đã cho nằm cố định trong từ; các chữ thiếu là ô nhập ngay trong câu. Bàn phím tự đi qua các ô trống, Backspace quay lại; khoảng trắng/dấu nối giữ nguyên. Không hiện từ đầy đủ, IPA, CEFR, nút nghe hoặc ảnh làm lộ đáp án trước khi nộp.

Nút Kiểm tra và Không nhớ. Nộp rỗng/chưa điền hết chỉ báo cần điền, chưa tính sai; khi điền đủ, lần nộp đầu quyết định kết quả. Không nhớ tính sai.

Sau khi chấm: khóa các ô, hiện thẻ xanh khi đúng hoặc thông báo đỏ khi sai, kèm từ đầy đủ, nghĩa, IPA, CEFR nếu có, câu ví dụ, nút nghe Anh-Mỹ, level mới và hạn mới. Màu luôn đi kèm nhãn Đúng/Chưa đúng. Nút chính **Từ tiếp theo**. Viết sửa sau khi xem đáp án không tạo thêm một lần lên level.

Đúng L1 → L2 (+8h); L2 → L3 (+24h); L3 → L4 (+48h); L4 → L5 (+5 ngày); L5 → giữ L5 (+5 ngày). Sai ở mọi level → L1 (+2h). Cuối lượt hiện số đúng/sai và lối về Ôn tập/Sổ tay. Không chấm lại câu đã commit khi refresh hoặc bấm hai lần.

## 6. Tab Sổ tay

Sổ tay là nơi xem từ đã học và quản lý từ lưu khi đọc. Phần đầu có tìm từ/nghĩa và lựa chọn **Đã học / Từ của tôi**.

- Đã học: hàng từ có từ + loại từ, nghĩa Việt, CEFR tham khảo, level nhớ và thời điểm ôn tiếp theo. Lọc level, đến hạn và bộ từ. Bấm hàng mở chi tiết cùng câu ví dụ, phát âm, nguồn và ghi chú.
- Từ của tôi: lọc Chờ bổ sung / Chưa học / Đang ôn / Thành thạo; cho sửa nghĩa Việt/câu ôn và bắt đầu học các mục đủ thông tin. Mục chưa học hiện Chưa học, không gán level 0 hoặc level 1.
- Khi chưa có mục nào: minh họa/biểu tượng và lời mời học từ mới; vẫn truy cập được nhập từ và đọc/lưu từ.
- Tùy chọn trong tab hoặc menu góc: Đọc & lưu từ, Bảng IPA, Quản lý dữ liệu và Giọng đọc. Các chức năng này mở bảng phụ/hộp thoại, không bổ sung tab điều hướng chính.

## 7. Popup tra từ khi bôi đen

Tham khảo popup trong ảnh trước: khung trắng bo góc, hàng đầu tên ứng dụng + đóng; dưới đó là từ, chọn loại từ/nghĩa, IPA và nghe Anh-Mỹ. Tiếp theo là định nghĩa tiếng Anh, ô nghĩa Việt, câu gốc và tối đa 3 ví dụ; nút Lưu từ màu xanh luôn dễ tìm. Nguồn nằm trong phần mở rộng. Nút Lưu từ đủ lớn nhưng không che nghĩa/câu.

Trạng thái: đang tra; có local; có kết quả API; không tìm thấy/lỗi mạng; đã lưu. Khi nhiều nghĩa, dùng danh sách chọn rõ thay vì tự lấy nghĩa đầu. Thiếu nghĩa Việt vẫn lưu nháp được; CEFR chưa rõ để trống. Thiếu ví dụ dùng câu gốc hợp lệ, không tạo dữ liệu giả.

Popup neo theo vùng chọn và tự dịch vào trong mép màn hình; trên mobile thành bảng nổi ở dưới, có nút đóng. Vị trí không che vùng nhập; nội dung dài được cuộn trong popup. Bấm Lưu chỉ ghi thư viện, chưa tạo level; phản hồi là Đã lưu · Chưa học/Chờ bổ sung, hoặc Đã lưu trên tiện ích · chờ chuyển vào web khi đang chờ chuyển.

## 8. Component và trạng thái tối thiểu

AppHeader, MainNav, CollectionPicker, TopicRow, EmptyState, SessionHeader, WordCard, RecallForm, ClozeSentence, AnswerFeedback, NotebookRow, WordDetail, LookupPopover và UtilityPanel. Giữ chung chữ, màu, nút, khoảng cách giữa các màn; không tạo một thư viện UI phức tạp cho dự án cá nhân.

Thiết kế cần có trạng thái dữ liệu rỗng, đang đọc dữ liệu, sẵn sàng, đang lưu và lỗi lưu. Chỉ chuyển bước sau khi lưu thành công. Trạng thái API lỗi không làm mất câu gốc. Nguồn dữ liệu, CEFR và trạng thái level luôn lấy từ model của DESIGN.md, không tính level riêng trong UI.

Hình minh họa topic/từ là tài sản tùy chọn; cần URL hoặc đường dẫn local, alt và thông tin nguồn nếu dùng. Không yêu cầu Free Dictionary API trả ảnh. Các hình có thể bổ sung dần mà không chặn bản đầu.

## 9. Điều kiện FE sẵn sàng triển khai

- Chính xác 3 tab chính; các tiện ích vẫn truy cập được từ Sổ tay/menu.
- Học từ mới đúng thứ tự người dùng yêu cầu; chỉ viết đúng và ghi thành công mới có L1.
- Ôn tập có đủ ba trạng thái trước lượt; mặt bài ôn không làm lộ đáp án, có phản hồi và lịch sau khi chấm.
- Sổ tay phân biệt từ mới lưu và từ đã học; L5 vẫn hiện ngày ôn tiếp theo.
- Popup giữ câu gốc, chọn được nghĩa, nhập được nghĩa Việt và lưu nháp khi thiếu dữ liệu/mạng.
- Không tràn ngang ở 320px; dùng được bàn phím, focus rõ, các nút có nhãn và màu không phải tín hiệu duy nhất.
- Ảnh/minh họa, giọng đọc hoặc API tạm thiếu không chặn các chức năng học/lưu có đủ dữ liệu.

Các điều kiện trên là yêu cầu nghiệm thu, chưa phải kết quả đã chạy trên ứng dụng.

## Cập nhật đã chốt — bảng IPA chỉ dạng chữ

Bảng IPA trong Sổ tay chỉ có ký hiệu, nhóm nguyên âm/phụ âm/nguyên âm đôi và từ ví dụ. Không có nút nghe từng âm hoặc tải file audio IPA. Chức năng nghe từ/câu en-US vẫn giữ riêng ở thẻ từ, popup và chi tiết; từ tự thêm chưa có IPA vẫn nghe được khi thiết bị có giọng Mỹ. Quyết định này thay thế yêu cầu audio từng âm trong các bản thiết kế cũ.
