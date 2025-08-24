import { prisma } from '@/lib/prisma'
import { successResponse, serverError } from '@/lib/response'

// GET /api/settings/public - Get public settings
export async function GET(request) {
  try {
    const publicSettings = await prisma.systemSetting.findMany({
      where: { isPublic: true },
      select: {
        settingKey: true,
        settingValue: true,
        settingType: true
      }
    })

    // Convert settings to key-value object
    const settings = {}
    publicSettings.forEach(setting => {
      let value = setting.settingValue
      
      // Parse value based on type
      switch (setting.settingType) {
        case 'number':
          value = parseFloat(value)
          break
        case 'boolean':
          value = value === 'true'
          break
        case 'json':
          try {
            value = JSON.parse(value)
          } catch (e) {
            value = null
          }
          break
        default:
          // string - keep as is
          break
      }
      
      settings[setting.settingKey] = value
    })

    // Add default public settings if not in database
    const defaultSettings = {
      site_name: 'Community Living Management',
      delivery_fee: 20,
      free_delivery_threshold: 300,
      contact_info: {
        phone: '02-123-4567',
        email: 'info@community.com',
        address: '123 Community Street, Bangkok 10110'
      },
      business_hours: {
        monday: '08:00-18:00',
        tuesday: '08:00-18:00',
        wednesday: '08:00-18:00',
        thursday: '08:00-18:00',
        friday: '08:00-18:00',
        saturday: '09:00-17:00',
        sunday: 'closed'
      },
      features: {
        marketplace_enabled: true,
        service_requests_enabled: true,
        facility_booking_enabled: true,
        community_posts_enabled: true
      }
    }

    // Merge with defaults
    const finalSettings = { ...defaultSettings, ...settings }

    return successResponse(finalSettings, 'Public settings retrieved successfully')

  } catch (error) {
    console.error('Error fetching public settings:', error)
    return serverError('Failed to fetch public settings')
  }
}