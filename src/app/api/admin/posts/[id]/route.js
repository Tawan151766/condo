import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// PUT /api/admin/posts/{id} - Update post status (Admin)
export async function PUT(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin', 'staff'])(user)

    const postId = parseInt(params.id)
    const body = await request.json()
    const { status, reason } = body

    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!post) {
      return createResponse(null, 'Post not found', 404)
    }

    const updatedPost = await prisma.communityPost.update({
      where: { id: postId },
      data: {
        status: status || post.status,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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

    // TODO: Send notification to user if post was hidden/deleted
    // if (status === 'hidden' || status === 'deleted') {
    //   await createNotification({
    //     userId: post.userId,
    //     title: 'โพสต์ของคุณถูกดำเนินการ',
    //     message: `โพสต์ "${post.title}" ถูก${status === 'hidden' ? 'ซ่อน' : 'ลบ'}${reason ? ` เหตุผล: ${reason}` : ''}`,
    //     type: 'system'
    //   })
    // }

    return createResponse(updatedPost, 'Post updated successfully')

  } catch (error) {
    console.error('Update admin post error:', error)
    return createResponse(null, 'Failed to update post', 500)
  }
}

// DELETE /api/admin/posts/{id} - Delete post (Admin)
export async function DELETE(request, { params }) {
  try {
    const user = await authenticate(request)
    authorize(['admin'])(user)

    const postId = parseInt(params.id)

    const post = await prisma.communityPost.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return createResponse(null, 'Post not found', 404)
    }

    // Soft delete
    await prisma.communityPost.update({
      where: { id: postId },
      data: {
        status: 'deleted',
        updatedAt: new Date()
      }
    })

    return createResponse(null, 'Post deleted successfully')

  } catch (error) {
    console.error('Delete admin post error:', error)
    return createResponse(null, 'Failed to delete post', 500)
  }
}