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

### Users
- `GET /api/users` - ดึงรายการผู้ใช้
- `POST /api/users` - สร้างผู้ใช้ใหม่

### Buildings
- `GET /api/buildings` - ดึงรายการอาคาร
- `POST /api/buildings` - สร้างอาคารใหม่

### Products
- `GET /api/products` - ดึงรายการสินค้า
- `POST /api/products` - สร้างสินค้าใหม่

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

## การพัฒนาต่อ

1. เพิ่มระบบ Authentication (NextAuth.js)
2. เพิ่ม File Upload สำหรับรูปภาพ
3. เพิ่มระบบ Real-time notifications
4. เพิ่ม Dashboard analytics
5. เพิ่มระบบ Payment Gateway
6. เพิ่ม Mobile App (React Native)

## License

MIT License