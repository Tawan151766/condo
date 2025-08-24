import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// GET /api/community/posts/{id} - Get post details
export async function GET(request, { params }) {
  try {
    const user = await authenticate(request)
    const postId = parseInt(params.id)

    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            profile_image: true
          }
        },
        comments: {
          where: { is_active: true },
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
    })

    if (!post || !post.is_active) {
      return createResponse(null, 'Post not found', 404)
    }

    // Add is_liked field to post and comments
    const postWithLikeStatus = {
      ...post,
      is_liked: post.likes.length > 0,
      likes: undefined,
      comments: post.comments.map(comment => ({
        ...comment,
        is_liked: comment.likes.length > 0,
        likes: undefined
      }))
    }

    // Increment view count
    await prisma.communityPost.update({
      where: { id: postId },
      data: { views_count: { increment: 1 } }
    })

    return createResponse(postWithLikeStatus)

  } catch (error) {
    console.error('Get community post error:', error)
    return createResponse(null, 'Failed to fetch post', 500)
  }
}

// PUT /api/community/posts/{id} - Update own post
export async function PUT(request, { params }) {
  try {
    const user = await authenticate(request)
    const postId = parseInt(params.id)
    const body = await request.json()

    const post = await prisma.communityPost.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return createResponse(null, 'Post not found', 404)
    }

    // Check if user can update this post
    if (post.author_id !== user.id && !['admin', 'staff'].includes(user.role)) {
      return createResponse(null, 'Access denied', 403)
    }

    const { title, content, category, images } = body

    const updateData = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (category !== undefined) updateData.category = category
    if (images !== undefined) updateData.images = images
    updateData.updated_at = new Date()

    const updatedPost = await prisma.communityPost.update({
      where: { id: postId },
      data: updateData,
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

    return createResponse(updatedPost, 'Post updated successfully')

  } catch (error) {
    console.error('Update community post error:', error)
    return createResponse(null, 'Failed to update post', 500)
  }
}

// DELETE /api/community/posts/{id} - Delete own post
export async function DELETE(request, { params }) {
  try {
    const user = await authenticate(request)
    const postId = parseInt(params.id)

    const post = await prisma.communityPost.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return createResponse(null, 'Post not found', 404)
    }

    // Check if user can delete this post
    if (post.author_id !== user.id && !['admin', 'staff'].includes(user.role)) {
      return createResponse(null, 'Access denied', 403)
    }

    // Soft delete
    await prisma.communityPost.update({
      where: { id: postId },
      data: {
        is_active: false,
        updated_at: new Date()
      }
    })

    return createResponse(null, 'Post deleted successfully')

  } catch (error) {
    console.error('Delete community post error:', error)
    return createResponse(null, 'Failed to delete post', 500)
  }
}