import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/auth'
import { successResponse, authError, validationError, serverError } from '@/lib/response'

// GET /api/search - Global search
export async function GET(request) {
  try {
    const user = await authenticate(request)
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit')) || 10

    if (!query || query.trim().length < 2) {
      return validationError({ q: ['Search query must be at least 2 characters'] })
    }

    const searchTerm = query.trim()
    const startTime = Date.now()
    const results = {}

    // Search products
    if (type === 'all' || type === 'products') {
      const products = await prisma.product.findMany({
        where: {
          status: 'active',
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: {
          category: {
            select: { nameTh: true }
          }
        },
        take: limit,
        orderBy: { name: 'asc' }
      })

      results.products = products.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        discount_price: product.discountPrice,
        image: product.image,
        category: product.category.nameTh,
        highlight: highlightText(product.name, searchTerm)
      }))
    }

    // Search announcements
    if (type === 'all' || type === 'announcements') {
      // Get user's building for targeted announcements
      const userResidence = await prisma.resident.findFirst({
        where: { 
          userId: user.id, 
          status: 'active' 
        },
        include: {
          unit: {
            select: { buildingId: true }
          }
        }
      })

      const announcements = await prisma.announcement.findMany({
        where: {
          status: 'published',
          startDate: { lte: new Date() },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ],
          AND: [
            {
              OR: [
                { targetAudience: 'all' },
                { targetAudience: user.role === 'resident' ? 'residents' : user.role },
                ...(userResidence ? [{ 
                  targetAudience: 'specific_building',
                  buildingId: userResidence.unit.buildingId 
                }] : [])
              ]
            },
            {
              OR: [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { content: { contains: searchTerm, mode: 'insensitive' } }
              ]
            }
          ]
        },
        include: {
          reads: {
            where: { userId: user.id },
            select: { readAt: true }
          }
        },
        take: limit,
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      results.announcements = announcements.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content.substring(0, 200) + '...',
        announcement_type: announcement.announcementType,
        priority: announcement.priority,
        is_read: announcement.reads.length > 0,
        created_at: announcement.createdAt,
        highlight: highlightText(announcement.title, searchTerm)
      }))
    }

    // Search service requests (user's own only)
    if (type === 'all' || type === 'service_requests') {
      const serviceRequests = await prisma.serviceRequest.findMany({
        where: {
          userId: user.id,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: {
          category: {
            select: { nameTh: true }
          }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      })

      results.service_requests = serviceRequests.map(request => ({
        id: request.id,
        request_number: request.requestNumber,
        title: request.title,
        description: request.description.substring(0, 200) + '...',
        status: request.status,
        priority: request.priority,
        category: request.category.nameTh,
        created_at: request.createdAt,
        highlight: highlightText(request.title, searchTerm)
      }))
    }

    // Calculate total results
    const totalResults = Object.values(results).reduce((sum, items) => sum + items.length, 0)
    const searchTime = ((Date.now() - startTime) / 1000).toFixed(3)

    return successResponse({
      query: searchTerm,
      type,
      results,
      total_results: totalResults,
      search_time: `${searchTime}s`
    }, 'Search completed successfully')

  } catch (error) {
    if (error.message === 'Authentication required' || error.message === 'Invalid or expired token') {
      return authError(error.message)
    }
    console.error('Error performing search:', error)
    return serverError('Search failed')
  }
}

// Helper function to highlight search terms
function highlightText(text, searchTerm) {
  if (!text || !searchTerm) return text
  
  const regex = new RegExp(`(${searchTerm})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}