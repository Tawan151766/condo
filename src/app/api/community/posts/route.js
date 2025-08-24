import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/community/posts - List community posts
export async function GET(request) {
  try {
    const user = await authenticate(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const category = searchParams.get('category')
    const sort = searchParams.get('sort') || 'latest' // latest, popular, oldest
    
    const skip = (page - 1) * limit
    
    const where = { is_active: true }
    if (category) where.category = category
    
    let orderBy = { created_at: 'desc' }
    if (sort === 'popular') {
      orderBy = { likes_count: 'desc' }
    } else if (sort === 'oldest') {
      orderBy = { created_at: 'asc' }
    }
    
    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              profile_image: true
            }
          },
          _count: {
            select: {
              comments: true,
              likes: true
            }
          },
          likes: {
            where: { user_id: user.id },
            select: { id: true }
          }
        }
      }),
      prisma.communityPost.count({ where })
    ])

    // Add is_liked field
    const postsWithLikeStatus = posts.map(post => ({
      ...post,
      is_liked: post.likes.length > 0,
      likes: undefined // Remove likes array from response
    }))

    return createResponse({
      posts: postsWithLikeStatus,
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
    console.error('Get community posts error:', error)
    return createResponse(null, 'Failed to fetch community posts', 500)
  }
}

// POST /api/community/posts - Create post
export async function POST(request) {
  try {
    const user = await authenticate(request)
    const body = await request.json()
    
    const {
      title,
      content,
      category,
      images,
      is_anonymous
    } = body

    // Validation
    if (!title || !content) {
      return createResponse(null, 'Title and content are required', 400)
    }

    if (title.length > 200) {
      return createResponse(null, 'Title must be less than 200 characters', 400)
    }

    if (content.length > 5000) {
      return createResponse(null, 'Content must be less than 5000 characters', 400)
    }

    const post = await prisma.communityPost.create({
      data: {
        title,
        content,
        category: category || 'general',
        images: images || [],
        is_anonymous: is_anonymous || false,
        author_id: user.id,
        is_active: true
      },
      include: {
        author: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            profile_image: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    })

    return createResponse(post, 'Post created successfully', 201)

  } catch (error) {
    console.error('Create community post error:', error)
    return createResponse(null, 'Failed to create post', 500)
  }
}