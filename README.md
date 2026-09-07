# 🌟 VocabMaster AI - Chrome Extension

> **VocabMaster AI** là tiện ích mở rộng trên Google Chrome (Manifest V3) hỗ trợ tra từ điển, dịch thuật chuyên sâu và học từ vựng thông minh kết hợp giữa **Cambridge Dictionary Online** và các mô hình **Trí tuệ nhân tạo (AI)** tiên tiến (Google Gemini, Groq, OpenAI GPT-4o, Claude 3.5).

---

## ✨ Tính năng nổi bật

### 1. 📖 Tra cứu từ điển chuẩn Cambridge & AI
* **Ưu tiên Cambridge Dictionary Online**: Tự động tra cứu trực tiếp dữ liệu từ `dictionary.cambridge.org` (Cambridge English-Vietnamese Dictionary), trích xuất chuẩn xác từ nguyên thể (lemma), phiên âm UK/US, từ loại, cấp độ CEFR (A1-C2), nghĩa thuần Việt, định nghĩa tiếng Anh và ví dụ minh họa.
* **Hỗ trợ đa AI thông minh**: Tự động chuyển tiếp (fallback) sang các mô hình AI mạnh mẽ (Gemini 2.5/Flash, Groq LLaMA, GPT-4o Mini, Claude) với Prompt thiết kế nghiêm ngặt theo chuẩn từ điển học thuật.
* **Dịch câu và đoạn văn**: Phân tích ngữ cảnh, giải thích cấu trúc ngữ pháp và sắc thái từ ngữ.
* **Phát âm chuẩn bản xứ**: Nghe phát âm tiếng Anh chuẩn Anh (UK) và Anh (US).

### 2. ⚡ Thao tác nhanh & Trực quan
* **Bôi đen là tra**: Biểu tượng lơ lửng `✨` xuất hiện ngay khi bôi đen từ/câu trên mọi trang web.
* **Giao diện Popup tra cứu 2 chiều**: Hỗ trợ chuyển đổi linh hoạt:
  * 🌐 Tự động (Auto detect)
  * 🇬🇧 Anh ➔ 🇻🇳 Tiếng Việt
  * 🇻🇳 Tiếng Việt ➔ 🇬🇧 Anh
* **Liên kết trực tiếp tới Cambridge**: Bấm nút `📖` để xem đầy đủ mục từ trên trang chính thức của Cambridge Dictionary.

### 3. 📚 Sổ từ vựng (Vocabulary Library)
* **Thư viện nổi trong trang (In-Page Modal)**: Mở nhanh danh sách từ đã lưu ngay trên trang web hiện tại không làm gián đoạn việc đọc.
* **Thanh bên Side Panel (Chrome Side Panel)**: Không gian học tập mở rộng, quản lý toàn bộ kho từ vựng.
* **Phân loại trạng thái**: Theo dõi tiến trình học qua các nhãn *Mới thêm*, *Đang học*, *Đã thuộc*.
* **Tìm kiếm & Bộ lọc theo thời gian thực**: Lọc từ khóa theo tiếng Anh hoặc nghĩa tiếng Việt tức thì.

### 4. 🎮 Minigames ôn tập từ vựng
* 🎴 **Flashcard**: Lật thẻ ghi nhớ 2 mặt với phát âm tự động.
* ❓ **Quiz (Trắc nghiệm)**: Bài tập chọn nghĩa đúng giúp củng cố phản xạ.
* ⌨️ **Typing Test (Gõ từ)**: Luyện nhớ chính tả và mặt chữ.
* 📊 **Thống kê tiến độ**: Biểu đồ số lượng từ theo từng cấp độ và tỷ lệ nhớ từ.

### 5. 📤 Nhập / Xuất dữ liệu linh hoạt
* Xuất danh sách từ vựng ra file **Excel (.xlsx)** định dạng chuẩn.
* Đồng bộ với **Google Sheets** thông qua Google Cloud API.

---

## 🚀 Hướng dẫn cài đặt

1. **Tải mã nguồn**:
   ```bash
   git clone https://github.com/khongphaifu/VocabMaster-AI.git
   ```
2. **Cài đặt vào Chrome**:
   * Mở trình duyệt Google Chrome, truy cập địa chỉ: `chrome://extensions`
   * Bật công tắc **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên bên phải.
   * Nhấn nút **Load unpacked (Tải tiện ích đã giải nén)**.
   * Chọn thư mục `extension` chứa mã nguồn.
3. **Cấu hình API Key (Tùy chọn)**:
   * Nhấn vào biểu tượng tiện ích **VocabMaster AI** trên thanh công cụ ➔ Bấm vào biểu tượng bánh răng **⚙️ (Settings)**.
   * Nhập API key của nhà cung cấp AI mong muốn (Google Gemini miễn phí, Groq tốc độ siêu nhanh, OpenAI hoặc Claude).

---

## 🛠️ Công nghệ sử dụng

* **Manifest Version**: Chrome Extensions Manifest V3
* **Ngôn ngữ**: Pure JavaScript (ES Modules), HTML5, Modern CSS3
* **Tích hợp API**:
  * Cambridge Dictionary Online Parser
  * Google Gemini API (`@google/genai`)
  * Groq Cloud API
  * OpenAI API & Anthropic Claude API
  * Chrome Storage Local / Sync API
  * Web Speech Synthesis API
  * SheetJS (`xlsx.min.js`)

---

## 📄 Bản quyền & Giấy phép

Phát triển bởi [@khongphaifu](https://github.com/khongphaifu). Dự án được phát hành dưới giấy phép MIT License.
