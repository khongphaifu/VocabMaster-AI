# 💻 VocabMaster AI - Phiên bản Windows Desktop

> **VocabMaster AI for Windows** là ứng dụng tra cứu từ điển học thuật và học từ vựng thông minh chạy độc lập trên hệ điều hành **Windows 10 / 11**. Ứng dụng tích hợp trực tiếp nguồn từ điển chuẩn **Cambridge Online**, dữ liệu câu ví dụ **Oxford Dictionary**, bộ giải nghĩa từ tiếng Việt chuẩn danh từ hóa và hệ thống đa AI (Google Gemini 2.5, Groq GPT-OSS 20B/120B).

---

## ✨ Tính năng nổi bật trên Windows

1. **Chạy độc lập (Desktop Native App)**: Hoạt động riêng biệt trên máy tính, không phụ thuộc vào việc bật hay tắt trình duyệt web.
2. **Phím tắt toàn cục (`Ctrl + Shift + D`)**: Nhấn tổ hợp phím này từ bất kỳ đâu trên màn hình Windows để bật/ẩn nhanh cửa sổ tra từ.
3. **Tra từ điển siêu tốc & Chuẩn danh từ tiếng Việt**:
   - Tự động nhận diện từ loại: Danh từ ra nghĩa danh từ (`observation` ➔ *Sự quan sát, nhận xét; (Toán/AI) mẫu quan sát*), Động từ ra nghĩa động từ.
   - Phiên âm quốc tế IPA chuẩn Anh (UK) và Mỹ (US), không bị méo âm hay lẫn ký tự lạ.
   - Tự động phát âm chuẩn bản xứ.
4. **Họ từ vựng (Word Family) & Collocations chuẩn xác**:
   - Loại bỏ hoàn toàn các lỗi bịa từ tiếng Anh, hiển thị đúng các gốc từ ngữ pháp (`observe`, `observer`, `observational`).
5. **Sổ từ vựng & Minigames ôn tập toàn diện**:
   - 📖 **Sổ từ vựng**: Quản lý kho từ, phân loại *Mới thêm*, *Đang học*, *Đã thuộc*, xuất file Excel (.csv).
   - 🃏 **Flashcards 3D**: Lật thẻ ghi nhớ, phím tắt Space và mũi tên trái/phải.
   - 🎯 **Trắc nghiệm (Quiz)**: Luyện phản xạ nhận diện nghĩa.
   - ⌨️ **Luyện gõ từ (Typing Test)**: Nghe âm thanh và gõ lại để nhớ chính tả.
   - 📊 **Tiến độ học tập**: Biểu đồ tỷ lệ ghi nhớ và thống kê chi tiết.
6. **Tùy biến giao diện**: Chuyển đổi linh hoạt giữa giao diện Tối (Dark Theme) và Sáng (Light Theme).

---

## 🚀 Hướng dẫn Cài đặt & Sử dụng trên Windows

### Yêu cầu Hệ điều hành:
* **Hệ điều hành**: Windows 10 hoặc Windows 11 (64-bit).
* **Môi trường chạy**: Đã cài đặt [Node.js](https://nodejs.org/) (phiên bản 18, 20 hoặc 22 LTS).

---

### Cách 1: Chạy trực tiếp từ mã nguồn (Khuyên dùng khi phát triển)

1. Mở cửa sổ **Terminal / PowerShell** và chuyển vào thư mục `windows`:
   ```powershell
   cd d:\extension\windows
   ```
   *(hoặc thư mục bạn đã clone repo về, ví dụ `cd VocabMaster-AI/windows`)*

2. Cài đặt các gói phụ thuộc (chỉ cần chạy lần đầu):
   ```powershell
   npm install
   ```

3. Khởi chạy ứng dụng:
   ```powershell
   npm start
   ```
   *Cửa sổ ứng dụng VocabMaster AI sẽ xuất hiện ngay lập tức trên màn hình!*

---

### Cách 2: Đóng gói thành file chạy `.exe` độc lập (Portable)

Nếu bạn muốn tạo một file chạy `.exe` duy nhất để có thể sao chép sang máy tính khác, gửi cho bạn bè hoặc đặt ở màn hình Desktop mà không cần mở qua dòng lệnh:

1. Chạy lệnh đóng gói bản Portable:
   ```powershell
   npm run dist
   ```

2. Sau khi quá trình đóng gói hoàn tất, file `.exe` sẽ được tạo trong thư mục `dist/`:
   ```text
   windows/dist/VocabMaster-AI-Windows-Portable-1.0.19.exe
   ```

3. **Sử dụng**: Bấm đúp chuột vào file `.exe` để sử dụng ngay lập tức mà không cần cài đặt!

---

### Cách 3: Đóng gói thành Bộ cài đặt Setup (`.exe` Installer)

Nếu bạn muốn tạo file cài đặt có biểu tượng Desktop Shortcut và xuất hiện trong Start Menu Windows:

```powershell
npm run dist:installer
```
File cài đặt sẽ được tạo tại `windows/dist/VocabMaster-AI-Setup-1.0.19.exe`.

---

## ⚙️ Hướng dẫn Cấu hình API Key AI (Tùy chọn)

Ứng dụng có thể tra cứu từ điển ngoại tuyến và trực tuyến hoàn toàn miễn phí mà không cần nhập API key. Tuy nhiên, nếu bạn muốn kích hoạt tính năng phân tích chuyên sâu của AI:

1. Mở tab **⚙️ Cài đặt AI** ở thanh bên trái ứng dụng.
2. Chọn nhà cung cấp AI:
   * **Google Gemini (Khuyên dùng)**: Lấy API key miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey).
   * **Groq Cloud (Siêu tốc)**: Lấy API key miễn phí tại [Groq Console](https://console.groq.com/keys).
3. Dán API key vào ô tương ứng và bấm **"Lưu cấu hình"**.
