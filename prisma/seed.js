const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create sample buildings
  const building1 = await prisma.building.upsert({
    where: { code: 'A' },
    update: {},
    create: {
      name: 'อาคาร A',
      code: 'A',
      address: '123 ถนนสุขุมวิท กรุงเทพฯ',
      totalFloors: 10,
      totalUnits: 40
    }
  })

  const building2 = await prisma.building.upsert({
    where: { code: 'B' },
    update: {},
    create: {
      name: 'อาคาร B',
      code: 'B',
      address: '456 ถนนสีลม กรุงเทพฯ',
      totalFloors: 8,
      totalUnits: 32
    }
  })

  console.log('✅ Buildings created')

  // Create sample units
  const units = []
  for (let floor = 1; floor <= 5; floor++) {
    for (let unit = 1; unit <= 4; unit++) {
      units.push({
        buildingId: building1.id,
        unitNumber: `A${floor}0${unit}`,
        floor: floor,
        unitType: 'two_br',
        areaSqm: 65.5,
        monthlyFee: 8500.00
      })
    }
  }

  await prisma.unit.createMany({
    data: units,
    skipDuplicates: true
  })

  console.log('✅ Units created')

  // Create sample users
  const hashedPassword = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@condo.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@condo.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'System',
      phone: '0812345678',
      role: 'admin',
      status: 'active'
    }
  })

  const resident = await prisma.user.upsert({
    where: { email: 'resident@condo.com' },
    update: {},
    create: {
      username: 'resident01',
      email: 'resident@condo.com',
      passwordHash: hashedPassword,
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      phone: '0823456789',
      role: 'resident',
      status: 'active'
    }
  })

  console.log('✅ Users created')

  // Create product categories
  await prisma.productCategory.createMany({
    data: [
      {
        name: 'Beverages',
        nameTh: 'เครื่องดื่ม',
        icon: '🥤',
        sortOrder: 1
      },
      {
        name: 'Snacks',
        nameTh: 'ขนมขบเคี้ยว',
        icon: '🍿',
        sortOrder: 2
      },
      {
        name: 'Daily Essentials',
        nameTh: 'ของใช้ประจำวัน',
        icon: '🧴',
        sortOrder: 3
      }
    ],
    skipDuplicates: true
  })

  console.log('✅ Product categories created')

  // Create sample products
  const categories = await prisma.productCategory.findMany()
  
  await prisma.product.createMany({
    data: [
      {
        categoryId: categories[0].id,
        name: 'น้ำดื่มตราช้าง 1.5 ลิตร แพ็ค 6 ขวด',
        description: 'น้ำดื่มสะอาด บรรจุขวดพลาสติก',
        image: 'water-chang-pack6.jpg',
        price: 49.00,
        discountPrice: 42.00,
        stockQuantity: 50,
        unit: 'แพ็ค'
      },
      {
        categoryId: categories[1].id,
        name: 'มาม่าต้มยำกุ้ง แพ็ค 5 ซอง',
        description: 'บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง',
        image: 'mama-tomyum-pack5.jpg',
        price: 35.00,
        stockQuantity: 30,
        unit: 'แพ็ค'
      },
      {
        categoryId: categories[2].id,
        name: 'ผ้าเช็ดหน้า Kleenex',
        description: 'กระดาษทิชชู่เช็ดหน้า นุ่มและแข็งแรง',
        image: 'kleenex-facial.jpg',
        price: 25.00,
        stockQuantity: 40,
        unit: 'กล่อง'
      }
    ],
    skipDuplicates: true
  })

  console.log('✅ Products created')

  // Create service categories
  await prisma.serviceCategory.createMany({
    data: [
      {
        name: 'Air Conditioning',
        nameTh: 'เครื่องปรับอากาศ',
        icon: '❄️',
        description: 'บริการซ่อมแซมและบำรุงรักษาเครื่องปรับอากาศ',
        isRepairService: true
      },
      {
        name: 'Plumbing',
        nameTh: 'งานประปา',
        icon: '🔧',
        description: 'บริการซ่อมแซมระบบประปาและสุขภัณฑ์',
        isRepairService: true
      },
      {
        name: 'Electrical',
        nameTh: 'งานไฟฟ้า',
        icon: '⚡',
        description: 'บริการซ่อมแซมระบบไฟฟ้าและอุปกรณ์ไฟฟ้า',
        isRepairService: true
      },
      {
        name: 'Cleaning',
        nameTh: 'งานทำความสะอาด',
        icon: '🧹',
        description: 'บริการทำความสะอาดส่วนกลางและพื้นที่ส่วนตัว'
      },
      {
        name: 'Security',
        nameTh: 'งานรักษาความปลอดภัย',
        icon: '🛡️',
        description: 'บริการรักษาความปลอดภัย'
      }
    ],
    skipDuplicates: true
  })

  console.log('✅ Service categories created')

  // Create sample facilities
  await prisma.facility.createMany({
    data: [
      {
        name: 'ห้องประชุม A',
        type: 'meeting_room',
        description: 'ห้องประชุมขนาดกลาง สำหรับ 20 คน',
        location: 'ชั้น 2 อาคาร A',
        capacity: 20,
        hourlyRate: 200.00,
        advanceBookingDays: 7,
        minBookingHours: 2,
        maxBookingHours: 8,
        createdBy: admin.id,
        amenities: ["โปรเจคเตอร์", "ไวท์บอร์ด", "เครื่องปรับอากาศ"],
        rules: ["ห้ามสูบบุหรี่", "ห้ามนำอาหารเข้ามา"]
      },
      {
        name: 'สระว่ายน้ำ',
        type: 'pool',
        description: 'สระว่ายน้ำขนาดมาตรฐาน',
        location: 'ชั้น G อาคาร A',
        capacity: 50,
        hourlyRate: 0.00,
        advanceBookingDays: 3,
        minBookingHours: 1,
        maxBookingHours: 4,
        createdBy: admin.id,
        amenities: ["ห้องแต่งตัว", "ฝักบัว", "ผ้าเช็ดตัว"],
        rules: ["ต้องสวมชุดว่ายน้ำ", "เด็กต้องมีผู้ปกครองดูแล"]
      },
      {
        name: 'ห้องฟิตเนส',
        type: 'gym',
        description: 'ห้องออกกำลังกาย พร้อมอุปกรณ์ครบครัน',
        location: 'ชั้น 3 อาคาร B',
        capacity: 15,
        hourlyRate: 50.00,
        advanceBookingDays: 1,
        minBookingHours: 1,
        maxBookingHours: 3,
        createdBy: admin.id,
        amenities: ["เครื่องออกกำลังกาย", "ดัมเบล", "เสื่อโยคะ"],
        rules: ["ต้องสวมรองเท้าผ้าใบ", "เช็ดเครื่องมือหลังใช้"]
      }
    ],
    skipDuplicates: true
  })

  console.log('✅ Facilities created')

  // Create sample announcements
  await prisma.announcement.createMany({
    data: [
      {
        title: 'ประกาศปิดเส้นทางเข้า-ออกชั่วคราว',
        content: 'เนื่องจากมีการซ่อมแซมท่อประปาหลัก จึงขอปิดเส้นทางเข้า-ออกทางหลักชั่วคราว ตั้งแต่วันที่ 15-20 กุมภาพันธ์ 2567',
        announcementType: 'maintenance',
        priority: 'high',
        targetAudience: 'all',
        startDate: new Date('2024-02-15'),
        endDate: new Date('2024-02-20'),
        isPinned: true,
        createdBy: admin.id,
        status: 'published'
      },
      {
        title: 'กิจกรรมงานสังสรรค์ประจำเดือน',
        content: 'ขอเชิญชวนผู้อยู่อาศัยทุกท่านร่วมงานสังสรรค์ประจำเดือน วันเสาร์ที่ 10 กุมภาพันธ์ เวลา 18:00 น. ณ ห้องประชุมชั้น 2',
        announcementType: 'event',
        priority: 'medium',
        targetAudience: 'all',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-10'),
        createdBy: admin.id,
        status: 'published'
      }
    ],
    skipDuplicates: true
  })

  console.log('✅ Announcements created')

  // Create system settings
  await prisma.systemSetting.createMany({
    data: [
      {
        settingKey: 'site_name',
        settingValue: 'Community Living Management',
        settingType: 'string',
        description: 'ชื่อเว็บไซต์',
        isPublic: true
      },
      {
        settingKey: 'delivery_fee',
        settingValue: '20',
        settingType: 'number',
        description: 'ค่าจัดส่งสินค้า',
        isPublic: true
      },
      {
        settingKey: 'free_delivery_threshold',
        settingValue: '300',
        settingType: 'number',
        description: 'ยอดขั้นต่ำสำหรับจัดส่งฟรี',
        isPublic: true
      },
      {
        settingKey: 'contact_phone',
        settingValue: '02-123-4567',
        settingType: 'string',
        description: 'เบอร์โทรติดต่อ',
        isPublic: true
      },
      {
        settingKey: 'contact_email',
        settingValue: 'info@community.com',
        settingType: 'string',
        description: 'อีเมลติดต่อ',
        isPublic: true
      }
    ],
    skipDuplicates: true
  })

  console.log('✅ System settings created')
  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })