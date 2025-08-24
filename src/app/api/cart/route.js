import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, notFoundError } from '@/lib/response'

// For simplicity, we'll store cart in session/memory
// In production, you might want to use Redis or database
const userCarts = new Map()

// GET /api/cart - Get user's cart
export async function GET(request) {
  try {
    const user = await authenticate(request)
    
    const cartKey = `cart_${user.id}`
    const cart = userCarts.get(cartKey) || { items: [] }

    // Get product details for cart items
    if (cart.items.length > 0) {
      const productIds = cart.items.map(item => item.productId)
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          status: 'active'
        },
        include: {
          category: {
            select: { name: true, nameTh: true }
          }
        }
      })

      const cartItems = cart.items.map(item => {
        const product = products.find(p => p.id === item.productId)
        if (!product) return null

        const finalPrice = product.discountPrice || product.price
        return {
          id: item.id,
          product_id: product.id,
          product_name: product.name,
          product_image: product.image,
          unit_price: product.price,
          discount_price: product.discountPrice,
          final_price: finalPrice,
          quantity: item.quantity,
          total_price: finalPrice * item.quantity,
          unit: product.unit,
          stock_quantity: product.stockQuantity,
          category: product.category.nameTh,
          is_available: product.stockQuantity >= item.quantity
        }
      }).filter(Boolean)

      const cartSummary = {
        items: cartItems,
        total_items: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: cartItems.reduce((sum, item) => sum + item.total_price, 0),
        total_discount: cartItems.reduce((sum, item) => 
          sum + ((item.unit_price - item.final_price) * item.quantity), 0
        )
      }

      cartSummary.final_total = cartSummary.subtotal

      return successResponse(cartSummary, 'Cart retrieved successfully')
    }

    return successResponse({
      items: [],
      total_items: 0,
      subtotal: 0,
      total_discount: 0,
      final_total: 0
    }, 'Cart is empty')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error fetching cart:', error)
    return serverError('Failed to fetch cart')
  }
}

// DELETE /api/cart/clear - Clear entire cart
export async function DELETE(request) {
  try {
    const user = await authenticate(request)
    
    const cartKey = `cart_${user.id}`
    userCarts.delete(cartKey)

    return successResponse(null, 'Cart cleared successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error clearing cart:', error)
    return serverError('Failed to clear cart')
  }
}