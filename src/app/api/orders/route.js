import { prisma } from '@/lib/prisma'
import { authenticate, authorize } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, forbiddenError, paginatedResponse } from '@/lib/response'

// For cart storage
const userCarts = new Map()

// Generate order number
function generateOrderNumber() {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = Date.now().toString().slice(-6)
  return `ORD-${dateStr}-${timeStr}`
}

// GET /api/orders - Get user's orders
export async function GET(request) {
  try {
    const user = await authenticate(request)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 10
    const status = searchParams.get('status')

    const where = {
      userId: user.id,
      ...(status && { orderStatus: status })
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  image: true,
                  unit: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where })
    ])

    const formattedOrders = orders.map(order => ({
      id: order.id,
      order_number: order.orderNumber,
      total_amount: order.totalAmount,
      delivery_fee: order.deliveryFee,
      discount_amount: order.discountAmount,
      final_amount: order.finalAmount,
      delivery_address: order.deliveryAddress,
      delivery_date: order.deliveryDate,
      delivery_time: order.deliveryTime,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      order_status: order.orderStatus,
      notes: order.notes,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      items: order.orderItems.map(item => ({
        id: item.id,
        product_name: item.product.name,
        product_image: item.product.image,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        unit: item.product.unit
      })),
      items_count: order.orderItems.length
    }))

    return paginatedResponse(formattedOrders, {
      total,
      per_page: limit,
      current_page: page,
      total_pages: Math.ceil(total / limit),
      has_next: page < Math.ceil(total / limit),
      has_previous: page > 1
    })

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error fetching orders:', error)
    return serverError('Failed to fetch orders')
  }
}

// POST /api/orders - Create new order
export async function POST(request) {
  try {
    const user = await authenticate(request)
    const body = await request.json()
    const { 
      items, 
      deliveryAddress, 
      deliveryDate, 
      deliveryTime, 
      paymentMethod = 'cash',
      notes 
    } = body

    // Validation
    const errors = {}
    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.items = ['Order items are required']
    }
    if (!deliveryAddress) errors.deliveryAddress = ['Delivery address is required']
    if (!['cash', 'transfer', 'qr_code'].includes(paymentMethod)) {
      errors.paymentMethod = ['Invalid payment method']
    }

    // Validate items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (!item.product_id) {
          errors[`items.${i}.product_id`] = ['Product ID is required']
        }
        if (!item.quantity || item.quantity < 1) {
          errors[`items.${i}.quantity`] = ['Quantity must be at least 1']
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Get products and validate availability
    const productIds = items.map(item => item.product_id)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: 'active'
      }
    })

    if (products.length !== productIds.length) {
      return validationError({ items: ['Some products are not available'] })
    }

    // Calculate totals and validate stock
    let totalAmount = 0
    const orderItems = []

    for (const item of items) {
      const product = products.find(p => p.id === item.product_id)
      
      if (product.stockQuantity < item.quantity) {
        return validationError({ 
          items: [`Insufficient stock for ${product.name}. Only ${product.stockQuantity} available`] 
        })
      }

      const unitPrice = product.discountPrice || product.price
      const totalPrice = unitPrice * item.quantity

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        totalPrice
      })

      totalAmount += totalPrice
    }

    // Calculate delivery fee (simple logic)
    const deliveryFee = totalAmount >= 300 ? 0 : 20
    const finalAmount = totalAmount + deliveryFee

    // Create order
    const orderNumber = generateOrderNumber()

    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          orderNumber,
          totalAmount,
          deliveryFee,
          discountAmount: 0,
          finalAmount,
          deliveryAddress,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          deliveryTime: deliveryTime ? new Date(`1970-01-01T${deliveryTime}`) : null,
          paymentMethod,
          notes
        }
      })

      // Create order items
      await tx.orderItem.createMany({
        data: orderItems.map(item => ({
          orderId: newOrder.id,
          ...item
        }))
      })

      // Update product stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.product_id },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        })
      }

      return newOrder
    })

    // Clear user's cart
    const cartKey = `cart_${user.id}`
    userCarts.delete(cartKey)

    return successResponse({
      order_id: order.id,
      order_number: order.orderNumber,
      total_amount: order.totalAmount,
      delivery_fee: order.deliveryFee,
      final_amount: order.finalAmount,
      payment_method: order.paymentMethod,
      order_status: order.orderStatus,
      payment_status: order.paymentStatus,
      created_at: order.createdAt
    }, 'Order created successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error creating order:', error)
    return serverError('Failed to create order')
  }
}