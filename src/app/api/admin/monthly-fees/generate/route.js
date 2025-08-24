import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// POST /api/admin/monthly-fees/generate - Generate monthly fees (Admin)
export async function POST(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const body = await request.json()
    const { year, month, building_id } = body

    // Validation
    if (!year || !month) {
      return createResponse(null, 'Year and month are required', 400)
    }

    const targetYear = parseInt(year)
    const targetMonth = parseInt(month)

    if (targetMonth < 1 || targetMonth > 12) {
      return createResponse(null, 'Month must be between 1 and 12', 400)
    }

    // Check if fees already generated for this period
    const existingFees = await prisma.monthlyFee.count({
      where: {
        feeMonth: new Date(targetYear, targetMonth - 1, 1),
        ...(building_id && {
          unit: {
            buildingId: parseInt(building_id)
          }
        })
      }
    })

    if (existingFees > 0) {
      return createResponse(null, 'Monthly fees already generated for this period', 400)
    }

    // Get units to generate fees for
    const where = {}
    if (building_id) {
      where.buildingId = parseInt(building_id)
    }

    const units = await prisma.unit.findMany({
      where,
      include: {
        building: {
          select: {
            name: true
          }
        },
        residents: {
          where: {
            status: 'active',
            isPrimary: true
          },
          take: 1
        }
      }
    })

    if (units.length === 0) {
      return createResponse(null, 'No units found to generate fees for', 400)
    }

    // Generate monthly fees
    const feeMonth = new Date(targetYear, targetMonth - 1, 1)
    const dueDate = new Date(targetYear, targetMonth - 1, 10) // Due on 10th of the month

    const monthlyFeesData = units.map(unit => ({
      unitId: unit.id,
      feeMonth,
      baseAmount: unit.monthlyFee,
      waterAmount: 0, // Can be customized
      electricityAmount: 0, // Can be customized
      parkingAmount: 0, // Can be customized
      otherCharges: 0,
      lateFee: 0,
      discount: 0,
      totalAmount: unit.monthlyFee,
      dueDate,
      status: 'unpaid'
    }))

    const createdFees = await prisma.monthlyFee.createMany({
      data: monthlyFeesData
    })

    // Get created fees with details
    const generatedFees = await prisma.monthlyFee.findMany({
      where: {
        feeMonth,
        ...(building_id && {
          unit: {
            buildingId: parseInt(building_id)
          }
        })
      },
      include: {
        unit: {
          include: {
            building: {
              select: {
                name: true,
                code: true
              }
            },
            residents: {
              where: {
                status: 'active',
                isPrimary: true
              },
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              },
              take: 1
            }
          }
        }
      }
    })

    // TODO: Send notifications to residents about new monthly fees
    // for (const fee of generatedFees) {
    //   if (fee.unit.residents.length > 0) {
    //     await createNotification({
    //       userId: fee.unit.residents[0].userId,
    //       title: 'ค่าส่วนกลางประจำเดือน',
    //       message: `ค่าส่วนกลางประจำเดือน ${targetMonth}/${targetYear} จำนวน ${fee.totalAmount} บาท`,
    //       type: 'payment'
    //     })
    //   }
    // }

    return createResponse({
      generated_count: createdFees.count,
      total_amount: generatedFees.reduce((sum, fee) => sum + parseFloat(fee.totalAmount), 0),
      fees: generatedFees
    }, `Generated ${createdFees.count} monthly fees successfully`, 201)

  } catch (error) {
    console.error('Generate monthly fees error:', error)
    return createResponse(null, 'Failed to generate monthly fees', 500)
  }
}