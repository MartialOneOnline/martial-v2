# Entorno de integración aislado — Lote AF (PR #77)

Pendientes de integración de la reauditoría de Codex sobre `c488720`:

1. Probar el advisory lock de `recordFlaggedPayment` contra un PostgreSQL real y aislado.
2. Recorrer en navegador la compra, la recuperación multiescuela y Stripe en modo test con webhook.

Nada de esto toca producción ni los planes de RGM. El PR sigue abierto hasta cubrirlos o hasta que el usuario acepte el riesgo.

## 1. PostgreSQL aislado: qué hay y qué haría falta

En la máquina de desarrollo (comprobado el 2026-11-27):

- No hay PostgreSQL, Docker, OrbStack ni Postgres.app.
- **PGlite** (`@electric-sql/pglite`) ya está en `node_modules`, pero no sirve aquí. Es un único proceso de Postgres en WASM, así que no puede haber dos transacciones concurrentes reales, y eso es justo lo que hay que probar.

Opciones, de más a menos recomendable:

| Opción | Qué instala | Sirve para |
|---|---|---|
| **A. Proyecto Supabase de pruebas aparte** (plan Free) | Nada en la máquina. Lo crea el usuario en supabase.com y me pasa la cadena de conexión directa (puerto 5432). | Punto 1 **y** punto 2: el mismo proyecto da base de datos y Auth. |
| **B. `embedded-postgres` temporal** | El paquete npm `embedded-postgres` y los binarios oficiales de PostgreSQL para macOS arm64 (decenas de MB), en una carpeta temporal fuera del repo. No se instala nada global y basta con borrar la carpeta. | Solo el punto 1. |
| C. Instalación permanente | Postgres.app o `brew install postgresql@17`. | Punto 1 (y desarrollo local en general). |

B y C descargan software: solo con el OK explícito del usuario.

### Ejecutar el test del lock

Test: `apps/web/__tests__/integration/flaggedPaymentLock.pg.test.ts`. Se omite si no se define `TEST_DATABASE_URL`, y se niega a ejecutarse en cualquiera de estos casos:

- la URL coincide con `DATABASE_URL` o `DIRECT_URL`;
- el host no es local y no se ha definido `TEST_DATABASE_ISOLATED=yes`;
- la base contiene alguna escuela (una base de pruebas recién migrada no tiene ninguna; producción sí).

```bash
# desde la raíz del repo: aplicar migraciones a la base de PRUEBAS
DIRECT_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
```

```bash
# desde apps/web
TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_DATABASE_ISOLATED=yes npx vitest run __tests__/integration
```

Usar la conexión **directa** (5432), no el pooler en modo transacción.

Qué comprueba, con dos conexiones reales:

- **Misma factura:** la segunda transacción espera a que la primera confirme (≈1,5 s) y no inserta nada. Queda una sola fila FLAGGED.
- **Control sin lock:** la misma secuencia sin el lock inserta dos filas, así que la carrera existe y el test la detecta.
- **Facturas distintas:** no se bloquean entre sí.
- **Rollback:** si la primera transacción se revierte, libera el lock y la segunda registra el pago.

Solo crea un usuario y unas filas marcadas con un id de ejecución, y los borra al terminar.

## 2. Stripe en modo test con webhook: pasos mínimos

No usar el Preview de Vercel para esto: sus variables de entorno son compartidas entre previews y apuntar una a la base de pruebas afectaría a las demás. El recorrido se hace en local contra el proyecto de la opción A.

1. **Base y Auth de pruebas.**
   - Crear el proyecto Supabase de pruebas.
   - Aplicar las migraciones (comando de arriba).
   - Habilitar login por email en Auth.
2. **`apps/web/.env.local` apuntando a ese proyecto.** Variables: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Nunca las de producción; el archivo no se sube (está en `.gitignore`).
3. **Cuenta de Stripe en modo test**, con clave `sk_test_…`. Nunca `sk_live_`.
4. **Datos de prueba en la base de pruebas**, creados desde el dashboard local:
   - una escuela con `stripeSecretKey = sk_test_…`;
   - una clase publicada con horario;
   - un pase de 7 días y uno de 1 día, públicos y con STRIPE;
   - una suscripción mensual con STRIPE;
   - una segunda escuela para el caso multiescuela.
5. **Webhook.**
   - Instalar la Stripe CLI. Esto requiere OK: `brew install stripe/stripe-cli/stripe` o el binario de GitHub.
   - Ejecutar `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
   - Copiar el `whsec_…` que imprime en `stripeWebhookSecret` de la escuela de prueba.
   - El endpoint verifica la firma con el secreto de la escuela que indica la metadata.
6. Arrancar con `npm run dev` y pagar con la tarjeta de prueba publicada por Stripe (`4242 4242 4242 4242`).

### Recorrido a comprobar

- [ ] Pase de 7 días desde el modal de clase: hoja con condiciones y «no reserva», Stripe, `/checkout/return`, «activa», «Ir a Mis clases» abre esa escuela.
- [ ] El pase de 1 día no aparece para una clase posterior a su vigencia.
- [ ] Suscripción: se activa por `stripeSubId`.
- [ ] Cancelar en Stripe muestra «has salido del pago» y no promete nada.
- [ ] Multiescuela: con la escuela A seleccionada, comprar en B y que «Mis clases» abra B.
- [ ] Fallo del cambio de escuela (bloquear `POST /api/auth/context/select` en DevTools): «Reintentar» repite la selección y solo navega tras confirmarla.
- [ ] Archivado entre el checkout y el webhook:
  - parar `stripe listen` y pagar;
  - archivar al alumno;
  - reanudar y ejecutar `stripe events resend <evt_…>`.

  Resultado esperado: FLAGGED y «la escuela tiene que revisarlo». Probarlo con un pase y con una suscripción (AF-2).
- [ ] Membresía pausada con suscripción: aviso y casilla obligatoria; tras pagar, la escuela recibe el aviso una sola vez.
- [ ] Plan con `validityDays = 0`: «Contacta con la escuela»; el checkout responde `plan_misconfigured`.

## Fuera de alcance

- Producción (`martialapp.com` y su base de datos).
- Métodos de pago y acceso a clases de los planes de RGM. Antes de habilitar pagos en el Pase 1 Día, la Clase Privada y el Infantil hay que revisar para qué es cada plan y a qué clases da acceso (la Clase Privada da acceso a grupos y el Infantil no restringe nada). Se revisará por separado.
