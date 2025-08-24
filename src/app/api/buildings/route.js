import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jsonResponse } from '@/lib/utils'

// GET /api/buildings - ดึงรายการอาคาร
export async function GET() {
  try {
    const buildings = await prisma.building.findMany({
      include: {
        units: {
          select: {
            id: true,
            unitNumber: true,
            floor: true,
            unitType: true,
            status: true,
          }
        },
        _count: {
          select: {
            units: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return jsonResponse({
      success: true,
      data: buildings
    })
  } catch (error) {
    console.error('Error fetching buildings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch buildings' },
      { status: 500 }
    )
  }
}

// POST /api/buildings - สร้างอาคารใหม่
export async function POST(request) {
  try {
    const body = await request.json()
    const { name, code, address, totalFloors, totalUnits } = body

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Name and code are required' },
        { status: 400 }
      )
    }

    const building = await prisma.building.create({
      data: {
        name,
        code,
        address,
        totalFloors: totalFloors || 0,
        totalUnits: totalUnits || 0
      }
    })

    return jsonResponse({
      success: true,
      data: building
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating building:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Building code already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create building' },
      { status: 500 }
    )
  }
}