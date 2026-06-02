# Martial App Website Integration Guide

Guia para que una escuela pueda copiar y pegar un formulario de captacion en su web y enviar leads directamente a Martial App.

Fecha: 2026-06-01  
Endpoint: `https://martialapp.com/api/createlead`

## Objetivo

Permitir que cada escuela incluya en su propia web un formulario de clase de prueba, alta de interesado o solicitud de informacion. Cuando el alumno complete el formulario, Martial App recibira los datos, creara el lead/alumno y enviara la invitacion correspondiente.

## Datos que Martial App debe entregar a cada escuela

Cada escuela necesita recibir estos datos desde Martial App:

| Campo | Ejemplo | Descripcion |
|---|---:|---|
| `school_id` | `798` | ID interno de la escuela en Martial App. |
| `language` | `es` | Idioma por defecto para el lead y las comunicaciones. Valores recomendados: `es` o `en`. |
| `endpoint` | `https://martialapp.com/api/createlead` | URL de la API donde se envia el formulario. |
| `academy_name` | `Roger Gracie Malaga` | Nombre visible de la escuela. Opcional si el backend ya lo obtiene desde `school_id`. |

Ejemplo para entregar a una escuela:

```txt
School name: Roger Gracie Malaga
school_id: 798
language: es
endpoint: https://martialapp.com/api/createlead
```

## Payload requerido

El formulario debe enviar un JSON como este:

```json
{
  "school_id": 798,
  "first_name": "Pablo",
  "last_name": "Cabo",
  "email": "pablo@email.com",
  "phone": "+34600000000",
  "gender": "male",
  "register_on": "2026-06-01",
  "dob": "2026-06-01",
  "address": "Malaga",
  "language": "es"
}
```

## Campos del formulario

| Campo | Obligatorio | Ejemplo | Notas |
|---|---|---|---|
| `school_id` | Si | `798` | Lo proporciona Martial App. |
| `first_name` | Si | `Pablo` | Nombre del alumno/interesado. |
| `last_name` | Si | `Cabo` | Apellidos. |
| `email` | Si | `pablo@email.com` | Debe tener formato email valido. |
| `phone` | Recomendado | `+34600000000` | Recomendado para contacto por WhatsApp/telefono. |
| `gender` | Si | `male` | Valores recomendados: `male`, `female`. |
| `register_on` | Si | `2026-06-01` | Fecha de registro en formato `YYYY-MM-DD`. |
| `dob` | Si | `2026-06-01` | Si la web no pregunta fecha de nacimiento, se puede enviar la fecha del dia. |
| `address` | Recomendado | `Malaga` | Ciudad o direccion basica. |
| `language` | Si | `es` | Campo obligatorio. Define idioma de comunicaciones. |

## Codigo listo para copiar y pegar

Este ejemplo funciona en una web normal con HTML y JavaScript. La escuela solo debe cambiar `MARTIAL_APP_SCHOOL_ID`, `MARTIAL_APP_LANGUAGE` y los textos si quiere personalizarlos.

```html
<form id="martialapp-lead-form">
  <label>
    Nombre
    <input name="first_name" placeholder="Nombre" required />
  </label>

  <label>
    Apellidos
    <input name="last_name" placeholder="Apellidos" required />
  </label>

  <label>
    Email
    <input name="email" type="email" placeholder="Email" required />
  </label>

  <label>
    Telefono
    <input name="phone" placeholder="+34 600 000 000" />
  </label>

  <label>
    Genero
    <select name="gender" required>
      <option value="male">Masculino</option>
      <option value="female">Femenino</option>
    </select>
  </label>

  <button type="submit">Reservar clase de prueba</button>

  <p id="martialapp-form-message" aria-live="polite"></p>
</form>

<script>
  const MARTIAL_APP_SCHOOL_ID = 798;
  const MARTIAL_APP_LANGUAGE = "es"; // "es" o "en"
  const MARTIAL_APP_ENDPOINT = "https://martialapp.com/api/createlead";

  document
    .getElementById("martialapp-lead-form")
    .addEventListener("submit", async function (event) {
      event.preventDefault();

      const form = event.target;
      const message = document.getElementById("martialapp-form-message");
      const today = new Date().toISOString().split("T")[0];

      message.textContent = "Enviando solicitud...";

      const payload = {
        school_id: MARTIAL_APP_SCHOOL_ID,
        first_name: form.first_name.value.trim(),
        last_name: form.last_name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        gender: form.gender.value,
        register_on: today,
        dob: today,
        address: "",
        language: MARTIAL_APP_LANGUAGE
      };

      try {
        const response = await fetch(MARTIAL_APP_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success !== false) {
          message.textContent = "Solicitud enviada correctamente. Revisa tu email.";
          form.reset();
        } else {
          message.textContent = "No se pudo enviar la solicitud. Revisa los datos.";
          console.error("Martial App validation error:", result);
        }
      } catch (error) {
        message.textContent = "No se pudo conectar con Martial App. Intentalo de nuevo.";
        console.error("Martial App connection error:", error);
      }
    });
</script>
```

## Version compacta para desarrolladores

```js
const payload = {
  school_id: 798,
  first_name: firstName,
  last_name: lastName,
  email,
  phone,
  gender,
  register_on: new Date().toISOString().split("T")[0],
  dob: new Date().toISOString().split("T")[0],
  address: "",
  language: "es"
};

await fetch("https://martialapp.com/api/createlead", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});
```

## Idioma

El campo `language` es obligatorio.

Valores recomendados:

```txt
es = Espanol
en = Ingles
```

Ejemplos:

```json
{ "language": "es" }
```

```json
{ "language": "en" }
```

Si el campo `language` no se envia, Martial App puede responder:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "language": ["The language field is required."]
  }
}
```

## Respuesta esperada

Una respuesta correcta deberia indicar que el lead se ha creado correctamente. Ejemplo orientativo:

```json
{
  "success": true,
  "message": "Lead created successfully",
  "user_id": 798
}
```

Una respuesta con error de validacion puede tener este formato:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."],
    "language": ["The language field is required."]
  }
}
```

## Recomendacion de producto en Martial App

Crear una seccion dentro del panel:

```txt
Ajustes > Website Integration
```

Contenido recomendado:

1. Nombre de la escuela.
2. `school_id`.
3. Idioma por defecto.
4. Endpoint de produccion.
5. Snippet HTML listo para copiar.
6. Boton "Copiar codigo".
7. Boton "Enviar prueba".
8. Ultimos errores recibidos desde la API, para facilitar soporte.

## Checklist para soporte

Antes de decir que la integracion esta terminada, comprobar:

- La web esta enviando una peticion `POST` a `https://martialapp.com/api/createlead`.
- El header incluye `Content-Type: application/json`.
- El JSON incluye `school_id`.
- El JSON incluye `language`.
- El email tiene formato valido.
- El backend responde `success: true`.
- La escuela recibe el lead dentro de Martial App.
- El alumno recibe la comunicacion en el idioma correcto.

## Notas tecnicas

- No se debe exponer ningun token privado en el codigo de la web.
- El endpoint debe aceptar peticiones desde dominios externos autorizados.
- Martial App deberia validar `school_id` y `language` en backend.
- Para evitar spam, se recomienda anadir rate limiting, captcha o validacion por dominio si el formulario se usa publicamente.
- Si una escuela usa WordPress, Webflow, Wix o Shopify, este snippet se puede pegar normalmente en un bloque HTML personalizado.

