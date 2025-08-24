import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '@/lib/auth'
import { createResponse } from '@/lib/response'

const prisma = new PrismaClient()

// POST /api/community/posts/{id}/like - Like/unlike post
export async function POST(request, { params }) {
  try {
    const user = await authenticate(request)
    const postId = parseInt(params.id)

    const post = await prisma.communityPost.findUnique({
      where: { id: postId }
    })

    if (!post || !post.is_active) {
      return createResponse(null, 'Post not found', 404)
    }

    // Check if user already liked this post
    const existingLike = await prisma.postLike.findUnique({
      where: {
        user_id_post_id: {
          user_id: user.id,
          post_id: postId
        }
      }
    })

    let action = ''
    let likesCount = 0

    if (existingLike) {
      // Unlike the post
      await prisma.postLike.delete({
        where: { id: existingLike.id }
      })
      
      await prisma.communityPost.update({
        where: { id: postId },
        data: { likes_count: { decrement: 1 } }
      })
      
      action = 'unliked'
      likesCount = post.likes_count - 1
    } else {
      // Like the post
      await prisma.postLike.create({
        data: {
          user_id: user.id,
          post_id: postId
        }
      })
      
      await prisma.communityPost.update({
        where: { id: postId },
        data: { likes_count: { increment: 1 } }
      })
      
      action = 'liked'
      likesCount = post.likes_count + 1
    }

    return createResponse({
      action,
      likes_count: likesCount,
      is_liked: action === 'liked'
    }, `Post ${action} successfully`)

  } catch (error) {
    console.error('Like/unlike post error:', error)
    return createResponse(null, 'Failed to like/unlike post', 500)
  }
}