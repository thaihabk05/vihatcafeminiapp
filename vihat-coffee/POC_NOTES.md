# VIHAT MiniApp Builder — POC #1 (F&B Coffee)

Forked từ [zaui-coffee](https://github.com/Zalo-MiniApp/zaui-coffee) (template chính thức của Zalo).

## Những thay đổi đã thực hiện

| File | Thay đổi |
|---|---|
| `app-config.json` | Title → "OmiCafé by VIHAT", primary color → `#E94E1B` (cam VIHAT) |
| `index.html` | Title + theme-color đổi sang VIHAT |
| `package.json` | name, description rebrand |
| `zmp-template.json` | template name |
| `mock/products.json` | 11 sản phẩm rename + description tiếng Việt theo brand OmiCafé |
| `src/pages/index/inquiry.tsx` | Placeholder ô search |
| `src/pages/profile.tsx` | Banner thành viên + entry "Gọi tổng đài OmiCall" |
| `vite.config.mts` | Bypass `zmp-vite-plugin` để preview local (xem `DEPLOY.md` để khôi phục cho production) |

## Chạy thử local

```bash
cd vihat-coffee
npm install        # đã chạy
npx vite           # → http://127.0.0.1:3000
```

Hoặc qua Claude Preview (đã setup `.claude/launch.json`):
- Server name: `vihat-coffee-dev`

## Đã verify

- [x] Vite dev server `200 OK`
- [x] Production build thành công (644 modules, 800KB gzipped 249KB)
- [x] Render đúng trên viewport mobile 375×812 (chuẩn iPhone)
- [x] 4 tab navigation: Trang chủ · Thông báo · Giỏ hàng · Cá nhân
- [x] Trang chủ: banner, 7 categories, recommend section, product list
- [x] Giỏ hàng: form chọn cửa hàng, thời gian, người nhận, ghi chú, footer thanh toán
- [x] Profile: banner thành viên OmiCafé · VIHAT, menu OmiCall integration placeholder
- [x] Tiếng Việt + tiền tệ `đ` đúng format

## Chưa làm (cần cho production)

Xem `DEPLOY.md` mục 8.

## Bước tiếp theo (Phase 2 của roadmap)

1. **Tách app-config thành schema cho Builder Studio** — mỗi field thành 1 form input
2. **Backend API mock** — trả menu/products theo App ID
3. **Trang Builder Studio admin** — drag-drop block, preview iframe trỏ về mini app shell
4. **Tách F&B-specific code** thành module → cho phép swap sang Spa / Retail
