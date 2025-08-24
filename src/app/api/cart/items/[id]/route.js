import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, notFoundError } from '@/lib/response'

// For simplicity, we'll store cart in session/memory
const userCarts = new Map()

// PUT /api/cart/items/[id] - Update cart item quantity
export async function PUT(request, { params }) {
  try {
    const user = await authenticate(request)
    const itemId = parseInt(params.id)
    const body = await request.json()
    const { quantity } = body

    // Validation
    if (!quantity || quantity < 1) {
      return validationError({ quantity: ['Quantity must be at least 1'] })
    }
    if (quantity > 99) {
      return validationError({ quantity: ['Quantity cannot exceed 99'] })
    }

    // Get cart
    const cartKey = `cart_${user.id}`
    let cart = userCarts.get(cartKey) || { items: [] }

    // Find item in cart
    const itemIndex = cart.items.findIndex(item => item.id === itemId)
    if (itemIndex === -1) {
      return notFoundError('Cart item not found')
    }

    const cartItem = cart.items[itemIndex]

    // Check product availability
    const product = await prisma.product.findUnique({
      where: { id: cartItem.productId },
      select: {
        id: true,
        name: true,
        price: true,
        discountPrice: true,
        stockQuantity: true,
        status: true
      }
    })

    if (!product || product.status !== 'active') {
      return validationError({ quantity: ['Product is no longer available'] })
    }

    if (product.stockQuantity < quantity) {
      return validationError({ 
        quantity: [`Only ${product.stockQuantity} items available in stock`] 
      })
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity
    cart.items[itemIndex].updatedAt = new Date()

    userCarts.set(cartKey, cart)

    return successResponse({
      id: itemId,
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price: product.price,
      discount_price: product.discountPrice,
      final_price: product.discountPrice || product.price,
      total_price: (product.discountPrice || product.price) * quantity
    }, 'Cart item updated successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error updating cart item:', error)
    return serverError('Failed to update cart item')
  }
}

// DELETE /api/cart/items/[id] - Remove item from cart
export async function DELETE(request, { params }) {
  try {
    const user = await authenticate(request)
    const itemId = parseInt(params.id)

    // Get cart
    const cartKey = `cart_${user.id}`
    let cart = userCarts.get(cartKey) || { items: [] }

    // Find and remove item
    const itemIndex = cart.items.findIndex(item => item.id === itemId)
    if (itemIndex === -1) {
      return notFoundError('Cart item not found')
    }

    cart.items.splice(itemIndex, 1)
    userCarts.set(cartKey, cart)

    return successResponse(null, 'Item removed from cart successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error removing cart item:', error)
    return serverError('Failed to remove cart item')
  }
}