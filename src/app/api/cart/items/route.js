import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'
import { successResponse, authError, validationError, serverError, notFoundError } from '@/lib/response'

// For simplicity, we'll store cart in session/memory
const userCarts = new Map()

// POST /api/cart/items - Add item to cart
export async function POST(request) {
  try {
    const user = await authenticate(request)
    const body = await request.json()
    const { productId, quantity = 1 } = body

    // Validation
    const errors = {}
    if (!productId) errors.productId = ['Product ID is required']
    if (!quantity || quantity < 1) errors.quantity = ['Quantity must be at least 1']
    if (quantity > 99) errors.quantity = ['Quantity cannot exceed 99']

    if (Object.keys(errors).length > 0) {
      return validationError(errors)
    }

    // Check if product exists and is available
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      select: {
        id: true,
        name: true,
        price: true,
        discountPrice: true,
        stockQuantity: true,
        status: true
      }
    })

    if (!product) {
      return notFoundError('Product not found')
    }

    if (product.status !== 'active') {
      return validationError({ productId: ['Product is not available'] })
    }

    if (product.stockQuantity < quantity) {
      return validationError({ 
        quantity: [`Only ${product.stockQuantity} items available in stock`] 
      })
    }

    // Get or create cart
    const cartKey = `cart_${user.id}`
    let cart = userCarts.get(cartKey) || { items: [] }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(item => item.productId === parseInt(productId))
    
    if (existingItemIndex >= 0) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity
      
      if (newQuantity > product.stockQuantity) {
        return validationError({ 
          quantity: [`Cannot add more items. Only ${product.stockQuantity} available in stock`] 
        })
      }

      cart.items[existingItemIndex].quantity = newQuantity
      cart.items[existingItemIndex].updatedAt = new Date()
    } else {
      // Add new item
      cart.items.push({
        id: Date.now(), // Simple ID generation
        productId: parseInt(productId),
        quantity,
        addedAt: new Date(),
        updatedAt: new Date()
      })
    }

    userCarts.set(cartKey, cart)

    return successResponse({
      product_id: product.id,
      product_name: product.name,
      quantity: existingItemIndex >= 0 
        ? cart.items[existingItemIndex].quantity 
        : quantity,
      unit_price: product.price,
      discount_price: product.discountPrice,
      final_price: product.discountPrice || product.price
    }, 'Item added to cart successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error adding item to cart:', error)
    return serverError('Failed to add item to cart')
  }
}