# 🌟 VocabMaster AI - Đa Nền Tảng (Windows • iPad • Chrome Extension)

> **VocabMaster AI** là hệ sinh thái tra cứu từ điển học thuật và học từ vựng thông minh đa nền tảng kết hợp giữa nguồn từ điển chuẩn **Cambridge Dictionary Online**, dữ liệu câu ví dụ **Oxford Dictionary**, chuẩn danh từ hóa tiếng Việt và các mô hình **Trí tuệ nhân tạo (AI)** tiên tiến nhất (Google Gemini 2.5, Groq GPT-OSS 20B/120B, OpenAI, Claude, DeepSeek).

---

## 🚀 Chọn Phiên bản Cài đặt cho Thiết bị của Bạn

VocabMaster AI hiện được đóng gói chuyên biệt cho 3 nền tảng:

| Nền tảng | Định dạng | Điểm nổi bật | Hướng dẫn cài đặt |
| :--- | :--- | :--- | :--- |
| 💻 **Windows** | Ứng dụng Desktop (`.exe`) | Chạy độc lập, phím tắt toàn cục `Ctrl+Shift+D`, Sổ từ, Flashcards, Quiz, Luyện gõ từ | 👉 [Xem hướng dẫn Windows](windows/README.md) |
| 📱 **iPad (iPadOS)** | Ứng dụng Touch PWA | Cài ra Màn hình chính trong 30s, hỗ trợ chia đôi màn hình **Split View** đọc sách PDF, vuốt chạm thẻ | 👉 [Xem hướng dẫn iPad](ipad/README.md) |
| 🌐 **Chrome / Edge** | Tiện ích mở rộng (Manifest V3) | Bôi đen từ/câu trên mọi trang web để tra cứu tức thì, thanh bên Side Panel | 👉 [Xem hướng dẫn Extension](#-hướng-dẫn-cài-đặt-chrome--edge-extension) |

---

## ✨ Tính năng nổi bật của Hệ thống (v1.0.19)

### 1. 📖 Tra cứu từ điển chuẩn Cambridge, Oxford & AI
* **Ưu tiên Cambridge Dictionary Online**: Tự động trích xuất chuẩn xác từ nguyên thể (lemma), phiên âm UK/US, từ loại, cấp độ CEFR (A1-C2), định nghĩa tiếng Anh và ví dụ minh họa.
* **Chuẩn hóa Danh từ tiếng Việt (`v1.0.19`)**: Khắc phục triệt để lỗi dịch danh từ hành động thành động từ thô (`observation` ➔ *Sự quan sát, nhận xét; (Toán/AI) mẫu quan sát*, `investigation` ➔ *Cuộc điều tra*, `measurement` ➔ *Phép đo*).
* **Phiên âm quốc tế IPA chuẩn mực**: Loại bỏ hoàn toàn các ký tự phiên âm ASCII lạ (như chữ in hoa `SH`, `ZH` hay macrons), đảm bảo phát âm chính xác chuẩn Cambridge/Oxford.
* **Động cơ Hình thái học & Họ từ vựng (Word Family)**: Hiển thị chuẩn xác các gốc từ ngữ pháp (`observe`, `observer`, `observational`), tuyệt đối không tự bịa từ.
* **Hỗ trợ đa AI thông minh**: Tự động kết nối các mô hình AI thế hệ mới nhất (Gemini 2.5 Flash, Groq GPT-OSS 20B/120B) với prompt học thuật chuyên sâu.

### 2. 📚 Sổ từ vựng (Vocabulary Library)
* Lưu trữ từ vựng trực tiếp trên máy không giới hạn.
* Phân loại trạng thái học tập: *Mới thêm*, *Đang học*, *Đã thuộc*.
* Tìm kiếm và lọc theo thời gian thực.
* Xuất danh sách từ vựng ra file **Excel / CSV**.

### 3. 🎮 Minigames ôn tập từ vựng
* 🎴 **Flashcards 3D**: Lật thẻ ghi nhớ 2 mặt, phát âm tự động, hỗ trợ cử chỉ vuốt trên iPad và phím Space trên máy tính.
* 🎯 **Quiz (Trắc nghiệm)**: Bài tập chọn nghĩa đúng 4 phương án củng cố phản xạ.
* ⌨️ **Typing Test (Gõ từ)**: Nghe phát âm và nhìn nghĩa tiếng Việt để gõ lại chuẩn chính tả tiếng Anh.
* 📊 **Thống kê tiến độ**: Đo lường tỷ lệ ghi nhớ và theo dõi quá trình học tập.

---

## 🌐 Hướng dẫn Cài đặt Chrome / Edge Extension

1. **Tải mã nguồn về máy**:
   ```bash
   git clone https://github.com/khongphaifu/VocabMaster-AI.git
   ```
2. **Cài đặt vào trình duyệt**:
   * Mở trình duyệt Chrome hoặc Microsoft Edge, truy cập: `chrome://extensions`
   * Bật công tắc **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên bên phải.
   * Nhấn nút **Load unpacked (Tải tiện ích đã giải nén)**.
   * Chọn thư mục chứa mã nguồn của dự án.
3. **Cấu hình API Key (Tùy chọn)**:
   * Bấm vào biểu tượng tiện ích **VocabMaster AI** trên thanh công cụ ➔ Biểu tượng **⚙️ (Cài đặt)** để nhập API key Gemini hoặc Groq miễn phí.

---

## 📂 Cấu trúc Thư mục Dự án

```text
VocabMaster-AI/
├── windows/               # Ứng dụng Desktop cho Windows (Electron)
│   ├── package.json       # Cấu hình đóng gói .exe
│   ├── main.js            # Tiến trình chính & Phím tắt Ctrl+Shift+D
│   ├── index.html         # Giao diện All-in-One hiện đại
│   ├── renderer.js        # Logic điều khiển tra từ & minigames
│   ├── styles.css         # Giao diện Fluent UI
│   └── README.md          # Hướng dẫn chi tiết cho Windows
├── ipad/                  # Ứng dụng cho iPad (iPadOS Touch PWA)
│   ├── manifest.webmanifest # Cấu hình PWA cài ra Màn hình chính
│   ├── sw.js              # Service Worker lưu offline
│   ├── index.html         # Giao diện cảm ứng, tối ưu Split View
│   ├── app.js             # Logic vuốt chạm Flashcard & Audio
│   ├── styles.css         # CSS cảm ứng chuẩn Apple
│   └── README.md          # Hướng dẫn chi tiết cho iPad
├── content/               # Script bôi đen tra từ trên trình duyệt
├── popup/                 # Popup tra nhanh của Chrome Extension
├── sidepanel/             # Giao diện thanh bên Chrome Side Panel
├── utils/                 # Động cơ từ điển Cambridge, Google Dict, AI
├── manifest.json          # Manifest V3 cho Chrome Extension
└── README.md              # Tài liệu tổng quan dự án
```

---

## 📄 Bản quyền & Giấy phép

Phát triển bởi [@khongphaifu](https://github.com/khongphaifu). Dự án được phát hành dưới giấy phép MIT License.
