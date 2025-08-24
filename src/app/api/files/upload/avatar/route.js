import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth'
import { createResponse } from '@/lib/response'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// POST /api/files/upload/avatar - Avatar upload
export async function POST(request) {
  try {
    const user = await authenticate(request)
    
    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file) {
      return createResponse(null, 'No file provided', 400)
    }

    // Validate file size (2MB limit for avatars)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return createResponse(null, 'File size exceeds 2MB limit', 400)
    }

    // Validate file type (only images)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return createResponse(null, `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `avatar_${user.id}_${timestamp}.${fileExtension}`
    
    // Create upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file
    const filePath = join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Update user profile image
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        profileImage: `/uploads/avatars/${fileName}`
      },
      select: {
        id: true,
        profileImage: true
      }
    })

    const fileRecord = {
      id: timestamp,
      original_name: file.name,
      file_name: fileName,
      file_path: `/uploads/avatars/${fileName}`,
      file_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/uploads/avatars/${fileName}`,
      file_size: file.size,
      file_type: file.type,
      upload_type: 'avatar',
      uploaded_by: user.id,
      created_at: new Date().toISOString()
    }

    return createResponse({
      ...fileRecord,
      user: updatedUser
    }, 'Avatar uploaded successfully', 201)

  } catch (error) {
    console.error('Avatar upload error:', error)
    return createResponse(null, 'Failed to upload avatar', 500)
  }
}