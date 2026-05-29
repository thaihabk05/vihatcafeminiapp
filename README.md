# VIHAT MiniApp Builder

Nền tảng tạo **Zalo Mini App đa ngành** không cần code, kiến trúc **Server-Driven UI** — 1 codebase chạy được mọi quán/cửa hàng.

```
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│   Builder Studio          Builder API           Mini App Shell    │
│   (admin UI cho           (Express,             (Zalo Mini App,   │
│    chủ quán)              multi-tenant store)   1 codebase)       │
│                                                                   │
│   :5173  ─────────────►   :4000   ◄────────────  :3000            │
│   React + Tailwind        REST JSON              React + zmp-ui   │
│                           data/<appId>.json      ?appId=<tenant>  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Các thư mục

| Thư mục | Vai trò | Cổng |
|---|---|---|
| `builder-api/` | Express server lưu config từng tenant ra file JSON, GET/PUT theo section | 4000 |
| `vihat-coffee/` | **Mini App Shell** — codebase Zalo Mini App fork từ `zaui-coffee`, đọc config qua `?appId=` | 3000 |
| `builder-studio/` | Admin web app cho chủ quán: sidebar tenant + form editor + live preview iframe | 5173 |

## Chạy thử (3 server)

```bash
# Terminal 1 — API
cd builder-api && npm install && node server.js

# Terminal 2 — Mini App Shell
cd vihat-coffee && npm install && npx vite --port 3000 --host 127.0.0.1

# Terminal 3 — Builder Studio
cd builder-studio && npm install && npm run dev
```

Mở: <http://127.0.0.1:5173>

## Demo tenants có sẵn

| App ID | Tên | Ngành | Primary color | URL preview |
|---|---|---|---|---|
| `omicafe` | OmiCafé by VIHAT | F&B Coffee | `#E94E1B` cam | <http://127.0.0.1:3000/?appId=omicafe> |
| `saigon-bistro` | Sài Gòn Bistro | F&B Restaurant | `#1B7F5A` xanh | <http://127.0.0.1:3000/?appId=saigon-bistro> |

Cả hai dùng **chung 1 codebase Mini App Shell** — chỉ khác `?appId`.

## Server-Driven UI hoạt động ra sao

1. Shell boot → đọc `?appId=<id>` từ URL.
2. `fetch(API_BASE + "/api/apps/<id>/config")` → nhận về JSON `{app, template, banners, categories, products}`.
3. Merge config vào `window.APP_CONFIG`, set `document.title`, áp `--zmp-primary-color` CSS variable.
4. Mount React. Recoil selectors (`categoriesState`, `bannersState`, `productsState`) đọc từ `window.APP_CONFIG._serverData`.
5. Khi Studio PUT lên API → chủ quán bấm "Reload" hoặc save → iframe `key` bump → shell fetch lại config mới → render UI mới.

**Lợi ích then chốt**: đổi menu / banner / giá → KHÔNG cần submit Zalo review lại. Chỉ resubmit khi đổi flow / quyền truy cập.

## Builder API — endpoints

```
GET  /api/health
GET  /api/tenants                       # list tenant
GET  /api/apps/:appId/config            # full config (Shell dùng)
GET  /api/apps/:appId/{app|template|banners|categories|products}
PUT  /api/apps/:appId/{section}         # Studio save (full replace section)
```

Tenants lưu ở `builder-api/data/<appId>.json`. Mỗi save tự cập nhật `updatedAt`.

## Builder Studio — UI

3 cột:

1. **Sidebar**: dropdown chọn tenant, 4 tab editor (Brand & Theme · Banner · Danh mục · Sản phẩm).
2. **Middle**: form editor cho tab hiện tại.
3. **Right**: phone frame iframe trỏ về Mini App Shell với `?appId=<current>`. Khi save → key iframe bump → reload.

Tất cả input gọi `PUT /api/apps/:appId/<section>` → đổi file JSON → iframe reload → user thấy đổi ngay.

## Đã verify trong session

- ✅ Builder API serve 2 tenant từ file system, response đúng format
- ✅ Mini App Shell render OmiCafé (cam, 7 danh mục, 11 sản phẩm)
- ✅ Đổi `?appId=saigon-bistro` → cùng codebase render Sài Gòn Bistro (xanh, 5 danh mục, 8 sản phẩm)
- ✅ Builder Studio chạy port 5173, sidebar/form/preview hoạt động
- ✅ End-to-end save: đổi title trong Studio → file JSON update → iframe reload → title mới hiển thị
- ✅ Đổi primary color cũng propagate qua API
- ✅ Tab Products hiển thị grid với edit/delete

## Bước tiếp theo

| Phase | Nội dung |
|---|---|
| **Phase 2.1** | Drag-drop sort cho danh mục/sản phẩm (react-dnd) |
| **Phase 2.2** | Upload ảnh thẳng vào Studio (S3 / Zalo CDN) |
| **Phase 2.3** | Page builder cho banner: block, text overlay, CTA |
| **Phase 3** | Auth chủ quán (NextAuth), per-tenant ACL |
| **Phase 4** | Industry templates: Spa, Retail, Giáo dục, Y tế |
| **Phase 5** | Tích hợp ZaloPay Checkout SDK + ZNS + OmiCall vào Shell |
| **Phase 6** | Multi-region deploy: 1 Builder, N mini-app-id đăng ký riêng với Zalo |

## Triển khai lên Zalo thật

Xem `vihat-coffee/DEPLOY.md` — hướng dẫn 8 bước từ đăng ký App ID, bind OA, `zmp-cli` deploy, đến submit review.

Lưu ý kiến trúc khi go-production: backend Mini App Shell phải HTTPS public (không phải `127.0.0.1`). Cấu hình `VITE_API_BASE` qua env trước khi `npm run build`.
