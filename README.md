# Community Management System

ระบบจัดการชุมชนครบวงจร พัฒนาด้วย Next.js, Prisma และ PostgreSQL

## คุณสมบัติหลัก

### 🏢 การจัดการอาคารและห้อง
- จัดการข้อมูลอาคาร
- จัดการห้อง/ยูนิต
- ติดตามสถานะการเข้าพัก

### 👥 การจัดการผู้ใช้
- ระบบสมาชิก (ผู้อยู่อาศัย, ผู้ดูแล, เจ้าหน้าที่)
- การจัดการข้อมูลผู้อยู่อาศัย
- ระบบสิทธิ์การเข้าถึง

### 🛒 ระบบ Marketplace
- ขายสินค้าออนไลน์
- จัดการหมวดหมู่สินค้า
- ระบบสั่งซื้อและชำระเงิน

### 🔧 การจัดการคำขอบริการ
- แจ้งซ่อม/บำรุงรักษา
- ติดตามสถานะงาน
- ประเมินความพึงพอใจ

### 📢 ระบบสื่อสาร
- ประกาศข่าวสาร
- โพสต์ชุมชน
- ระบบแจ้งเตือน

### 🏊‍♂️ การจองสิ่งอำนวยความสะดวก
- จองห้องประชุม
- จองสระว่ายน้ำ
- จองห้องฟิตเนส

### 💰 การจัดการการเงิน
- ค่าส่วนกลางรายเดือน
- ติดตามการชำระเงิน
- ออกใบเสร็จ

## เทคโนโลยีที่ใช้

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Ready for implementation
- **Deployment**: Vercel-ready

## การติดตั้ง

1. Clone repository
```bash
git clone <repository-url>
cd condo
```

2. ติดตั้ง dependencies
```bash
npm install
```

3. ตั้งค่า environment variables
```bash
# สร้างไฟล์ .env และเพิ่ม
DATABASE_URL="your-postgresql-connection-string"
```

4. รัน database migrations
```bash
npx prisma migrate dev
```

5. เพิ่มข้อมูลตัวอย่าง
```bash
npm run db:seed
```

6. เริ่มต้น development server
```bash
npm run dev
```

## API Endpoints

### 🔐 Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/register` - สมัครสมาชิก
- `POST /api/auth/refresh-token` - รีเฟรช token
- `POST /api/auth/forgot-password` - ขอรีเซ็ตรหัสผ่าน
- `POST /api/auth/reset-password` - รีเซ็ตรหัสผ่านด้วย OTP
- `POST /api/auth/verify-otp` - ยืนยัน OTP
- `POST /api/auth/logout` - ออกจากระบบ

### 👥 User Management
- `GET /api/users/profile` - ดูโปรไฟล์ผู้ใช้
- `PUT /api/users/profile` - แก้ไขโปรไฟล์
- `PUT /api/users/change-password` - เปลี่ยนรหัสผ่าน
- `GET /api/users` - ดึงรายการผู้ใช้ (Admin)
- `POST /api/users` - สร้างผู้ใช้ใหม่ (Admin)
- `GET /api/users/{id}` - ดูข้อมูลผู้ใช้ (Admin)
- `PUT /api/users/{id}` - แก้ไขผู้ใช้ (Admin)
- `DELETE /api/users/{id}` - ลบผู้ใช้ (Admin)

### 🏢 Building & Property Management
- `GET /api/buildings` - ดึงรายการอาคาร
- `POST /api/buildings` - สร้างอาคารใหม่ (Admin)
- `GET /api/buildings/{id}` - ดูข้อมูลอาคาร
- `PUT /api/buildings/{id}` - แก้ไขอาคาร (Admin)
- `DELETE /api/buildings/{id}` - ลบอาคาร (Admin)
- `GET /api/buildings/{building_id}/units` - ดูห้องในอาคาร
- `POST /api/buildings/{building_id}/units` - สร้างห้องใหม่ (Admin)

### 🛒 E-commerce (Marketplace)
- `GET /api/products/categories` - ดึงหมวดหมู่สินค้า
- `POST /api/products/categories` - สร้างหมวดหมู่ (Admin)
- `GET /api/products` - ดึงรายการสินค้า (มี filter)
- `POST /api/products` - สร้างสินค้าใหม่ (Admin)
- `GET /api/cart` - ดูตะกร้าสินค้า
- `POST /api/cart/items` - เพิ่มสินค้าในตะกร้า
- `PUT /api/cart/items/{id}` - แก้ไขจำนวนสินค้า
- `DELETE /api/cart/items/{id}` - ลบสินค้าจากตะกร้า
- `DELETE /api/cart` - ล้างตะกร้า
- `GET /api/orders` - ดูประวัติการสั่งซื้อ
- `POST /api/orders` - สร้างคำสั่งซื้อใหม่

### 🔧 Service Management
- `GET /api/services/categories` - ดึงหมวดหมู่บริการ
- `POST /api/services/categories` - สร้างหมวดหมู่บริการ (Admin)
- `GET /api/service-requests` - ดูคำขอบริการ
- `POST /api/service-requests` - สร้างคำขอบริการใหม่

### 📢 Communication
- `GET /api/announcements` - ดูประกาศ
- `POST /api/announcements` - สร้างประกาศ (Admin)
- `POST /api/announcements/{id}/read` - ทำเครื่องหมายอ่านแล้ว
- `GET /api/announcements/unread-count` - นับประกาศที่ยังไม่อ่าน

### 🔔 Notifications
- `GET /api/notifications` - ดูการแจ้งเตือน
- `PUT /api/notifications/{id}/read` - ทำเครื่องหมายอ่านแล้ว
- `PUT /api/notifications/read-all` - ทำเครื่องหมายอ่านทั้งหมด
- `GET /api/notifications/unread-count` - นับการแจ้งเตือนที่ยังไม่อ่าน
- `DELETE /api/notifications` - ล้างการแจ้งเตือนทั้งหมด

### 🔍 Search
- `GET /api/search` - ค้นหาทั่วไป (สินค้า, ประกาศ, คำขอบริการ)

### ⚙️ System
- `GET /api/system/health` - ตรวจสอบสถานะระบบ
- `GET /api/system/info` - ข้อมูลระบบ
- `GET /api/settings/public` - การตั้งค่าสาธารณะ
- `GET /api/docs` - เอกสาร API

## Database Schema

ระบบใช้ Prisma ORM พร้อม PostgreSQL โดยมี tables หลัก:

- **users** - ข้อมูลผู้ใช้
- **buildings** - ข้อมูลอาคาร
- **units** - ข้อมูลห้อง/ยูนิต
- **residents** - ข้อมูลผู้อยู่อาศัย
- **products** - ข้อมูลสินค้า
- **orders** - ข้อมูลคำสั่งซื้อ
- **service_requests** - คำขอบริการ
- **announcements** - ประกาศ
- **facilities** - สิ่งอำนวยความสะดวก
- **monthly_fees** - ค่าส่วนกลาง
- **notifications** - การแจ้งเตือน

## Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Database
npm run db:seed      # เพิ่มข้อมูลตัวอย่าง
npm run db:reset     # รีเซ็ตและเพิ่มข้อมูลใหม่

# Prisma
npx prisma studio    # เปิด Prisma Studio
npx prisma generate  # สร้าง Prisma Client
npx prisma migrate dev # รัน migrations
```

## การใช้งาน API

### Authentication
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@condo.com", "password": "password123"}'

# Use token in subsequent requests
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### ตัวอย่างการใช้งาน
```javascript
// Login และรับ token
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@condo.com',
    password: 'password123'
  })
})

const { data } = await loginResponse.json()
const token = data.tokens.access_token

// ใช้ token ในการเรียก API อื่นๆ
const profileResponse = await fetch('/api/users/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "errors": null,
  "meta": {
    "timestamp": "2024-02-01T10:30:00Z",
    "request_id": "req_123456789"
  }
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": {
    "email": ["Email is required"],
    "password": ["Password must be at least 8 characters"]
  },
  "meta": {
    "timestamp": "2024-02-01T10:30:00Z",
    "request_id": "req_123456789"
  }
}
```

## การพัฒนาต่อ

1. ✅ ระบบ Authentication (JWT)
2. เพิ่ม File Upload สำหรับรูปภาพ
3. เพิ่มระบบ Real-time notifications (WebSocket)
4. เพิ่ม Dashboard analytics
5. เพิ่มระบบ Payment Gateway
6. เพิ่ม Mobile App (React Native)
7. เพิ่ม Rate Limiting
8. เพิ่ม API Caching
9. เพิ่ม Email/SMS notifications

## License

MIT License