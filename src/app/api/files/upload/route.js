import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth'
import { createResponse } from '@/lib/response'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// POST /api/files/upload - General file upload
export async function POST(request) {
  try {
    const user = await authenticate(request)
    
    const formData = await request.formData()
    const file = formData.get('file')
    const uploadType = formData.get('type') || 'general'
    
    if (!file) {
      return createResponse(null, 'No file provided', 400)
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return createResponse(null, 'File size exceeds 10MB limit', 400)
    }

    // Validate file type
    const allowedTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      general: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    }

    const validTypes = allowedTypes[uploadType] || allowedTypes.general
    if (!validTypes.includes(file.type)) {
      return createResponse(null, `Invalid file type. Allowed types: ${validTypes.join(', ')}`, 400)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${fileExtension}`
    
    // Create upload directory structure
    const uploadDir = join(process.cwd(), 'public', 'uploads', uploadType)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file
    const filePath = join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Mock file record (in real app, save to database)
    const fileRecord = {
      id: timestamp,
      original_name: file.name,
      file_name: fileName,
      file_path: `/uploads/${uploadType}/${fileName}`,
      file_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/uploads/${uploadType}/${fileName}`,
      file_size: file.size,
      file_type: file.type,
      upload_type: uploadType,
      uploaded_by: user.id,
      created_at: new Date().toISOString()
    }

    return createResponse(fileRecord, 'File uploaded successfully', 201)

  } catch (error) {
    console.error('File upload error:', error)
    return createResponse(null, 'Failed to upload file', 500)
  }
}