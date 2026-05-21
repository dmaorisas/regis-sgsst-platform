import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorage() {
  console.log('🚀 Iniciando configuración de Storage...')

  const buckets = ['pila', 'medical_exams', 'company_documents']

  for (const bucketName of buckets) {
    const { data: _data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: ['application/pdf'],
      fileSizeLimit: 5242880, // 5MB
    })

    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`✅ El bucket "${bucketName}" ya existe.`)
      } else {
        console.error(`❌ Error creando bucket "${bucketName}":`, error.message)
      }
    } else {
      console.log(`🎉 Bucket "${bucketName}" creado exitosamente.`)
    }
  }
}

setupStorage()
