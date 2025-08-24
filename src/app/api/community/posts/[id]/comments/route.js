import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/community/posts/{id}/comments - Get post comments
export async function GET(request, { params }) {
  try {
    const user = await authenticate(request)
    const postId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 50
    
    const skip = (page - 1) * limit

    const post = await prisma.communityPost.findUnique({
      where: { id: postId }
    })

    if (!post || !post.is_active) {
      return createResponse(null, 'Post not found', 404)
    }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          post_id: postId,
          is_active: true
        },
        skip,
        take: limit,
        orderBy: { created_at: 'asc' },
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
            select: { likes: true }
          },
          likes: {
            where: { user_id: user.id },
            select: { id: true }
          }
        }
      }),
      prisma.comment.count({
        where: {
          post_id: postId,
          is_active: true
        }
      })
    ])

    // Add is_liked field
    const commentsWithLikeStatus = comments.map(comment => ({
      ...comment,
      is_liked: comment.likes.length > 0,
      likes: undefined
    }))

    return createResponse({
      comments: commentsWithLikeStatus,
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
    console.error('Get post comments error:', error)
    return createResponse(null, 'Failed to fetch comments', 500)
  }
}

// POST /api/community/posts/{id}/comments - Create comment
export async function POST(request, { params }) {
  try {
    const user = await authenticate(request)
    const postId = parseInt(params.id)
    const body = await request.json()
    
    const { content, is_anonymous } = body

    // Validation
    if (!content || content.trim().length === 0) {
      return createResponse(null, 'Comment content is required', 400)
    }

    if (content.length > 1000) {
      return createResponse(null, 'Comment must be less than 1000 characters', 400)
    }

    const post = await prisma.communityPost.findUnique({
      where: { id: postId }
    })

    if (!post || !post.is_active) {
      return createResponse(null, 'Post not found', 404)
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        is_anonymous: is_anonymous || false,
        author_id: user.id,
        post_id: postId,
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
          select: { likes: true }
        }
      }
    })

    // Update post comments count
    await prisma.communityPost.update({
      where: { id: postId },
      data: { comments_count: { increment: 1 } }
    })

    return createResponse(comment, 'Comment created successfully', 201)

  } catch (error) {
    console.error('Create comment error:', error)
    return createResponse(null, 'Failed to create comment', 500)
  }
}