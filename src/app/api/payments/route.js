import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/payments - Get user's payments
export async function GET(request) {
  try {
    const user = await authenticate(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const status = searchParams.get('status')
    const payment_type = searchParams.get('payment_type')
    
    const skip = (page - 1) * limit
    
    const where = { user_id: user.id }
    if (status) where.status = status
    if (payment_type) where.payment_type = payment_type
    
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          monthly_fee: {
            select: {
              year: true,
              month: true,
              amount: true
            }
          },
          order: {
            select: {
              order_number: true,
              total_amount: true
            }
          },
          booking: {
            select: {
              booking_number: true,
              total_amount: true,
              facility: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.payment.count({ where })
    ])

    return createResponse({
      payments,
      pagination: {
        total,
        per_page: limit,
        current_page: page,
        total_pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_previous: page > 1
      }
    })

  } catch (error) {
    console.error('Get payments error:', error)
    return createResponse(null, 'Failed to fetch payments', 500)
  }
}

// POST /api/payments - Create payment
export async function POST(request) {
  try {
    const user = await authenticate(request)
    const body = await request.json()
    
    const {
      payment_type,
      reference_id,
      amount,
      payment_method,
      bank_transfer_slip
    } = body

    // Validation
    if (!payment_type || !reference_id || !amount || !payment_method) {
      return createResponse(null, 'Payment type, reference ID, amount, and payment method are required', 400)
    }

    const paymentAmount = parseFloat(amount)
    const refId = parseInt(reference_id)

    // Validate reference based on payment type
    let referenceData = null
    if (payment_type === 'monthly_fee') {
      referenceData = await prisma.monthlyFee.findUnique({
        where: { id: refId, user_id: user.id }
      })
    } else if (payment_type === 'order') {
      referenceData = await prisma.order.findUnique({
        where: { id: refId, user_id: user.id }
      })
    } else if (payment_type === 'booking') {
      referenceData = await prisma.booking.findUnique({
        where: { id: refId, user_id: user.id }
      })
    }

    if (!referenceData) {
      return createResponse(null, 'Invalid reference ID', 400)
    }

    // Generate payment reference
    const paymentCount = await prisma.payment.count()
    const paymentReference = `PAY${new Date().getFullYear()}${(paymentCount + 1).toString().padStart(6, '0')}`

    const paymentData = {
      payment_reference: paymentReference,
      user_id: user.id,
      payment_type,
      amount: paymentAmount,
      payment_method,
      status: payment_method === 'bank_transfer' ? 'pending' : 'completed',
      bank_transfer_slip
    }

    // Set reference field based on payment type
    if (payment_type === 'monthly_fee') {
      paymentData.monthly_fee_id = refId
    } else if (payment_type === 'order') {
      paymentData.order_id = refId
    } else if (payment_type === 'booking') {
      paymentData.booking_id = refId
    }

    // For QR code payments, generate QR code data
    if (payment_method === 'qr_code') {
      paymentData.qr_code_data = `payment:${paymentReference}:${paymentAmount}`
      paymentData.expires_at = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    }

    const payment = await prisma.payment.create({
      data: paymentData,
      include: {
        monthly_fee: {
          select: {
            year: true,
            month: true
          }
        },
        order: {
          select: {
            order_number: true
          }
        },
        booking: {
          select: {
            booking_number: true,
            facility: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    const response = {
      payment_id: payment.id,
      payment_reference: payment.payment_reference,
      status: payment.status
    }

    if (payment_method === 'qr_code') {
      response.qr_code = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJ...` // Mock QR code
      response.expires_at = payment.expires_at
    }

    return createResponse(response, 'Payment created successfully', 201)

  } catch (error) {
    console.error('Create payment error:', error)
    return createResponse(null, 'Failed to create payment', 500)
  }
}