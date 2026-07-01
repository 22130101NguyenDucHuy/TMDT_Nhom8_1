# Use Case LoopBook

Tài liệu này được lập theo source hiện tại của project LoopBook, tham khảo bố cục từ sơ đồ draw.io người dùng gửi.

## Actor

- Khách vãng lai: xem trang chủ, tìm kiếm/lọc tài liệu, xem chi tiết, đăng ký, đăng nhập, đặt lại mật khẩu.
- Người dùng: tài khoản đã đăng nhập, có hồ sơ, ví, yêu thích, tin nhắn, lịch sử giao dịch và yêu cầu tìm sách.
- Người mua: kế thừa người dùng, đặt mua tài liệu, chọn giao nhận, chọn thanh toán, xác nhận nhận sách, khiếu nại, đánh giá người bán.
- Người bán: kế thừa người dùng, cần xác thực sinh viên trước khi đăng bán, quản lý bài đăng, chào hàng theo yêu cầu tìm sách, mua gói đẩy tin.
- Quản trị viên: quản lý toàn bộ user, xác thực sinh viên, tin đăng, danh mục, giao dịch, rút tiền, premium, tranh chấp, báo cáo và cấu hình.
- Điều phối viên: nhóm quyền quản trị hạn chế theo guard hiện tại, dùng các màn duyệt/xử lý chính.
- PayOS: cổng thanh toán ngoài cho nạp ví và checkout VietQR.
- Supabase Auth: hệ thống ngoài phục vụ đăng ký, đăng nhập, OAuth và reset mật khẩu.

## Nhóm Use Case Theo Project

### Tài khoản và xác thực

- Đăng ký tài khoản bằng email `.edu.vn`.
- Gửi ảnh thẻ sinh viên khi đăng ký hoặc khi cần xác thực lại.
- Đăng nhập email/mật khẩu hoặc Google/Microsoft.
- Quên mật khẩu và đặt lại mật khẩu.
- Quản lý hồ sơ cá nhân.

### Khám phá tài liệu

- Xem trang chủ.
- Khám phá danh sách tài liệu.
- Tìm kiếm, lọc theo danh mục/trường/giá và sắp xếp.
- Xem chi tiết tài liệu.
- Lưu hoặc bỏ yêu thích.

### Đăng bán

- Người bán gửi xác thực sinh viên trước khi đăng bán.
- Đăng bán tài liệu với ảnh, tiêu đề, danh mục, tình trạng, giá, mô tả, trường, hình thức giao dịch.
- Tra ISBN qua Google Books để tự điền thông tin sách.
- Lưu nháp hoặc gửi bài chờ duyệt.
- Quản lý, sửa, theo dõi trạng thái duyệt bài đăng.
- Chào hàng cho yêu cầu tìm sách.

### Mua bán và giao dịch

- Liên hệ người bán qua tin nhắn.
- Đề xuất hoặc chấp nhận giá qua hội thoại.
- Đặt mua tài liệu.
- Chọn hình thức giao nhận: gặp trực tiếp, giao nhanh, giao tiết kiệm.
- Chọn thanh toán: ví LoopBook, PayOS/VietQR, COD hoặc chuyển khoản ngoài.
- Với ví/PayOS: tạo trạng thái ký quỹ trước khi hoàn tất.
- Người mua xác nhận đã nhận sách để giải ngân cho người bán.
- Hủy giao dịch, gửi khiếu nại, đánh giá người bán.
- Xem lịch sử giao dịch.

### Ví tiền

- Xem số dư ví và lịch sử ví.
- Nạp ví qua PayOS.
- Gửi yêu cầu rút tiền về ngân hàng.
- Admin duyệt hoặc từ chối yêu cầu rút tiền.

### Quản trị

- Xem dashboard.
- Quản lý người dùng: kích hoạt, khóa, đổi vai trò.
- Duyệt xác thực sinh viên.
- Duyệt, từ chối, gỡ, khôi phục tin đăng.
- Quản lý danh mục.
- Theo dõi giao dịch.
- Quản lý rút tiền.
- Quản lý gói premium/đẩy tin.
- Xử lý tranh chấp và báo cáo vi phạm.
- Cấu hình hệ thống.

## File Sơ Đồ

Sơ đồ PlantUML nằm ở `docs/usecase-loopbook.puml`.
