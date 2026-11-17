# 📱 VocabMaster AI — Đọc File, Bôi Đen & Dịch Thuần Việt Trên iPad (iPadOS v1.1.1)

> **VocabMaster AI for iPad** biến iPad thành trình đọc tài liệu thông minh: mở trực tiếp file **PDF, PDF Scan, Word (.docx), .txt/.md/.srt, Ảnh chụp tài liệu**, chạm 1 từ hoặc bôi đen cả câu là AI phân tích **Thuần Việt 100%** ngay tại chỗ và **đồng bộ Sổ từ vựng 2 chiều theo thời gian thực với Chrome trên máy tính PC**.

---

## 📂 Đọc & Bôi Đen Mọi Loại File Trên iPad (`📄 Đọc File`)

Trong tab **📄 Đọc File** (hoặc bấm nút mở nhanh ngay tại màn hình chính):

1. **Hỗ trợ đa định dạng — Không cần ứng dụng trung gian:**
   - **PDF chuẩn:** Tự động dựng chữ sắc nét chuẩn Retina, hỗ trợ nhảy trang nhanh (`Trang [số] / tổng`), phóng to/thu nhỏ và 3 giao diện nền (*Đêm / Vàng dịu / Sáng*).
   - **PDF Scan (file PDF dạng ảnh chụp không bôi đen được):** Tự động phát hiện trang scan và hiện nút **`🔍 Quét OCR trang này`** (dùng Gemini Vision hoặc OpenAI Vision) để biến ảnh thành chữ có thể chạm & bôi đen dịch bình thường.
   - **File Word (`.docx`):** Trích xuất văn bản trực tiếp ngay trên iPad (offline 100%) giữ nguyên từng đoạn văn.
   - **Tài liệu chữ & Phụ đề (`.txt`, `.md`, `.srt`, `.csv`):** Lọc sạch timestamp phụ đề `.srt` để đọc luyện nghe & dịch mượt mà.
   - **Ảnh chụp trang sách / đề thi (`.png`, `.jpg`, `.jpeg`, `.webp`):** Tự động OCR lấy chữ từ ảnh để tra từ & dịch câu ngay bên dưới ảnh gốc.

2. **2 Cách Tra Từ Cực Nhanh Trong File:**
   - **👆 Chạm 1 từ là dịch (Mặc định Bật):** Chỉ cần **chạm ngón tay hoặc chấm Apple Pencil** đúng 1 lần vào từ cần tra ➔ Bottom Sheet hiện nghĩa chuẩn Cambridge, phiên âm IPA UK/US và nút phát âm tức thì — **không cần giữ kéo bôi đen vất vả**.
   - **✨ Bôi đen cả cụm/câu:** Bôi đen từ 2 từ trở lên hoặc cả đoạn ➔ nút nổi **`✨ Dịch AI`** xuất hiện ngay bên dưới vùng bôi đen (né thanh Copy đen của iPadOS) ➔ giải thích chi tiết & trích xuất từng từ vựng quan trọng để bấm `+ Lưu`.

3. **Tiện Ích Đọc Liên Tục:**
   - **Tự nhớ file vừa đọc:** Mở lại app là thấy ngay nút **📖 Tiếp tục đọc** đúng tên file & đúng số trang PDF bạn đang đọc dở (lưu cục bộ bằng IndexedDB, tối đa 25MB).
   - **Kéo & Thả (Split View Drag & Drop):** Mở song song **Tệp (Files)** và **VocabMaster AI** trên iPad, kéo file hoặc đoạn chữ thả thẳng vào màn hình app để mở dịch ngay.

---

## 🌐 Thêm: Bôi Đen Web Safari & App Khác

1. **Trên Apple Safari iPad (`vocabmaster.user.js`):**
   - Cài app miễn phí **Userscripts** trên App Store ➔ Bật trong *Cài đặt ➔ Safari ➔ Phần mở rộng* ➔ Cài script từ `https://khongphaifu.github.io/VocabMaster-AI/ipad/vocabmaster.user.js` để bôi đen hiện nút `✨` trên mọi trang web.
2. **Trong App Khác (Apple Books, GoodNotes, Kindle...):**
   - Mở VocabMaster AI ở chế độ **Slide Over** + bật công tắc *"Tự động dịch khi Copy từ app khác"*, hoặc dùng **Apple Shortcuts** Chia sẻ tới `https://khongphaifu.github.io/VocabMaster-AI/ipad/?q=`.
3. **Orion Browser:** Hổ trợ nạp file `vocabmaster-extension.zip` tại `https://khongphaifu.github.io/VocabMaster-AI/`.

---

## 🚀 Hướng Dẫn Triển Khai & Ghép Nối Đồng Bộ 2 Chiều PC ↔ iPad (2 Phút)

### Bước 1: Bật GitHub Pages (Làm 1 lần duy nhất)
1. Vào repository GitHub: `https://github.com/khongphaifu/VocabMaster-AI` ➔ **Settings ➔ Pages**.
2. Chọn **Build and deployment / Source: GitHub Actions**.
3. Mở trên Safari iPad tại: `https://khongphaifu.github.io/VocabMaster-AI/ipad/` ➔ bấm **Chia sẻ (Share) ➔ Thêm vào MH chính (Add to Home Screen)**.

### Bước 2: Liên Kết 2 Sổ Từ Chrome PC ↔ iPad Bằng Mã QR
1. Trên Chrome PC, vào **Cài đặt** của VocabMaster AI ➔ mục **☁️ Liên Kết Đồng Bộ 2 Chiều PC Chrome ↔ iPad**.
2. Dán GitHub Token (quyền `gist`) ➔ bấm **☁️ Lưu & Đồng Bộ Ngay** ➔ bấm **📱 Hiện Mã QR Ghép Nối iPad**.
3. Dùng Camera iPad quét mã QR ➔ Mở bằng Safari để tự động nạp Token Sync + API Keys AI + Sổ từ vựng sang iPad trong 1 giây!
