import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/admin/settings/{key} - Get specific setting (Admin)
export async function GET(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const settingKey = params.key

    const setting = await prisma.systemSetting.findUnique({
      where: { settingKey },
      include: {
        updater: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!setting) {
      return createResponse(null, 'Setting not found', 404)
    }

    return createResponse(setting)

  } catch (error) {
    console.error('Get admin setting error:', error)
    return createResponse(null, 'Failed to fetch setting', 500)
  }
}

// PUT /api/admin/settings/{key} - Update setting (Admin)
export async function PUT(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const settingKey = params.key
    const body = await request.json()
    const {
      setting_value,
      setting_type,
      description,
      is_public
    } = body

    const setting = await prisma.systemSetting.findUnique({
      where: { settingKey }
    })

    if (!setting) {
      return createResponse(null, 'Setting not found', 404)
    }

    const updateData = {
      updatedBy: user.id
    }
    
    if (setting_value !== undefined) updateData.settingValue = setting_value
    if (setting_type !== undefined) updateData.settingType = setting_type
    if (description !== undefined) updateData.description = description
    if (is_public !== undefined) updateData.isPublic = is_public

    const updatedSetting = await prisma.systemSetting.update({
      where: { settingKey },
      data: updateData,
      include: {
        updater: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return createResponse(updatedSetting, 'Setting updated successfully')

  } catch (error) {
    console.error('Update admin setting error:', error)
    return createResponse(null, 'Failed to update setting', 500)
  }
}

// DELETE /api/admin/settings/{key} - Delete setting (Admin)
export async function DELETE(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const settingKey = params.key

    const setting = await prisma.systemSetting.findUnique({
      where: { settingKey }
    })

    if (!setting) {
      return createResponse(null, 'Setting not found', 404)
    }

    await prisma.systemSetting.delete({
      where: { settingKey }
    })

    return createResponse(null, 'Setting deleted successfully')

  } catch (error) {
    console.error('Delete admin setting error:', error)
    return createResponse(null, 'Failed to delete setting', 500)
  }
}