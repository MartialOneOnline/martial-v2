# Runbook — recuperar la campaña «Libre — 20/11/2026» (Roger Gracie Málaga)

**Estado: preparado, NO ejecutado.** Se autoriza después de aprobar y desplegar el Lote AE.

Campaña: asunto «🥋 Graduación Roger Gracie Málaga - Sábado 19 de diciembre», 49 destinatarios, 24 `SENT`, 25 `FAILED`, estado `COMPLETED`. Los fallos vienen del 429 de Resend («You have exceeded the rate limit, which is 10 requests per second.»), según los logs que aportó el usuario.

Script: [`scripts/recover-campaign-rate-limited.ts`](../scripts/recover-campaign-rate-limited.ts). Lógica pura en `apps/web/lib/campaignRecovery.ts` (tests en `campaignDeliveryUnits.test.ts`).

## Qué hace y qué no

- Por defecto solo lee (dry-run). Con `--apply` solo cambia filas `FAILED` de esta campaña con motivo de rate limit confirmado y sin `resendEmailId` → `PENDING` (intentos a 0, clave de idempotencia nueva: el 429 confirma que Resend no aceptó ese correo). Recalcula `sentCount`/`failedCount` desde las filas y, si quedan pendientes, pasa la campaña de `COMPLETED` a `SENDING`.
- **No envía nada.** El envío lo hace después el camino normal: botón «Continuar envío» en la ficha de la campaña, o el cron `campaign-send`. Va regulado e idempotente.
- No toca las 24 `SENT`. No crea otra campaña: reutiliza los destinatarios.
- No recupera los `FAILED` por otros motivos (cupo, red/desconocido, validación). Los lista para que una persona los revise.
- Comprobaciones: la escuela por slug y la campaña por nombre tienen que coincidir con una sola fila; los recuentos se comparan con `--expect-*`; todos los destinatarios tienen que ser de esa escuela. Si algo no cuadra, aborta sin escribir.
- Con `--check-resend` lee el registro de envíos de Resend (`GET /emails`, solo lectura, 1 página cada 600 ms) desde 1 h antes del envío. Si encuentra un correo al mismo destinatario con el mismo asunto, ese destinatario no se reencola: hay evidencia de aceptación. Resend guarda los correos 30 días, así que esto hay que hacerlo **antes del ~20/12/2026**.
- Es idempotente: al repetirlo, las filas ya reencoladas dejan de ser `FAILED`, y `--expect-failed=25` aborta sin escribir. Sin ese flag, el plan sale vacío y solo recalcula contadores, que dan el mismo resultado.

## Requisitos

- La migración `20261124120000_campaign_reliable_delivery` aplicada y el código desplegado. El dry-run funciona sin la migración; `--apply` no.
- `DATABASE_URL` de producción y `RESEND_API_KEY` (para `--check-resend`), con autorización del usuario para leerlos.

## Pasos

```bash
# 1. Dry-run: identifica la campaña, agrupa los 25 FAILED por motivo y busca evidencia en Resend
npx tsx scripts/recover-campaign-rate-limited.ts --school-slug=roger-gracie-malaga \
  --campaign-name="Libre — 20/11/2026" --expect-total=49 --expect-sent=24 --expect-failed=25 --check-resend
```

Revisa la salida: id de escuela y campaña, `FAILED by reason`, filas excluidas por evidencia y «Would requeue N». Si el slug o el nombre no coinciden (por ejemplo, otro guion o espacios), usa el `--campaign-id` correcto.

```bash
# 2. Aplicar (tras autorización explícita), con el id que imprimió el dry-run
npx tsx scripts/recover-campaign-rate-limited.ts --campaign-id=<id> \
  --expect-total=49 --expect-sent=24 --expect-failed=25 --check-resend --apply
```

3. Abre la campaña en el dashboard y pulsa «Continuar envío», o espera al cron (09:00 UTC). Con el plan gratuito (100/día) quedan disponibles los envíos que no hayan consumido otros correos ese día. Si se agota el cupo, la campaña queda «en espera» con el motivo y sigue tras las 00:00 UTC.
4. Comprueba el resultado: 49 = SENT + FAILED + Sin confirmar, y ningún pendiente. Las 24 originales siguen con su `sentAt`/`resendEmailId`.

## Qué no se ha podido comprobar

No se ha accedido a los datos de producción en esta sesión. No se conocen todavía:

- los `failedReason` reales de los 25 (podría haber alguno de red o de cupo);
- si Resend tiene registro de alguno de ellos;
- el slug exacto de la escuela.

Todo eso lo responde el dry-run.
