# 📖 VocabMaster AI — Tài Liệu Kỹ Thuật & Toàn Bộ Kiến Trúc Dự Án (Project Documentation A–Z)

> **Phiên bản:** 1.0.25  
> **Cập nhật gần nhất:** Tháng 11/2026  
> **Nền tảng hỗ trợ:** Google Chrome Extension (Manifest V3), Windows Desktop (Electron), iPad (Progressive Web App - PWA)  
> **Tác giả:** Đội ngũ Kỹ sư Dự án VocabMaster AI

---

## 📑 Mục Lục Chi Tiết

1. [Tổng Quan & Tầm Nhìn Dự Án](#1-tổng-quan--tầm-nhìn-dự-án)
2. [Sơ Đồ Cấu Trúc Toàn Bộ Dự Án (File Tree & Module Map)](#2-sơ-đồ-cấu-trúc-toàn-bộ-dự-án-file-tree--module-map)
3. [Kiến Trúc Đa Nền Tảng (Cross-Platform Architecture)](#3-kiến-trúc-đa-nền-tảng-cross-platform-architecture)
   - 3.1. Chrome Extension (Manifest V3)
   - 3.2. Windows Desktop App (Electron)
   - 3.3. iPad Tablet App (PWA Standalone)
4. [Hệ Thống Dịch Thuật Đa Tầng Chuẩn Thuần Việt (Multi-Tier Translation Pipeline)](#4-hệ-thống-dịch-thuật-đa-tầng-chuẩn-thuần-việt-multi-tier-translation-pipeline)
   - 4.1. Tầng 1: Từ điển Cốt lõi Thuần Việt Hiện Đại (`modern-lexicon.js`)
   - 4.2. Khử từ ngữ cổ xưa & sượng trân (Archaic Blacklist & Sanitizer)
   - 4.3. Phân biệt nghĩa theo ngữ cảnh (Contextual Disambiguation)
   - 4.4. Tầng 2: Trích xuất Cambridge Dictionary Online (`cambridge-client.js`)
   - 4.5. Tầng 3: Free Dictionary API & Datamuse IPA Engine (`dict-resolver.js`)
   - 4.6. Tầng 4: Bộ điều hợp AI Đa Nền tảng (`ai-client.js` - Gemini, Groq, OpenAI, Claude)
5. [Cơ Chế Bôi Đen & Dịch Trong Mọi Môi Trường (Universal Selection Engine)](#5-cơ-chế-bôi-đen--dịch-trong-mọi-môi-trường-universal-selection-engine)
   - 5.1. Xử lý trong `<iframe>` đa tầng (`all_frames: true`)
   - 5.2. Đánh bại lệnh chặn sự kiện (`useCapture: true` vs `e.stopPropagation()`)
   - 5.3. Bẻ khóa chống sao chép trên trang E-learning & LMS (Youpass, đề thi)
   - 5.4. Hỗ trợ Shadow DOM & Web Components
   - 5.5. Hỗ trợ Form Controls (`<input>`, `<textarea>`)
   - 5.6. Thuật toán Neo Tọa độ & Chống Tràn Màn hình (Coordinate Clamping)
6. [Hệ Thống Đọc & Dịch File PDF Toàn Diện (Dual PDF Engine)](#6-hệ-thống-đọc--dịch-file-pdf-toàn-diện-dual-pdf-engine)
   - 6.1. Nguyên nhân Chrome chặn content script trên PDF gốc
   - 6.2. Giải pháp 1: Trình Đọc PDF Chuyên Nghiệp Tích Hợp (`pdf/reader.html`)
   - 6.3. Cơ chế Tự động Điều hướng PDF (`webNavigation.onBeforeNavigate`)
   - 6.4. Vượt rào cản CORS với Background Proxy (`FETCH_PDF_BUFFER`)
   - 6.5. Giải pháp 2: Tra cứu nhanh qua Side Panel
7. [Giao Diện & Trải Nghiệm Người Dùng (UI/UX System)](#7-giao-diện--trải-nghiệm-người-dùng-uiux-system)
   - 7.1. Bảng màu Catppuccin Mocha Dark
   - 7.2. Công nghệ Vỏ Tức Thì (Instant Shell 0ms & Skeleton Shimmer)
   - 7.3. Hiệu ứng Chuyển cảnh Đối xứng (Symmetrical Spring Animations)
   - 7.4. Phát âm Audio Chuẩn Bản Xứ
8. [Quản Lý Sổ Từ Vựng & Ôn Tập (Vocabulary Learning Suite)](#8-quản-lý-sổ-từ-vựng--ôn-tập-vocabulary-learning-suite)
   - 8.1. Sổ từ vựng thông minh (Thư viện cá nhân)
   - 8.2. Chế độ luyện tập Flashcard 3D
   - 8.3. Chế độ trắc nghiệm Quiz
   - 8.4. Chế độ gõ chính tả Typing
   - 8.5. Đồng bộ hóa Google Sheets & Xuất Excel/CSV
9. [Hướng Dẫn Cài Đặt & Sử Dụng (Installation & Usage)](#9-hướng-dẫn-cài-đặt--sử-dụng-installation--usage)
   - 9.1. Cài đặt Chrome Extension
   - 9.2. Cài đặt và build bản Windows (.exe)
   - 9.3. Cài đặt bản iPad (PWA)
10. [Hệ Thống Kiểm Thử & Đảm Bảo Chất Lượng (Quality Assurance & Tests)](#10-hệ-thống-kiểm-thử--đảm-bảo-chất-lượng-quality-assurance--tests)
11. [Lịch Sử Phiên Bản & Đóng Góp (Changelog)](#11-lịch-sử-phiên-bản--đóng-góp-changelog)

---

## 1. Tổng Quan & Tầm Nhìn Dự Án

**VocabMaster AI** là một hệ sinh thái tiện ích hỗ trợ đọc hiểu tiếng Anh, dịch thuật thông minh và học từ vựng chuyên sâu dành cho học sinh, sinh viên, người ôn thi IELTS/TOEIC và các chuyên gia nghiên cứu.

### Vấn Đề Lớn Mà Các Công Cụ Dịch Hiện Nay Gặp Phải:
1. **Dịch sượng trân, máy móc, từ ngữ cổ xưa:** Các công cụ tự động hoặc từ điển cũ thường dịch từ ngữ rất tối nghĩa. Ví dụ: *principal* dịch thành "giám đốc trường" (thay vì "hiệu trưởng"), *announcement* dịch thành "lời rao" (thay vì "thông báo"), *car* dịch thành "máy xe", *drought* dịch thành "thời kỳ khô hạn",...
2. **Không phân biệt được ngữ cảnh (Disambiguation):** Một từ như *bank* khi đứng cạnh *river* phải dịch là "bờ sông", khi đứng cạnh *money* phải dịch là "ngân hàng". *Novel* khi đi với *idea* phải là "mới lạ, độc đáo", khi đi với *book* mới là "tiểu thuyết".
3. **Bị tê liệt trên các nền tảng giáo dục & đề thi (LMS / E-learning):** Các trang thi trực tuyến như `e-learning.youpass.vn`, Canvas, Blackboard, Moodle thường nhúng đề thi trong thẻ `<iframe>`, khóa chuột bằng `e.stopPropagation()`, hoặc chặn bôi đen bằng `user-select: none`. Tiện ích dịch thông thường hoàn toàn không hoạt động.
4. **Không thể bôi đen dịch trên file PDF trong Chrome:** Trình xem PDF mặc định của Chrome (`PDFium`) nằm trong môi trường bảo mật cô lập (`chrome-extension://mhjfb...`), ngăn cấm mọi extension tiêm mã kịch bản `content_scripts`. Người dùng bôi đen chữ trên file PDF thì không bao giờ thấy nút dịch nổi lên.

### Mục Tiêu Của VocabMaster AI:
- **Dịch Thuần Việt 100%:** Diễn đạt tự nhiên, gãy gọn, theo chuẩn từ điển học thuật Cambridge English-Vietnamese.
- **Hoạt động trong MỌI môi trường:** Mọi trang web, mọi khung con `<iframe>`, mọi thành phần Web Component `Shadow DOM`, các ô nhập liệu `<input>` / `<textarea>`, các trang web chống copy, và mọi file PDF trực tuyến hoặc kéo thả từ máy tính.
- **Tốc độ phản hồi 0ms:** Hiển thị thẻ tra cứu tức thì với hiệu ứng shimmer skeleton, không làm đứt đoạn mạch đọc của người dùng.
- **Đồng bộ đa thiết bị:** Hoạt động liền mạch trên máy tính (Chrome / Edge / Brave), ứng dụng máy bàn Windows (Electron), và máy tính bảng iPad (PWA).

---

## 2. Sơ Đồ Cấu Trúc Toàn Bộ Dự Án (File Tree & Module Map)

Dự án được tổ chức khoa học, tách biệt rõ ràng giữa lõi xử lý, giao diện mở rộng, ứng dụng chuyên biệt và công cụ hỗ trợ:

```
d:/extension/
├── manifest.json                  # Cấu hình Manifest V3 cho Chrome Extension (v1.0.25)
├── service-worker.js              # Nền tảng điều phối MV3 (routing, background proxy, cache)
├── test_universal_verification.mjs # Bộ kiểm thử tự động xác minh toàn diện các tính năng
│
├── content/                       # Kịch bản tiêm vào trang web (Content Script)
│   ├── content.js                 # Universal Selection Engine, Deep DOM, Bẻ khóa sự kiện
│   └── content.css                # Giao diện thẻ nổi Catppuccin Mocha, nút ✨ ma thuật
│
├── pdf/                           # Hệ thống Trình đọc & Dịch PDF Chuyên nghiệp
│   ├── reader.html                # Giao diện chính của PDF Viewer
│   ├── reader.js                  # Bộ xử lý PDF.js, kết xuất TextLayer, xử lý URL & CORS
│   └── reader.css                 # Phong cách Dark / Sepia / Light của PDF Reader
│
├── sidepanel/                     # Giao diện thanh bên Chrome Side Panel
│   ├── sidepanel.html             # Khung hiển thị tra nhanh, sổ từ vựng, flashcard
│   ├── sidepanel.js               # Logic điều khiển, luyện tập từ vựng, phát âm
│   └── sidepanel.css              # Phong cách giao diện thanh bên
│
├── popup/                         # Giao diện menu popover khi bấm vào icon extension
│   ├── popup.html                 # Tra từ nhanh, thống kê số lượng từ, truy cập nhanh PDF
│   └── popup.js                   # Logic xử lý tra cứu popover
│
├── settings/                      # Trang cài đặt tùy biến của Tiện ích (Options Page)
│   ├── settings.html              # Cấu hình AI, Google Sheets OAuth, Môi trường Dịch & PDF
│   └── settings.js                # Quản lý khóa API, kiểm tra kết nối AI, xuất nhập CSV/Excel
│
├── utils/                         # Thư viện thuật toán cốt lõi & Từ điển học thuật
│   ├── modern-lexicon.js          # Kho từ điển Cốt lõi Thuần Việt, bộ lọc từ cổ, khử sượng
│   ├── dict-resolver.js           # Bộ giải nghĩa từ điển Cambridge + FreeDict + Datamuse IPA
│   ├── cambridge-client.js        # Bộ thu thập & phân tích dữ liệu Cambridge Dictionary Online
│   └── ai-client.js               # Bộ kết nối Gemini, Groq, OpenAI, Claude với schema JSON chuẩn
│
├── lib/                           # Các thư viện phụ thuộc bên ngoài đóng gói offline
│   ├── pdf.min.js                 # Lõi dựng tài liệu PDF.js
│   ├── pdf.worker.min.js          # Luồng xử lý nền của PDF.js
│   ├── pdf_viewer.min.css         # CSS gốc cho lớp TextLayer của PDF.js
│   └── xlsx.min.js                # Thư viện xuất file Excel bảng tính (.xlsx)
│
├── icons/                         # Bộ biểu tượng ứng dụng chuẩn độ phân giải cao
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
│
├── windows/                       # Ứng dụng Máy Bàn Windows độc lập (Desktop App)
│   ├── package.json               # Cấu hình dự án Electron, kịch bản đóng gói .exe
│   ├── main.js                    # Luồng chính Electron (Main Process, IPC, Shortcut toàn cục)
│   ├── preload.js                 # Cầu nối an toàn IPC giữa Node.js và Renderer
│   ├── renderer.js                # Logic giao diện Windows, tra từ, luyện tập
│   ├── storage-adapter.js         # Bộ chuyển đổi lưu trữ SQLite / JSON file cục bộ
│   ├── index.html                 # Giao diện ứng dụng Windows
│   ├── styles.css                 # Giao diện phong cách Windows Fluent / Catppuccin
│   └── README.md                  # Hướng dẫn build file cài đặt VocabMaster.exe
│
└── ipad/                          # Ứng dụng Máy Tính Bảng iPad độc lập (Progressive Web App)
    ├── manifest.webmanifest       # Cấu hình PWA để cài lên màn hình chính iPad
    ├── sw.js                      # Service Worker lưu trữ đệm Offline 100%
    ├── index.html                 # Giao diện màn hình cảm ứng iPad tối ưu Retina
    ├── app.js                     # Điều khiển chạm vuốt, Flashcard xúc giác, Tra cứu
    ├── storage-adapter.js         # Bộ chuyển đổi IndexedDB / LocalStorage trên Safari iPad
    ├── styles.css                 # Thiết kế tương thích iPadOS (Safe Area, Split View)
    └── README.md                  # Hướng dẫn cài đặt vào Home Screen qua Safari
```

---

## 3. Kiến Trúc Đa Nền Tảng (Cross-Platform Architecture)

VocabMaster AI được xây dựng theo kiến trúc **Mô-đun Độc lập Phân lớp (Layered Modular Architecture)**, chia sẻ chung tri thức từ điển cốt lõi nhưng tối ưu hóa riêng cho từng môi trường:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   LÕI TỪ ĐIỂN & AI (SHARED ENGINE)                     │
│  • modern-lexicon.js   • dict-resolver.js   • cambridge-client.js     │
│  • ai-client.js        • Idiom Detector     • Context Disambiguator   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ CHROME EXTENSION │      │ WINDOWS DESKTOP  │      │     IPAD PWA     │
│ (Manifest V3)    │      │ (Electron App)   │      │ (iPadOS Safari)  │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│• Service Worker  │      │• Main Process    │      │• Service Worker  │
│• Content Script  │      │• Preload Bridge  │      │• IndexedDB       │
│• PDF Auto-Router │      │• Global Hotkeys  │      │• Touch Gestures  │
│• Side Panel UI   │      │• Local Storage   │      │• Split View Nav  │
│• Universal Hook  │      │• System Tray     │      │• Apple Standalone│
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## 4. Hệ Thống Dịch Thuật Đa Tầng Chuẩn Thuần Việt (Multi-Tier Translation Pipeline)

Để đảm bảo vừa có tốc độ phản hồi tính bằng mili-giây, vừa có độ chính xác học thuật 100%, VocabMaster AI vận hành theo mô hình phễu 4 tầng nối tiếp:

```
                      [ Người dùng bôi đen từ/câu ]
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │ TẦNG 1: Từ điển Cốt lõi Thuần Việt (modern-lexicon.js)   │
       │ - Tra cứu tức thì trong RAM (0ms)                       │
       │ - Khử sạch từ sượng trân & từ ngữ cổ xưa                │
       │ - Phân biệt nghĩa theo câu ngữ cảnh                     │
       └────────────────────────────┬────────────────────────────┘
                                    │ (Nếu chưa có trong Core)
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │ TẦNG 2: Cambridge Dictionary Online (cambridge-client)  │
       │ - Thu thập dữ liệu trực tiếp từ từ điển Cambridge       │
       │ - Trích xuất IPA UK/US, Level CEFR, Định nghĩa chuẩn    │
       │ - Lọc bỏ bản dịch thô chưa chuẩn hóa                     │
       └────────────────────────────┬────────────────────────────┘
                                    │ (Nếu mạng offline/từ hiếm)
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │ TẦNG 3: Free Dictionary API & Datamuse IPA Engine       │
       │ - Bổ sung phát âm chuẩn quốc tế và họ từ vựng           │
       │ - Định nghĩa tiếng Anh học thuật                        │
       └────────────────────────────┬────────────────────────────┘
                                    │ (Nếu là cụm từ/thành ngữ/đoạn văn)
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │ TẦNG 4: AI Model Chuyên Sâu (Gemini / Groq / OpenAI)   │
       │ - Ép kiểu JSON Schema nghiêm ngặt                       │
       │ - Prompt khử văn phong máy móc                          │
       │ - Khử triệt để lỗi sinh từ ngữ vô nghĩa                 │
       └─────────────────────────────────────────────────────────┘
```

### 4.1. Tầng 1: Từ điển Cốt lõi Thuần Việt Hiện Đại (`modern-lexicon.js`)
Kho dữ liệu chứa hàng nghìn từ vựng thông dụng nhất từ A1 đến C2, được hiệu đính thủ công bởi các chuyên gia ngôn ngữ để đảm bảo độ Thuần Việt tối đa.
- Mỗi mục từ bao gồm: Phiên âm IPA UK, Phiên âm IPA US, Từ loại (`pos`), Cấp độ CEFR (`A1-C2`), Nghĩa tiếng Việt gãy gọn, Định nghĩa song ngữ, Ví dụ minh họa và Họ từ (`word_family`).

### 4.2. Khử từ ngữ cổ xưa & sượng trân (Archaic Blacklist & Sanitizer)
Hệ thống tích hợp danh sách đen các từ ngữ "dịch máy thô lậu" và tự động thay thế bằng từ ngữ hiện đại:
- `"giám đốc trường"` $\rightarrow$ `"hiệu trưởng"`
- `"lời rao"`, `"cáo thị"`, `"lời loan báo"` $\rightarrow$ `"thông báo"`
- `"máy xe"` $\rightarrow$ `"xe hơi"`
- `"người chánh phạm"` $\rightarrow$ `"chủ mưu"`
- `"bữa ăn lớn"` $\rightarrow$ `"tiệc lớn / bữa tiệc"`
- `"thời kỳ khô hạn"` $\rightarrow$ `"hạn hán"`
- `"sự thiếu thức ăn"` $\rightarrow$ `"nạn đói"`

### 4.3. Phân biệt nghĩa theo ngữ cảnh (Contextual Disambiguation)
Hệ thống tự động đọc câu chứa từ được bôi đen và phân tích từ khóa (`keywords`) xung quanh để chọn nghĩa chính xác:
- **`bank`:**
  - Nếu câu có: `river`, `water`, `lake`, `stream`, `fishing` $\rightarrow$ Nghĩa: **"bờ sông, bờ suối"**.
  - Nếu câu có: `money`, `deposit`, `account`, `loan`, `finance` $\rightarrow$ Nghĩa: **"ngân hàng"**.
- **`novel`:**
  - Nếu câu có: `idea`, `concept`, `approach`, `solution`, `technology` $\rightarrow$ Nghĩa: **"mới lạ, độc đáo"** (Tính từ).
  - Nếu câu có: `book`, `read`, `author`, `writer`, `chapter` $\rightarrow$ Nghĩa: **"tiểu thuyết"** (Danh từ).
- **`date`:**
  - Nếu câu có: `fruit`, `sweet`, `palm`, `eat` $\rightarrow$ Nghĩa: **"quả chà là"**.
  - Nếu câu có: `romantic`, `dinner`, `boyfriend`, `love` $\rightarrow$ Nghĩa: **"cuộc hẹn hò"**.
  - Nếu câu có: `calendar`, `year`, `month`, `schedule` $\rightarrow$ Nghĩa: **"ngày tháng, thời điểm"**.

---

## 5. Cơ Chế Bôi Đen & Dịch Trong Mọi Môi Trường (Universal Selection Engine)

Đây là đột phá công nghệ giải quyết triệt để yêu cầu: **"Dịch được trong tất cả môi trường trong Chrome"**.

### 5.1. Xử lý trong `<iframe>` đa tầng (`all_frames: true`)
Trong `manifest.json`, kịch bản nội dung được khai báo:
```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content/content.js"],
    "css": ["content/content.css"],
    "run_at": "document_end",
    "all_frames": true,
    "match_about_blank": true
  }
]
```
- `"all_frames": true`: Chrome tự động tiêm `content.js` vào tất cả các khung phụ lồng nhau.
- `"match_about_blank": true`: Cho phép tiêm vào cả các iframe động được sinh ra bằng Javascript (`about:blank` hoặc `srcdoc`).

### 5.2. Đánh bại lệnh chặn sự kiện (`useCapture: true` vs `e.stopPropagation()`)
Nhiều nền tảng đề thi (như `e-learning.youpass.vn`) gắn mã chặn sao chép ở giai đoạn nổi bọt (Bubbling phase):
```javascript
// Mã của trang web nhằm vô hiệu hóa extension:
document.addEventListener('mouseup', (e) => { e.stopPropagation(); });
```
Nếu extension đăng ký sự kiện theo cách thông thường, sự kiện sẽ bị nuốt chửng trước khi đến được listener.  
**Giải pháp của VocabMaster AI:** Lắng nghe ở giai đoạn đánh chặn (Capture phase):
```javascript
// content.js: Lắng nghe ở Capture Phase (useCapture = true)
document.addEventListener('mouseup', handleMouseUp, true);
document.addEventListener('keyup', handleKeyUp, true);
document.addEventListener('touchend', handleMouseUp, true);
document.addEventListener('selectionchange', handleSelectionChange, false);
document.addEventListener('mousedown', handleMouseDown, true);
```
Khi người dùng nhả chuột, trình duyệt duyệt từ `Window` $\rightarrow$ `Document` $\rightarrow$ `HTML` $\rightarrow$ `Body` (Capture phase). VocabMaster AI bắt được sự kiện và lấy vùng chọn **trước khi trang web kịp chạy `e.stopPropagation()`**!

### 5.3. Bẻ khóa chống sao chép trên trang E-learning & LMS
Tự động tiêm thẻ `<style>` ép phục hồi thuộc tính bôi đen văn bản:
```css
html, body, p, span, div, td, th, li, a, h1, h2, h3, h4, h5, h6, article, section, main, b, i, strong, em {
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  user-select: text !important;
}
```

### 5.4. Hỗ trợ Shadow DOM & Web Components
Hàm `getDeepActiveSelection()` duyệt sâu vào cây DOM cô lập:
```javascript
let active = document.activeElement;
while (active && active.shadowRoot) {
  if (typeof active.shadowRoot.getSelection === 'function') {
    const sSel = active.shadowRoot.getSelection();
    if (sSel && sSel.rangeCount > 0 && sSel.toString().trim()) {
      selectedText = sSel.toString().trim();
      break;
    }
  }
  active = active.shadowRoot.activeElement;
}
```

### 5.5. Hỗ trợ Form Controls (`<input>`, `<textarea>`)
Trong Chromium, `window.getSelection()` trả về chuỗi rỗng khi người dùng bôi đen trong ô `<input>` hoặc `<textarea>`.  
VocabMaster kiểm tra thuộc tính `selectionStart` và `selectionEnd` của phần tử đang kích hoạt (`activeElement`) để trích xuất chính xác đoạn văn bản được chọn.

### 5.6. Thuật toán Neo Tọa độ & Chống Tràn Màn hình (Coordinate Clamping)
Đảm bảo nút ✨ ma thuật và thẻ dịch không bao giờ bị bay ra ngoài tầm nhìn hay bị che khuất trong các iframe có kích thước nhỏ:
```javascript
const minX = scrollX + 4;
const maxX = scrollX + (window.innerWidth || 300) - 44;
triggerX = Math.max(minX, Math.min(triggerX, maxX));

const minY = scrollY + 4;
const maxY = scrollY + (window.innerHeight || 400) - 44;
triggerY = Math.max(minY, Math.min(triggerY, maxY));
```

---

## 6. Hệ Thống Đọc & Dịch File PDF Toàn Diện (Dual PDF Engine)

### 6.1. Nguyên nhân Chrome chặn content script trên PDF gốc
Trình xem PDF tích hợp của Chrome chạy trên luồng plugin riêng biệt `chrome-extension://mhjfbmdgcfjnhpaeojofohoefgiehjai/`.  
Chính sách bảo mật của Google Chrome **nghiêm cấm tuyệt đối** việc tiêm Javascript của bên thứ ba vào luồng này. Do đó, nếu người dùng mở file `.pdf` trực tiếp, nút dịch sẽ **không bao giờ có thể xuất hiện**.

### 6.2. Giải pháp 1: Trình Đọc PDF Chuyên Nghiệp Tích Hợp (`pdf/reader.html`)
VocabMaster AI tích hợp một Trình đọc PDF hoàn chỉnh được xây dựng trên nền tảng **PDF.js v3.11**:
- Kết xuất 2 lớp đồng thời: Lớp hình ảnh độ nét cao (**Retina Canvas**) và Lớp văn bản trong suốt (**HTML TextLayer**).
- Vì lớp TextLayer là các thẻ `<span>` HTML chuẩn của trang extension, `content.js` hoạt động hoàn hảo 100%. Khi người dùng bôi đen chữ trên trang PDF, nút ✨ hiện lên tức thì ngay cạnh con trỏ chuột!

### 6.3. Cơ chế Tự động Điều hướng PDF (`webNavigation.onBeforeNavigate`)
Trong `service-worker.js`, tiện ích lắng nghe mọi yêu cầu điều hướng tới tài liệu PDF:
```javascript
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const url = details.url;
  if (!url || url.startsWith('chrome-extension://')) return;

  if (/\.pdf($|[?#])/i.test(url)) {
    const readerUrl = chrome.runtime.getURL(`pdf/reader.html?file=${encodeURIComponent(url)}`);
    chrome.tabs.update(details.tabId, { url: readerUrl }).catch(() => {});
  }
});
```
Người dùng chỉ cần click vào bất kỳ link PDF nào trên mạng (arXiv, Nature, giáo trình, bài tập), Chrome sẽ tự động mở tài liệu đó trong **VocabMaster PDF Reader**.

### 6.4. Vượt rào cản CORS với Background Proxy (`FETCH_PDF_BUFFER`)
Nhiều máy chủ lưu trữ tài liệu PDF chặn yêu cầu tải từ trang web khác do chính sách Cross-Origin Resource Sharing (CORS).  
Khi `pdf/reader.js` phát hiện lỗi CORS, nó tự động gửi thông điệp `FETCH_PDF_BUFFER` về `service-worker.js`. Nhờ quyền `"host_permissions": ["<all_urls>"]`, background worker có thể tải toàn bộ tệp nhị phân và gửi lại cho giao diện người dùng dưới dạng Base64 phân đoạn (Chunked Base64).

### 6.5. Giải pháp 2: Tra cứu nhanh qua Side Panel
Đối với các trường hợp đặc biệt không muốn chuyển hướng (ví dụ tệp PDF nội bộ trong giao diện hệ thống), người dùng có thể nhấp chuột phải $\rightarrow$ Chọn **"VocabMaster: Dịch & phân tích"**. Side Panel sẽ tự động mở ra bên cạnh và hiển thị đầy đủ thẻ dịch chi tiết.

---

## 7. Giao Diện & Trải Nghiệm Người Dùng (UI/UX System)

### 7.1. Bảng màu Catppuccin Mocha Dark
Giao diện tuân thủ tiêu chuẩn thẩm mỹ cao cấp với tông màu tối êm dịu, bảo vệ mắt khi đọc tài liệu trong nhiều giờ:
- **Nền chính:** `#1e1e2e` (Mocha Crust/Base)
- **Văn bản:** `#cdd6f4` (Text)
- **Điểm nhấn màu tím Pastel:** `#cba6f7` (Mauve)
- **Điểm nhấn màu xanh dương Pastel:** `#89b4fa` (Blue)
- **Màu thành công/Phát âm:** `#a6e3a1` (Green)
- **Màu cảnh báo:** `#f9e2af` (Yellow)
- **Màu lỗi:** `#f38ba8` (Red)

### 7.2. Công nghệ Vỏ Tức Thì (Instant Shell 0ms & Skeleton Shimmer)
Khi người dùng bấm vào nút ✨, thay vì chờ đợi mạng:
1. Thẻ tra từ xuất hiện **ngay lập tức trong 0ms** với từ vựng gốc, nút sao chép, nút mở Cambridge online và nút đóng.
2. Phần thân thẻ hiển thị khung chuyển động ánh sáng mờ (**Skeleton Shimmer**).
3. Ngay khi dữ liệu từ tầng lõi hoặc AI trả về, khung shimmer chuyển mượt sang thẻ nội dung đầy đủ.

### 7.3. Hiệu ứng Chuyển cảnh Đối xứng (Symmetrical Spring Animations)
- **Lúc mở ra:** Trồi nhẹ từ trên xuống kết hợp độ mờ tăng dần: `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Lúc đóng lại:** Thu nhỏ và mờ dần trong 190ms, đảm bảo cảm giác cực kỳ trơn tru và sang trọng.

### 7.4. Phát âm Audio Chuẩn Bản Xứ
- Hỗ trợ cả giọng Anh - Anh (**UK Accent**) và Anh - Mỹ (**US Accent**).
- Tự động ưu tiên phát âm từ file audio chất lượng cao của Cambridge Dictionary, tự động dự phòng sang Web Speech Synthesis API nếu offline.

---

## 8. Quản Lý Sổ Từ Vựng & Ôn Tập (Vocabulary Learning Suite)

- **Lưu từ 1-Click:** Bấm nút `+ Thêm từ` trên bất kỳ thẻ tra cứu nào để lưu từ vựng kèm câu ngữ cảnh thực tế nơi bạn đọc được từ đó.
- **Thư viện cá nhân:** Xem danh sách từ, lọc theo từ mới, đang học, hoặc đã thuộc; tìm kiếm từ khóa tức thì; chỉnh sửa nghĩa cá nhân hóa bằng nút ✏️.
- **Luyện tập Flashcard 3D:** Lật thẻ hai mặt để ghi nhớ từ vựng, ví dụ và phiên âm.
- **Trắc nghiệm Quiz:** Chọn đáp án đúng từ các định nghĩa đảo ngẫu nhiên.
- **Gõ chính tả Typing:** Luyện nghe và gõ lại đúng chính tả từng ký tự.
- **Đồng bộ đám mây:** Kết nối tự động với Google Sheets qua giao thức OAuth 2.0 hoặc xuất/nhập file Excel (.xlsx), CSV.

---

## 9. Hướng Dẫn Cài Đặt & Sử Dụng (Installation & Usage)

### 9.1. Cài đặt Chrome Extension (Khuyên dùng)
1. Mở trình duyệt Google Chrome (hoặc Edge, Brave, Cốc Cốc).
2. Truy cập thanh địa chỉ: `chrome://extensions/`.
3. Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên bên phải.
4. Bấm nút **"Tải tiện ích đã giải nén" (Load unpacked)**.
5. Chọn thư mục dự án: `d:\extension`.
6. Tiện ích **VocabMaster AI** sẽ xuất hiện trên thanh công cụ trình duyệt. Bấm vào biểu tượng ghim 📌 để cố định tiện ích.

### 9.2. Cài đặt và build bản Windows (.exe)
Ứng dụng Windows cho phép bạn tra từ và học từ vựng ngay cả khi không mở trình duyệt:
```bash
# Di chuyển vào thư mục windows
cd d:/extension/windows

# Cài đặt thư viện phụ thuộc
npm install

# Chạy thử nghiệm chế độ phát triển
npm start

# Đóng gói thành file cài đặt Windows VocabMaster-Setup.exe
npm run dist
```
File cài đặt hoàn chỉnh sẽ nằm trong thư mục `d:/extension/windows/dist/`.

### 9.3. Cài đặt bản iPad (PWA)
1. Đảm bảo iPad và máy tính cùng mạng nội bộ (hoặc tải thư mục `ipad/` lên hosting như Vercel / GitHub Pages).
2. Mở trình duyệt **Safari** trên iPad và truy cập địa chỉ của ứng dụng.
3. Bấm vào biểu tượng **Chia sẻ (Share)** hình ô vuông có mũi tên trỏ lên ở góc trên Safari.
4. Chọn **"Thêm vào Màn hình chính" (Add to Home Screen)**.
5. Biểu tượng **VocabMaster** sẽ xuất hiện trên màn hình chính iPad. Ứng dụng chạy ở chế độ toàn màn hình độc lập (Standalone), hỗ trợ chia đôi màn hình (Split View) bên cạnh sách PDF.

---

## 10. Hệ Thống Kiểm Thử & Đảm Bảo Chất Lượng (Quality Assurance & Tests)

Dự án bao gồm bộ kiểm thử tự động toàn diện được viết bằng Node.js ES Modules để đảm bảo tính ổn định tuyệt đối trước mỗi phiên bản phát hành:

```bash
# Chạy bộ kiểm thử tự động
node d:/extension/test_universal_verification.mjs
```

### Các Module Được Kiểm Thử 100%:
1. **Module 1 (PDF URL Interceptor):** Kiểm tra biểu thức chính quy nhận diện chính xác mọi đuôi `.pdf`, `.pdf?query=...`, `.pdf#hash`, tệp chữ hoa `.PDF`, đồng thời bỏ qua các trang web giả định dạng như `.pdf.html`.
2. **Module 2 (Deep Active Selection):** Mô phỏng và kiểm tra khả năng trích xuất văn bản từ:
   - Window Selection thông thường.
   - Web Components / Shadow DOM ẩn.
   - Hộp nhập liệu `<input>` và `<textarea>`.
3. **Module 3 (Viewport Clamping):** Kiểm tra tính toán tọa độ chống tràn mép màn hình và chống tràn trong iframe hẹp.
4. **Module 4 (Chunked Base64 Transfer):** Kiểm tra tính toàn vẹn nhị phân khi chuyển dữ liệu PDF qua background proxy.
5. **Module 5 (Thuần Việt & Disambiguation):** Kiểm tra từ điển cốt lõi, xác minh *principal* ra "hiệu trưởng", *announcement* ra "thông báo", khử thành công từ ngữ cổ xưa.

---

## 11. Lịch Sử Phiên Bản & Đóng Góp (Changelog)

### Phiên Bản 1.0.25 (Hiện Tại)
- **Đột phá Môi trường:** Kích hoạt `"all_frames": true` và `"match_about_blank": true` trong `manifest.json`.
- **Bẻ khóa Chống Copy:** Chuyển toàn bộ các bộ lắng nghe sự kiện (`mouseup`, `keyup`, `touchend`, `mousedown`) sang giai đoạn Đánh Chặn (**Capture Phase** - `useCapture: true`), vô hiệu hóa mọi lệnh `e.stopPropagation()` trên các trang web thi thử như `e-learning.youpass.vn`.
- **Universal Selection Engine:** Hỗ trợ trích xuất văn bản từ Web Components (Shadow DOM) và ô nhập văn bản (`<input>`, `<textarea>`).
- **Tự động Điều hướng PDF:** Tích hợp bộ lắng nghe `chrome.webNavigation.onBeforeNavigate` tự động mở các liên kết PDF trực tuyến trong VocabMaster PDF Reader.
- **Vượt rào cản CORS PDF:** Bổ sung Background Proxy `FETCH_PDF_BUFFER` trong `service-worker.js`.
- **Tùy biến Môi trường:** Thêm cụm thiết lập bật/tắt tự động mở PDF và mở khóa bôi đen trong trang Cài đặt (`settings/settings.html`).
- **Tài liệu Toàn diện:** Xuất bản tài liệu kỹ thuật hoàn chỉnh `PROJECT_DOCUMENTATION.md`.

---
*Tài liệu được biên soạn và bảo trì bởi Antigravity AI Engineer. Mọi thắc mắc hoặc yêu cầu mở rộng tính năng vui lòng cập nhật trong phiên làm việc tiếp theo.*
