# 📱 VocabMaster AI — Hệ Sinh Thái Học & Dịch Thuật Trên iPad (iPadOS v1.1.0)

> **VocabMaster AI for iPad** mang toàn bộ sức mạnh dịch **Thuần Việt 100%**, AI phân tích câu, đọc & bôi đen file PDF và **đồng bộ Sổ từ vựng 2 chiều theo thời gian thực với Chrome trên máy tính PC** lên iPad — hoàn toàn miễn phí, không cần máy tính Mac.

---

## ✨ 4 Cách Bôi Đen & Dịch Ngay Trên iPad

1. **Bôi đen trên MỌI trang web ngay trong Apple Safari iPad (Nút ✨ nổi như PC):**
   - Cài ứng dụng miễn phí **Userscripts** trên Apple App Store (hoàn toàn miễn phí, mã nguồn mở).
   - Bật **Cài đặt (iPad) ➔ Safari ➔ Phần mở rộng ➔ Userscripts** ➔ Cho phép trên *Tất cả trang web*.
   - Mở `https://khongphaifu.github.io/VocabMaster-AI/ipad/vocabmaster.user.js` trên Safari iPad để cài script VocabMaster AI.
   - Từ giờ, bôi đen từ/câu bất kỳ trên Facebook, Google, Youpass, báo tiếng Anh... đều **hiện nút `✨` nổi**, bấm lưu là tự đồng bộ về cả App iPad và Chrome PC!

2. **Bôi đen trực tiếp trên PDF & Bài Đọc trong App VocabMaster iPad (`📄 Đọc & PDF`):**
   - Mở trực tiếp file `.pdf` từ ứng dụng **Tệp (Files) / iCloud Drive** hoặc dán bài đọc IELTS vào app.
   - Bôi đen bằng ngón tay hoặc Apple Pencil ➔ Nút **`✨ Dịch AI`** nổi lên ngay lập tức ➔ Xem giải thích chuẩn Cambridge & bấm 1 chạm lưu vào sổ chung.

3. **Dịch nhanh trong App khác (Apple Books, GoodNotes, Kindle, Mail...):**
   - **Cách A — Cửa sổ nổi Slide Over + Tự bắt Clipboard:** Mở VocabMaster AI ở chế độ **Slide Over** bên cạnh ứng dụng đọc sách, bật công tắc *"Tự động dịch khi Copy từ app khác"*. Chỉ cần Copy bên Apple Books/GoodNotes rồi chạm vào cửa sổ nổi là tự động dịch ngay!
   - **Cách B — Apple Shortcuts (Menu Chia sẻ Toàn hệ thống):** Tạo 1 Phím tắt iPadOS nhận Văn bản từ Bảng chia sẻ (`Share Sheet`) ➔ Hành động *Mở URL*: `https://khongphaifu.github.io/VocabMaster-AI/ipad/?q=[Shortcut Input]`. Khi bôi đen chữ ở bất kỳ app nào ➔ bấm **Chia sẻ ➔ Dịch VocabMaster**.

4. **Orion Browser (Nạp nguyên bản Chrome Extension trên iPad):**
   - Tải **Orion Browser** trên App Store ➔ Nạp tệp `vocabmaster-extension.zip` tại `https://khongphaifu.github.io/VocabMaster-AI/`.

---

## 🚀 Hướng Dẫn Triển Khai & Ghép Nối Đồng Bộ 2 Chiều PC ↔ iPad (2 Phút)

### Bước 1: Bật GitHub Pages (Làm 1 lần duy nhất)
1. Vào repository GitHub của bạn: `https://github.com/khongphaifu/VocabMaster-AI`
2. Vào **Settings ➔ Pages**.
3. Ở mục **Build and deployment / Source**, chọn **GitHub Actions** (workflow `.github/workflows/deploy-pages.yml` đã được cấu hình sẵn trong dự án).
4. Đường dẫn ứng dụng của bạn sẽ hoạt động tại: `https://khongphaifu.github.io/VocabMaster-AI/ipad/`

### Bước 2: Liên Kết 2 Sổ Từ Chrome PC ↔ iPad Bằng Mã QR
1. Trên máy tính Chrome PC, vào **Cài đặt (Options)** của VocabMaster AI.
2. Kéo xuống mục **☁️ Liên Kết Đồng Bộ 2 Chiều PC Chrome ↔ iPad**.
3. Tạo 1 GitHub Token (chỉ tick quyền `gist`) ➔ Dán vào và bấm **☁️ Lưu & Đồng Bộ Ngay**.
4. Bấm **📱 Hiện Mã QR Ghép Nối iPad**.
5. Dùng **Camera của iPad** quét mã QR đó ➔ Mở bằng Safari ➔ Toàn bộ Token Sync + API Keys AI + Sổ từ vựng từ PC tự động nạp sang iPad trong 1 giây!
6. Trên Safari iPad, bấm biểu tượng **Chia sẻ (Share) ➔ Thêm vào MH chính (Add to Home Screen)** để cài thành ứng dụng độc lập!
