# 📱 VocabMaster AI - Phiên bản Dành cho iPad (iPadOS Edition)

> **VocabMaster AI for iPad** là phiên bản ứng dụng được thiết kế tối ưu riêng cho màn hình cảm ứng của **Apple iPad** (iPad Mini, iPad Gen, iPad Air, iPad Pro). Ứng dụng hoạt động dưới dạng **Progressive Web App (PWA)** độc lập, có thể cài trực tiếp ra Màn hình chính iPad mà không cần tài khoản Apple Developer hay máy tính Mac, đồng thời hỗ trợ hoàn hảo tính năng chia đôi màn hình **Split View** để vừa đọc sách vừa học từ vựng.

---

## ✨ Tính năng độc quyền trên iPad

1. **Cài đặt thành App độc lập (PWA Standalone)**:
   - Thêm trực tiếp vào Màn hình chính (Home Screen) qua Safari.
   - Chạy toàn màn hình (Full-screen), có icon riêng, không có thanh URL hay thanh điều hướng của trình duyệt.
   - Hỗ trợ lưu cache offline bằng **Service Worker** (`sw.js`).
2. **Tối ưu tính năng Split View & Slide Over (Chia đôi màn hình)**:
   - Khi bạn đọc tài liệu PDF, bài báo khoa học, sách tiếng Anh trên *GoodNotes*, *Apple Books*, *Kindle* hoặc *Safari*, chỉ cần kéo VocabMaster AI sang 1/2 hoặc 1/3 màn hình.
   - Giao diện ứng dụng tự động co giãn thông minh, thanh điều hướng tự động chuyển xuống đáy màn hình (kiểu iOS Native Tab Bar) giúp ngón tay chạm rất thuận tiện.
3. **Cử chỉ Chạm & Vuốt tự nhiên (Touch Gestures)**:
   - 🃏 **Flashcards**: Chạm (Tap) vào thẻ để lật mặt; Vuốt (Swipe) sang trái để sang thẻ tiếp theo; Vuốt sang phải để lùi lại thẻ trước.
   - 🎯 **Quiz**: Các nút bấm trắc nghiệm to bản (chuẩn kích thước cảm ứng của Apple), phản hồi rung/đổi màu ngay tức thì.
   - ⌨️ **Typing**: Tương thích tốt với cả bàn phím ảo trên màn hình và bàn phím vật lý iPad (Magic Keyboard / Smart Keyboard Folio).
4. **Phát âm chuẩn bản xứ**:
   - Sử dụng trực tiếp hệ thống giọng đọc chất lượng cao của Apple iOS (Siri English UK & US).
5. **Động cơ Từ điển v1.0.19**:
   - Chuẩn hóa danh từ tiếng Việt: `observation` ➔ *Sự quan sát, nhận xét; (Toán/AI) mẫu quan sát*.
   - Phiên âm quốc tế IPA chuẩn mực.

---

## 🚀 Hướng dẫn Cài đặt & Sử dụng trên iPad

### Phương pháp 1: Cài ra Màn hình chính qua Safari (Khuyên dùng nhất - 30 giây)

Cách này cho phép bạn dùng VocabMaster AI như một ứng dụng tải từ App Store mà **không cần máy tính Mac, không cần jailbreak, không tốn phí**:

1. **Cách tạo đường link để mở trên iPad**:
   - **Cách A (Dùng GitHub Pages - Dễ nhất)**: 
     - Vào repository GitHub của bạn: `https://github.com/khongphaifu/VocabMaster-AI`
     - Bấm **Settings** ➔ Mục **Pages** (ở cột trái).
     - Tại mục **Build and deployment**, chọn Branch: `main` và thư mục `/root` ➔ Bấm **Save**.
     - GitHub sẽ cung cấp cho bạn một đường link miễn phí (dạng `https://khongphaifu.github.io/VocabMaster-AI/ipad/`).
   - **Cách B (Mở mạng nội bộ gia đình)**:
     - Trên máy tính Windows chạy lệnh: `npx serve d:\extension`
     - Mở Safari trên iPad và gõ địa chỉ IP máy tính (ví dụ `http://192.168.1.15:3000/ipad/`).

2. **Cài đặt ra Màn hình chính iPad**:
   - Mở trình duyệt **Safari** trên iPad và truy cập vào đường link ứng dụng trên.
   - Nhấn vào biểu tượng **Chia sẻ (Share)** của Safari (hình vuông có mũi tên hướng lên ở góc trên bên phải màn hình iPad).
   - Cuộn menu xuống và chọn: **"Thêm vào MH chính" (Add to Home Screen)**.
   - Đặt tên là **VocabMaster** rồi bấm nút **Thêm (Add)** ở góc trên.

3. **Trải nghiệm**:
   - Biểu tượng ứng dụng **VocabMaster AI** sẽ xuất hiện ngay trên Màn hình chính của iPad.
   - Bấm vào icon để mở: Ứng dụng sẽ chạy toàn màn hình, mượt mà và độc lập 100%!

---

### Phương pháp 2: Vừa đọc sách PDF vừa tra từ với Split View

Tính năng mạnh mẽ nhất khi học tiếng Anh trên iPad là chia đôi màn hình:

1. Mở ứng dụng đọc sách hoặc tài liệu bạn muốn học (ví dụ: *Apple Books*, *GoodNotes*, hoặc *Safari*).
2. Chạm vào biểu tượng **3 dấu chấm (`...`)** ở cạnh trên cùng màn hình iPad ➔ Chọn biểu tượng **Split View (Chia đôi màn hình)**.
3. Chọn mở ứng dụng **VocabMaster AI**.
4. Lúc này:
   - Nửa màn hình bên trái: Tài liệu tiếng Anh bạn đang đọc.
   - Nửa màn hình bên phải: VocabMaster AI sẵn sàng để bạn nhập từ cần tra, lưu từ mới và lật thẻ Flashcard ôn tập ngay lập tức mà không cần chuyển qua lại giữa các ứng dụng!

---

### Phương pháp 3: Bôi đen tra từ trực tiếp trên iPad (Orion Browser)

Nếu bạn muốn bôi đen chữ trên trang web và hiện bảng dịch nổi ngay trên iPad giống như tiện ích trên máy tính:

1. Tải trình duyệt **Orion Browser** miễn phí từ Apple App Store trên iPad (Orion là trình duyệt trên iOS hỗ trợ nạp trực tiếp Chrome Extensions).
2. Mở Orion trên iPad, truy cập kho tiện ích hoặc nạp thư mục extension.
3. Tiện ích VocabMaster AI sẽ hoạt động với tính năng bôi đen tra từ ngay trong trình duyệt iPad!
