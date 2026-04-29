# Backup Automático — Especificación

**Propósito:** Garantizar que el trabajo del proyecto nunca se pierde aunque falle Supabase, GitHub o el host de n8n.

---

## Estrategia de 3 capas

### Capa 1: Backup local diario (n8n cron)

Cada día a las 03:00 hora Colombia, un workflow de n8n ejecuta:

```
1. Dump completo de Supabase Postgres
   pg_dump $SUPABASE_DB_URL > backup_$(date +%Y%m%d).sql

2. Snapshot de Supabase Storage
   tar -czf storage_$(date +%Y%m%d).tar.gz /supabase-storage/

3. Zip del repo Git (incluye .git)
   tar -czf repo_$(date +%Y%m%d).tar.gz /path/to/repo/

4. Combinar en un solo archivo
   tar -czf backup_full_$(date +%Y%m%d).tar.gz \
     backup_*.sql storage_*.tar.gz repo_*.tar.gz

5. Subir a Google Drive personal del supervisor
   carpeta: /backups-regis-concurso/

6. Verificar integridad (hash sha256, comparar tamaño esperado)

7. Notificar al supervisor solo si falla
```

### Capa 2: Backup incremental cada 6 horas

Cada 6 horas (00:00, 06:00, 12:00, 18:00 Colombia):

```
1. Dump incremental Supabase (solo cambios desde último backup)
2. Subir a /backups-regis-concurso/incremental/
3. Mantener últimos 14 backups, eliminar más viejos
```

### Capa 3: Push continuo a GitHub

Cada vez que el Operador hace commit:
- Commit local
- Push a GitHub remoto
- GitHub actúa como segundo origen

Esto garantiza que aunque el repo local se pierda, todo el código está en GitHub.

---

## Workflow de n8n (definición exportable)

```json
{
  "name": "regis_backup_daily",
  "trigger": "cron",
  "schedule": "0 3 * * *",
  "timezone": "America/Bogota",
  "steps": [
    {
      "name": "dump_postgres",
      "type": "bash",
      "command": "pg_dump $SUPABASE_DB_URL > /tmp/db_$(date +%Y%m%d).sql"
    },
    {
      "name": "verify_dump",
      "type": "bash",
      "command": "test -s /tmp/db_$(date +%Y%m%d).sql && echo OK || exit 1"
    },
    {
      "name": "compress",
      "type": "bash",
      "command": "tar -czf /tmp/backup_$(date +%Y%m%d).tar.gz /tmp/db_$(date +%Y%m%d).sql /repo /supabase-storage"
    },
    {
      "name": "upload_to_drive",
      "type": "google_drive",
      "operation": "upload",
      "folder_id": "DRIVE_BACKUP_FOLDER_ID",
      "file": "/tmp/backup_$(date +%Y%m%d).tar.gz"
    },
    {
      "name": "verify_upload",
      "type": "google_drive",
      "operation": "list",
      "filter": "name=backup_$(date +%Y%m%d).tar.gz"
    },
    {
      "name": "cleanup_local",
      "type": "bash",
      "command": "rm /tmp/db_*.sql /tmp/backup_*.tar.gz"
    },
    {
      "name": "rotate_old_backups",
      "type": "google_drive",
      "operation": "delete",
      "filter": "older_than:14d AND folder_id=DRIVE_BACKUP_FOLDER_ID"
    }
  ],
  "on_failure": [
    {
      "type": "send_email",
      "to": "maori.david@dmaori.com",
      "subject": "[REGIS] Backup diario FALLÓ"
    }
  ]
}
```

---

## Restauración (procedimiento)

Si necesitamos restaurar:

1. **De GitHub:**
   ```bash
   git clone <repo>
   ```

2. **De backup en Drive:**
   ```bash
   # Descargar backup más reciente
   gdrive download <file_id>
   tar -xzf backup_YYYYMMDD.tar.gz
   ```

3. **Restaurar Postgres:**
   ```bash
   psql $SUPABASE_DB_URL < db_YYYYMMDD.sql
   ```

4. **Restaurar Storage:**
   ```bash
   # subir archivos al bucket vía Supabase CLI
   supabase storage cp -r storage_YYYYMMDD/ remote://
   ```

---

## Verificación periódica

Cada lunes a las 09:00 (durante el concurso solo será 1 vez):
- Test de restauración a entorno staging
- Verificar que todos los datos están íntegros
- Email confirmación al supervisor

---

## Costo

- Drive personal: ya pagado (sin costo extra para concurso)
- n8n self-hosted: ya pagado
- Tiempo: ~10 min por backup

**Costo total backup durante concurso: $0.**
