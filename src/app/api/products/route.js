import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jsonResponse } from '@/lib/utils'

// GET /api/products - ดึงรายการสินค้า
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const status = searchParams.get('status') || 'active'
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20

    const where = {
      status,
      ...(categoryId && { categoryId: parseInt(categoryId) })
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              nameTh: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.product.count({ where })
    ])

    return jsonResponse({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/products - สร้างสินค้าใหม่
export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      categoryId, 
      name, 
      description, 
      price, 
      discountPrice, 
      stockQuantity, 
      unit, 
      image 
    } = body

    if (!categoryId || !name || !price) {
      return NextResponse.json(
        { success: false, error: 'Category, name, and price are required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        categoryId: parseInt(categoryId),
        name,
        description,
        price,
        discountPrice,
        stockQuantity: stockQuantity || 0,
        unit: unit || 'ชิ้น',
        image
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameTh: true
          }
        }
      }
    })

    return jsonResponse({
      success: true,
      data: product
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    )
  }
}