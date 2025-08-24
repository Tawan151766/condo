import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jsonResponse } from '@/lib/utils'

// GET /api/users - ดึงรายการผู้ใช้
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return jsonResponse({
      success: true,
      data: users
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/users - สร้างผู้ใช้ใหม่
export async function POST(request) {
  try {
    const body = await request.json()
    const { username, email, password, firstName, lastName, phone, role } = body

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!username || !email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // สร้างผู้ใช้ใหม่
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: password, // ในการใช้งานจริงควร hash password ก่อน
        firstName,
        lastName,
        phone,
        role: role || 'resident'
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      }
    })

    return jsonResponse({
      success: true,
      data: user
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    
    // ตรวจสอบ unique constraint error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Username or email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
}