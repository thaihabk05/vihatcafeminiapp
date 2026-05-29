# Production deploy — ViHAT Cafe lên Zalo Mini App Store

Hướng dẫn end-to-end: deploy Builder API lên Railway, build Mini App Shell trỏ về domain thật, đẩy lên Zalo, submit review.

**Chuẩn bị**:
- Tài khoản GitHub (free)
- Tài khoản Railway (free $5 credit/tháng — đủ cho POC)
- Đã `zmp login` thành công (Access Token còn hạn 24h)
- App ID Zalo: `1352472476106621006`

---

## Bước 1 — Push code lên GitHub

GitHub là cầu nối để Railway tự động deploy.

```bash
cd /Users/dinhthaiha/Coding/MiniApp

# Khởi tạo git nếu chưa có
git init
git add .
git commit -m "feat: VIHAT MiniApp Builder POC + ViHAT Cafe tenant"

# Tạo repo trên github.com (chọn Private), copy URL
git remote add origin https://github.com/<your-username>/vihat-miniapp.git
git branch -M main
git push -u origin main
```

> Nếu chưa cài `gh` CLI, có thể tạo repo qua web rồi push.

---

## Bước 2 — Deploy Builder API lên Railway

### 2.1. Tạo project Railway

1. Vào <https://railway.app> → đăng nhập bằng GitHub
2. Bấm **"New Project"** → **"Deploy from GitHub repo"**
3. Chọn repo `vihat-miniapp` vừa push
4. Railway sẽ phát hiện nhiều thư mục → bấm **"Configure"** → chọn **Root Directory** = `builder-api`
5. Railway tự đọc `Dockerfile` và build (~2-3 phút)

### 2.2. Cấp domain HTTPS công cộng

1. Vào tab **"Settings"** của service → mục **"Networking"**
2. Bấm **"Generate Domain"**
3. Railway cấp URL dạng: `vihat-builder-api-production.up.railway.app`
4. Test: mở `https://vihat-builder-api-production.up.railway.app/api/health` → phải trả về `{ok: true, tenants: 2, ...}`

### 2.3. Set environment variables

Tab **"Variables"** → thêm:

| Key | Value | Ghi chú |
|---|---|---|
| `PORT` | `4000` | Hoặc để trống — Railway tự inject |
| `ALLOWED_ORIGINS` | `https://h5.zdn.vn,https://zalo.me` | Khoá CORS chỉ cho Zalo |
| `NODE_ENV` | `production` | |
| `DATA_DIR` | `/app/data` | Để dùng với volume |

### 2.4. (Tuỳ chọn) Persistent volume

Mặc định Railway container ephemeral — restart sẽ mất data Studio đã sửa.

Để giữ data:
1. Tab **"Settings"** → **"Volumes"** → **"+ New Volume"**
2. Mount path: `/app/data`
3. Size: 1 GB (đủ cho hàng nghìn tenant)
4. Lần đầu boot, server tự copy seed từ `/app/data-seed/` vào.

> POC bỏ qua bước này cũng được — data sẽ reset về seed mỗi lần redeploy, không sao cho phase test.

### 2.5. Verify

```bash
curl https://vihat-builder-api-production.up.railway.app/api/health
curl https://vihat-builder-api-production.up.railway.app/api/tenants
curl https://vihat-builder-api-production.up.railway.app/api/apps/vihat-cafe/config | head -c 200
```

Nếu cả 3 trả 200 → API live thành công. Copy URL HTTPS để dùng ở bước 3.

---

## Bước 3 — Cấu hình Mini App Shell

### 3.1. Tạo `.env.production`

```bash
cd vihat-coffee

cat > .env.production << 'EOF'
VITE_API_BASE=https://vihat-builder-api-production.up.railway.app
VITE_DEFAULT_APP_ID=vihat-cafe
EOF
```

Thay URL bằng domain Railway thật của anh.

### 3.2. Verify API_BASE đúng

```bash
grep VITE_API_BASE .env.production
```

### 3.3. Test build production local

```bash
ZMP=1 npx vite build
```

Nếu OK → `dist/` được tạo ra với asset đã inline `VITE_API_BASE` mới.

> Lưu ý: env `ZMP=1` để vite.config bật `zmp-vite-plugin` (cần cho `zmp deploy`).

---

## Bước 4 — Bind OA + Test trong Zalo

### 4.1. Bind OA vào Mini App

1. Vào <https://mini.zalo.me> → chọn **ViHAT Cafe** (App ID `1352472476106621006`)
2. Tab **"Thông tin"** → mục **"Liên kết OA"**
3. Chọn OA của VIHAT đã verify
4. Lưu — **OA này không đổi được sau khi go-live**, cân nhắc kỹ

### 4.2. Test bằng `zmp start`

```bash
cd vihat-coffee
npx zmp start
```

CLI in QR code. Mở Zalo trên điện thoại → góc trên phải → **Quét QR** → mini app chạy thẳng trong Zalo (chế độ dev, không cần publish).

Check:
- ✅ Logo SVG ViHAT Cafe hiển thị
- ✅ 3 banner load đúng (từ Railway domain)
- ✅ 7 danh mục + 11 sản phẩm có
- ✅ Click vào cart, profile — chạy bình thường
- ✅ Mạng offline → vẫn có loading state (không crash)

### 4.3. Quay video demo (bắt buộc khi submit)

Trên điện thoại, **bật quay màn hình**, demo:
1. Mở mini app từ Zalo
2. Lướt qua banner
3. Bấm 1 danh mục → mở category page
4. Bấm 1 sản phẩm → xem detail
5. Add to cart → mở cart → chọn store/time/người nhận
6. Mở profile → các menu

Video 60-90 giây. Lưu MP4 < 50MB.

---

## Bước 5 — Deploy lên Zalo

### 5.1. Build + Upload

```bash
cd vihat-coffee
npx zmp deploy
```

zmp-cli sẽ:
1. `vite build --mode production` (đọc `.env.production`)
2. Đóng gói `dist/` thành `.zip`
3. Upload lên `mini.zalo.me` qua Access Token đã login
4. Tạo phiên bản mới (vd: `v0.1.0-build-1`)

Nếu thành công, terminal in:
```
✔ Deployed version v0.1.0-build-1 to ViHAT Cafe (1352472476106621006)
```

### 5.2. Thêm Tester nội bộ

1. Vào trang quản lý ViHAT Cafe → tab **"Phiên bản"**
2. Chọn version vừa deploy → mục **"Tester"**
3. **Add Zalo ID** của anh + 2-3 đồng nghiệp
4. Họ quét QR test → trải nghiệm bản dev trước khi submit

### 5.3. Submit kiểm duyệt

Trang quản lý → tab **"Phiên bản"** → version test OK → **"Yêu cầu kiểm duyệt"**:

| Field | Điền |
|---|---|
| **Tài khoản test** | Zalo + SĐT của anh hoặc 1 account demo |
| **Mô tả version** | "Phiên bản đầu tiên — Mini App đặt cafe + đặt bàn ViHAT" |
| **Lý do xin quyền** | location: gợi ý cửa hàng gần · phone: liên hệ giao hàng · user info: hiển thị tên trong profile |
| **Video demo** | Upload file MP4 ở bước 4.3 |
| **Categories** | F&B → Cà phê / Đồ uống |
| **Logo** | 512×512 PNG (convert từ SVG, em sẽ làm khi anh sẵn sàng) |

Bấm **"Gửi yêu cầu"**.

### 5.4. Chờ duyệt 1-3 ngày

Trong thời gian này:
- Reviewer Zalo sẽ download app, mở trên emulator/máy thật, test các flow
- Nếu **Approve** → có thể bấm **"Phát hành"** ngay → mini app live trên store
- Nếu **Reject** → đọc lý do trong tab **"Lịch sử kiểm duyệt"**, fix, redeploy

---

## Bước 6 — Sau khi live

### 6.1. Deep link

Mini app ViHAT Cafe có URL công cộng:
```
https://zalo.me/s/1352472476106621006
```
Share được mọi nơi — Facebook, website, in QR vào menu giấy.

### 6.2. Update không cần resubmit (sức mạnh Server-Driven UI)

Vào **Builder Studio** (anh có thể deploy luôn lên Railway/Vercel nếu muốn):
- Đổi menu / banner / giá → save → API trả config mới → mini app tự fetch → khách thấy đổi ngay
- **Không cần** `zmp deploy` lại
- **Không cần** chờ Zalo review lại

Chỉ resubmit khi đổi:
- Flow điều hướng (thêm trang mới)
- Quyền truy cập (xin thêm location/payment)
- Logic checkout / tích hợp mới

### 6.3. Theo dõi

- Tab **"Thống kê"** trên mini.zalo.me — DAU, retention, top action
- Tab **"Bình luận"** — feedback của khách 5 sao
- Log Railway — `railway logs` để xem API call

---

## Troubleshooting

### `zmp deploy` báo "appId not found"
→ Check `zmp-cli.json` field `appId` = `1352472476106621006`

### Mini app blank khi mở trong Zalo
→ Mở DevTools trên `chrome://inspect/devices` khi nối điện thoại USB
→ Kiểm tra: `VITE_API_BASE` đã đúng HTTPS chưa
→ Kiểm tra: API có response từ phone không (`curl` từ máy khác)

### Banner/logo không load
→ SVG URL trong tenant data đang là `http://127.0.0.1:4000/assets/...`
→ Vào Studio (deployed) → edit tenant → đổi sang `https://<railway-domain>/assets/...`
→ Hoặc upload lên Cloudinary/Zalo CDN cho stable

### CORS error
→ `ALLOWED_ORIGINS` env trên Railway thiếu domain Zalo
→ Thêm `https://h5.zdn.vn,https://zalo.me`

### Reject vì "thiếu chính sách bảo mật"
→ Thêm trang Privacy Policy (link tới website VIHAT)
→ Thêm link trong profile page

---

## Checklist cuối cùng trước Submit

```
[Hosting]
☐ Railway deploy thành công, /api/health trả 200
☐ Domain HTTPS hoạt động
☐ CORS lock về domain Zalo
☐ (Tuỳ chọn) Volume mounted để persist

[Code]
☐ .env.production có VITE_API_BASE đúng domain Railway
☐ zmp-cli.json có appId = 1352472476106621006
☐ npx zmp start chạy được trong Zalo thật

[Tài liệu]
☐ Logo 512×512 PNG sẵn
☐ Video demo 60-90s sẵn
☐ Privacy Policy URL có
☐ Mô tả lý do xin quyền sẵn

[OA]
☐ OA verified, bind vào Mini App

[Submit]
☐ npx zmp deploy thành công
☐ Tester test pass
☐ Submit kiểm duyệt
```

---

## Chi phí ước tính tháng đầu

| Mục | Giá |
|---|---|
| Railway free tier | $0 ($5 credit) |
| Railway sau khi vượt credit | ~$5-10/tháng |
| GitHub repo (private) | Free |
| Zalo Developer | Free |
| ZNS gửi (nếu dùng) | ~250-500đ/tin |
| Tổng month 1 | **~$0-10 / 0-250k VND** |

Production cho quán thật bắt đầu chạy doanh thu thì hosting nên upgrade $20-50/tháng (Railway Pro hoặc Render Standard).
