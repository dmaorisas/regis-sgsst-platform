import { connect, ImapSimpleOptions } from 'imap-simple'
import { simpleParser } from 'mailparser'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const emailUser = process.env.OUTLOOK_EMAIL
const emailPassword = process.env.OUTLOOK_PASSWORD

if (!supabaseUrl || !supabaseServiceKey || !emailUser || !emailPassword) {
  console.error('❌ Faltan variables de entorno en .env.local para el watcher.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const config: ImapSimpleOptions = {
  imap: {
    user: emailUser,
    password: emailPassword,
    host: 'outlook.office365.com',
    port: 993,
    tls: true,
    authTimeout: 5000,
    tlsOptions: { rejectUnauthorized: false },
  },
}

console.log('📬 Iniciando Watcher de Outlook para PILA...')
console.log(`📧 Vigilando bandeja de entrada: ${emailUser}`)

async function processUnreadEmails() {
  let connection
  try {
    connection = await connect(config)
    await connection.openBox('INBOX')

    // Buscar correos no leídos (UNSEEN)
    const searchCriteria = ['UNSEEN']
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false, // No marcarlos como leídos todavía hasta procesarlos
    }

    const messages = await connection.search(searchCriteria, fetchOptions)

    if (messages.length === 0) {
      connection.end()
      return
    }

    console.log(`📩 Se encontraron ${messages.length} correos no leídos.`)

    for (const message of messages) {
      const all = message.parts.find((part) => part.which === '')
      if (!all) continue

      const parsed = await simpleParser(all.body)
      const sender = parsed.from?.value[0]?.address

      if (!sender) {
        console.log('⚠️ Correo sin remitente válido. Ignorando.')
        continue
      }

      console.log(`📧 Procesando correo de: ${sender} - Asunto: "${parsed.subject}"`)

      // Buscar el archivo PILA adjunto (PDF)
      const pdfAttachment = parsed.attachments?.find(
        (att) =>
          att.contentType === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf'),
      )

      if (!pdfAttachment) {
        console.log(
          '❌ El correo no contiene ningún archivo PDF adjunto. Marcando como leído y continuando.',
        )
        // Marcar como leído para no procesar de nuevo
        await connection.addFlags(message.attributes.uid, 'SEEN')
        continue
      }

      console.log(`📎 Adjunto PDF encontrado: ${pdfAttachment.filename}`)

      // Buscar a qué compañía pertenece el remitente
      // Buscamos en user_company_role vinculando al usuario por su email
      const { data: userRoles, error: queryError } = await supabase
        .from('user_company_role')
        .select(
          `
          company_id,
          users!inner (
            email
          )
        `,
        )
        .eq('users.email', sender.toLowerCase())
        .eq('is_active', true)
        .is('revoked_at', null)
        .not('company_id', 'is', null)

      if (queryError || !userRoles || userRoles.length === 0) {
        // En caso de que no esté en la base de datos de usuarios de prueba,
        // intentamos mapear correos genéricos o usaremos Empresa 1 como fallback para la demo en vivo
        console.log(
          `⚠️ Remitente ${sender} no registrado en el SG-SST. Usando 'Empresa 1' por defecto para fines de la Demo en vivo.`,
        )
      }

      // Obtener el ID de la empresa (o fallback a Empresa 1)
      let companyId = userRoles?.[0]?.company_id

      if (!companyId) {
        const { data: fallbackCompany } = await supabase
          .from('companies')
          .select('id')
          .limit(1)
          .single()
        companyId = fallbackCompany?.id
      }

      if (!companyId) {
        console.error('❌ No se encontró ninguna empresa en la base de datos.')
        continue
      }

      console.log(`🏢 Empresa identificada ID: ${companyId}`)

      // Crear FormData y llamar al Webhook
      const formData = new FormData()
      formData.append('company_id', companyId)

      const blob = new Blob([pdfAttachment.content], { type: 'application/pdf' })
      formData.append('file', blob, pdfAttachment.filename || 'PILA.pdf')

      console.log('🚀 Enviando PILA al Webhook /api/webhooks/pila-received...')
      const response = await fetch('http://localhost:3000/api/webhooks/pila-received', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Webhook procesado con éxito:', result.message)

        // Marcar el correo como leído en Outlook
        await connection.addFlags(message.attributes.uid, 'SEEN')
        console.log('👁️ Correo marcado como leído.')
      } else {
        const errText = await response.text()
        console.error('❌ Error al llamar al Webhook:', errText)
      }
    }

    connection.end()
  } catch (error) {
    console.error('❌ Error en el Watcher de IMAP:', error)
    if (connection) connection.end()
  }
}

// Polling cada 10 segundos
setInterval(processUnreadEmails, 10000)

// Ejecutar inmediatamente al iniciar
processUnreadEmails()
