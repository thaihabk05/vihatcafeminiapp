# Deploy lên Zalo Mini App thật

POC hiện đang chạy bằng **Vite trực tiếp** để preview nhanh. Để đẩy lên Zalo thật cho khách quét QR và mở trong app Zalo, làm theo các bước dưới đây.

## 1. Tạo Mini App ID trên Zalo

1. Truy cập <https://mini.zalo.me> và đăng nhập bằng Zalo của doanh nghiệp.
2. **Tạo Mini App mới** → chọn loại "Mini App", nhập tên (vd: *OmiCafé by VIHAT*), upload logo.
3. Sau khi tạo, copy **App ID** (dãy số ~16 chữ số).
4. Vào tab **Thông tin** → bind **Official Account** (OA) của VIHAT — bắt buộc để gửi ZNS, lấy user info.

## 2. Cài Zalo Mini App Studio (CLI)

```bash
npm install -g zmp-cli
zmp -v        # verify
zmp login     # đăng nhập bằng Zalo developer account
```

Hoặc cài VSCode Extension *"Zalo Mini App"* để có GUI Run/Deploy.

## 3. Khôi phục cấu hình production

POC đang dùng `vite.config.mts` local. Trước khi deploy:

```bash
# Khôi phục plugin chính thức (đã có sẵn trong package.json)
git checkout vite.config.mts   # nếu đã commit bản gốc
# Hoặc sửa lại để dùng zmp-vite-plugin:
```

Nội dung gốc:

```ts
import { defineConfig } from "vite";
import ZaloMiniApp from "zmp-vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default () => defineConfig({
  root: "./src",
  base: "",
  plugins: [tsconfigPaths(), react(), ZaloMiniApp()],
});
```

## 4. Cập nhật App ID

Mở `zmp-cli.json` và thêm field `appId`:

```json
{
  "appId": "1234567890123456",
  "name": "OmiCafé by VIHAT",
  ...
}
```

## 5. Chạy thử trong môi trường Zalo

```bash
npm run start    # = zmp start
```

CLI sẽ in QR code → mở Zalo trên điện thoại → quét → app chạy ngay trong WebView Zalo. HMR vẫn hoạt động.

## 6. Build & Deploy

```bash
npm run deploy   # = zmp deploy
```

Lệnh này sẽ:
1. `vite build` → tạo `dist/`
2. Đóng gói `.zip`
3. Upload lên mini.zalo.me dưới phiên bản mới
4. Mở browser cho bạn submit review.

## 7. Submit Zalo review

Vào <https://mini.zalo.me> → Mini App → tab **Phiên bản**:
1. Chọn version vừa upload → **Yêu cầu kiểm duyệt**.
2. Điền: tài khoản test, mô tả tính năng, video demo nếu có.
3. Thời gian xét duyệt: **1–3 ngày làm việc**.
4. Sau khi pass → **Phát hành** → mini app live.

## 8. Tích hợp cần thêm trước khi go-live thật

| Mục | Trạng thái POC | Cần làm |
|---|---|---|
| Auth user Zalo | mock (state.ts) | gọi `getUserInfo` từ `zmp-sdk` |
| Lấy SĐT | mock | gọi `getPhoneNumber` (cần OA approval) |
| Thanh toán | mock checkout result | tích hợp **Checkout SDK** + merchant ID ZaloPay |
| Đặt bàn / đơn hàng | mock | backend API + webhook OA |
| Gửi ZNS xác nhận đơn | chưa có | tạo template ZNS → duyệt → call API từ backend |
| Tổng đài | placeholder 1900xxxx | tích hợp **OmiCall SDK** (sản phẩm VIHAT) |
| Vị trí cửa hàng | mock | `getLocation` + Map của Zalo |

## 9. Lưu ý vận hành

- **OA bind 1-1**: 1 Mini App chỉ bind được 1 OA. Nếu VIHAT muốn multi-brand → mỗi brand cần 1 mini app riêng (Builder của chúng ta nên tách tenant theo App ID).
- **ZNS template phải duyệt trước** — không gửi free text. Chuẩn bị 3 template MVP: xác nhận đơn, nhắc lịch đặt bàn, voucher sinh nhật.
- **Server-Driven UI**: khi build Builder thật, để mọi nội dung (menu, giá, banner) đọc từ API → đổi nội dung không cần resubmit Zalo review. Chỉ resubmit khi đổi flow / quyền.
- **Pricing**: ZaloPay phí ~1.5–2.2%, ZNS ~250–500đ/tin. Tính vào model SaaS của Builder.
