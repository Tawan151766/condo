import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/admin/settings - Get all system settings (Admin)
export async function GET(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const is_public = searchParams.get('is_public')
    
    const where = {}
    if (is_public !== null) where.isPublic = is_public === 'true'
    
    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: { settingKey: 'asc' },
      include: {
        updater: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Group settings by category (based on key prefix)
    const groupedSettings = {}
    settings.forEach(setting => {
      const category = setting.settingKey.split('_')[0]
      if (!groupedSettings[category]) {
        groupedSettings[category] = []
      }
      groupedSettings[category].push(setting)
    })

    return createResponse({
      settings,
      grouped_settings: groupedSettings,
      total_count: settings.length
    })

  } catch (error) {
    console.error('Get admin settings error:', error)
    return createResponse(null, 'Failed to fetch settings', 500)
  }
}

// POST /api/admin/settings - Create new setting (Admin)
export async function POST(request) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const body = await request.json()
    const {
      setting_key,
      setting_value,
      setting_type,
      description,
      is_public
    } = body

    // Validation
    if (!setting_key || setting_value === undefined) {
      return createResponse(null, 'Setting key and value are required', 400)
    }

    // Check if setting already exists
    const existingSetting = await prisma.systemSetting.findUnique({
      where: { settingKey: setting_key }
    })

    if (existingSetting) {
      return createResponse(null, 'Setting key already exists', 400)
    }

    const setting = await prisma.systemSetting.create({
      data: {
        settingKey: setting_key,
        settingValue: setting_value,
        settingType: setting_type || 'string',
        description,
        isPublic: is_public || false,
        updatedBy: user.id
      },
      include: {
        updater: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return createResponse(setting, 'Setting created successfully', 201)

  } catch (error) {
    console.error('Create admin setting error:', error)
    return createResponse(null, 'Failed to create setting', 500)
  }
}