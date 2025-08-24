const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create sample buildings
  const building1 = await prisma.building.create({
    data: {
      name: 'อาคาร A',
      code: 'A001',
      address: '123 ถนนสุขุมวิท กรุงเทพฯ',
      totalFloors: 10,
      totalUnits: 40
    }
  })

  const building2 = await prisma.building.create({
    data: {
      name: 'อาคาร B',
      code: 'B001',
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
      const unitNumber = `${floor}${unit.toString().padStart(2, '0')}`
      units.push({
        buildingId: building1.id,
        unitNumber,
        floor,
        unitType: unit <= 2 ? 'one_br' : 'two_br',
        areaSqm: unit <= 2 ? 35.5 : 55.0,
        monthlyFee: unit <= 2 ? 3500 : 5500
      })
    }
  }

  await prisma.unit.createMany({
    data: units
  })

  console.log('✅ Units created')

  // Create sample users
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@condo.com',
      passwordHash: 'hashed_password_123', // In real app, use proper hashing
      firstName: 'ผู้ดูแล',
      lastName: 'ระบบ',
      phone: '02-123-4567',
      role: 'admin'
    }
  })

  const resident1 = await prisma.user.create({
    data: {
      username: 'john_doe',
      email: 'john@example.com',
      passwordHash: 'hashed_password_456',
      firstName: 'จอห์น',
      lastName: 'โด',
      phone: '08-1234-5678',
      role: 'resident'
    }
  })

  const resident2 = await prisma.user.create({
    data: {
      username: 'jane_smith',
      email: 'jane@example.com',
      passwordHash: 'hashed_password_789',
      firstName: 'เจน',
      lastName: 'สมิธ',
      phone: '08-9876-5432',
      role: 'resident'
    }
  })

  console.log('✅ Users created')

  // Create sample product categories
  const foodCategory = await prisma.productCategory.create({
    data: {
      name: 'Food & Beverages',
      nameTh: 'อาหารและเครื่องดื่ม',
      icon: '🍔',
      sortOrder: 1
    }
  })

  const dailyCategory = await prisma.productCategory.create({
    data: {
      name: 'Daily Necessities',
      nameTh: 'ของใช้ประจำวัน',
      icon: '🧴',
      sortOrder: 2
    }
  })

  console.log('✅ Product categories created')

  // Create sample products
  await prisma.product.createMany({
    data: [
      {
        categoryId: foodCategory.id,
        name: 'ข้าวผัดกุ้ง',
        description: 'ข้าวผัดกุ้งสดใหม่ พร้อมผักสด',
        price: 120.00,
        stockQuantity: 50,
        unit: 'จาน'
      },
      {
        categoryId: foodCategory.id,
        name: 'ส้มตำไทย',
        description: 'ส้มตำไทยแท้ รสชาติเผ็ดร้อน',
        price: 80.00,
        stockQuantity: 30,
        unit: 'จาน'
      },
      {
        categoryId: dailyCategory.id,
        name: 'ผงซักฟอก',
        description: 'ผงซักฟอกขาว สะอาด หอมสดชื่น',
        price: 45.00,
        stockQuantity: 100,
        unit: 'ถุง'
      },
      {
        categoryId: dailyCategory.id,
        name: 'แชมพูสระผม',
        description: 'แชมพูสระผม สูตรอ่อนโยน',
        price: 89.00,
        stockQuantity: 75,
        unit: 'ขวด'
      }
    ]
  })

  console.log('✅ Products created')

  // Create sample service categories
  await prisma.serviceCategory.createMany({
    data: [
      {
        name: 'Maintenance',
        nameTh: 'งานซ่อมบำรุง',
        icon: '🔧',
        description: 'งานซ่อมแซมและบำรุงรักษา',
        isRepairService: true
      },
      {
        name: 'Cleaning',
        nameTh: 'งานทำความสะอาด',
        icon: '🧹',
        description: 'บริการทำความสะอาด'
      },
      {
        name: 'Security',
        nameTh: 'งานรักษาความปลอดภัย',
        icon: '🛡️',
        description: 'บริการรักษาความปลอดภัย'
      }
    ]
  })

  console.log('✅ Service categories created')

  // Create sample facilities
  await prisma.facility.createMany({
    data: [
      {
        name: 'ห้องประชุม A',
        description: 'ห้องประชุมขนาดกลาง สำหรับ 20 คน',
        location: 'ชั้น 2 อาคาร A',
        capacity: 20,
        hourlyRate: 200.00,
        bookingAdvanceDays: 7,
        minBookingHours: 2,
        maxBookingHours: 8
      },
      {
        name: 'สระว่ายน้ำ',
        description: 'สระว่ายน้ำขนาดมาตรฐาน',
        location: 'ชั้น G อาคาร A',
        capacity: 50,
        hourlyRate: 0.00,
        bookingAdvanceDays: 3,
        minBookingHours: 1,
        maxBookingHours: 4
      },
      {
        name: 'ห้องฟิตเนส',
        description: 'ห้องออกกำลังกาย พร้อมอุปกรณ์ครบครัน',
        location: 'ชั้น 3 อาคาร B',
        capacity: 15,
        hourlyRate: 50.00,
        bookingAdvanceDays: 1,
        minBookingHours: 1,
        maxBookingHours: 3
      }
    ]
  })

  console.log('✅ Facilities created')

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