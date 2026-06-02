from html import escape
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "website-integration-guide.docx"


def r(text, bold=False, italic=False, code=False):
    props = []
    if bold:
        props.append("<w:b/>")
    if italic:
        props.append("<w:i/>")
    if code:
        props.append('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>')
        props.append('<w:sz w:val="20"/>')
    rpr = f"<w:rPr>{''.join(props)}</w:rPr>" if props else ""
    return f'<w:r>{rpr}<w:t xml:space="preserve">{escape(text)}</w:t></w:r>'


def p(text="", style=None, runs=None):
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    body = "".join(runs) if runs is not None else r(text)
    return f"<w:p>{ppr}{body}</w:p>"


def bullet(text):
    return p(text, "Bullet")


def code_block(text):
    lines = text.rstrip().splitlines()
    return "".join(p(line, "CodeBlock", [r(line, code=True)]) for line in lines)


def table(headers, rows):
    grid = "".join('<w:gridCol w:w="2300"/>' for _ in headers)
    out = [
        '<w:tbl>',
        '<w:tblPr><w:tblW w:w="9360" w:type="dxa"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="D1D5DB"/>'
        '<w:left w:val="single" w:sz="4" w:color="D1D5DB"/>'
        '<w:bottom w:val="single" w:sz="4" w:color="D1D5DB"/>'
        '<w:right w:val="single" w:sz="4" w:color="D1D5DB"/>'
        '<w:insideH w:val="single" w:sz="4" w:color="D1D5DB"/>'
        '<w:insideV w:val="single" w:sz="4" w:color="D1D5DB"/></w:tblBorders></w:tblPr>',
        f"<w:tblGrid>{grid}</w:tblGrid>",
        "<w:tr>",
    ]
    for header in headers:
        out.append(
            '<w:tc><w:tcPr><w:shd w:fill="F3F4F6"/>'
            '<w:tcW w:w="2300" w:type="dxa"/></w:tcPr>'
            f'{p(header, runs=[r(header, bold=True)])}</w:tc>'
        )
    out.append("</w:tr>")
    for row in rows:
        out.append("<w:tr>")
        for cell in row:
            out.append(
                '<w:tc><w:tcPr><w:tcW w:w="2300" w:type="dxa"/></w:tcPr>'
                f"{p(str(cell))}</w:tc>"
            )
        out.append("</w:tr>")
    out.append("</w:tbl>")
    return "".join(out)


def document_xml():
    content = []
    content.append(p("Martial App Website Integration Guide", "Title"))
    content.append(
        p(
            "Guia para que una escuela pueda copiar y pegar un formulario de captacion en su web y enviar leads directamente a Martial App.",
            "Subtitle",
        )
    )
    content.append(p("Fecha: 2026-06-01", "Meta"))
    content.append(p("Endpoint: https://martialapp.com/api/createlead", "Meta"))

    content.append(p("Objetivo", "Heading1"))
    content.append(
        p(
            "Permitir que cada escuela incluya en su propia web un formulario de clase de prueba, alta de interesado o solicitud de informacion. Cuando el alumno complete el formulario, Martial App recibira los datos, creara el lead/alumno y enviara la invitacion correspondiente."
        )
    )

    content.append(p("Datos que Martial App debe entregar a cada escuela", "Heading1"))
    content.append(p("Cada escuela necesita recibir estos datos desde Martial App:"))
    content.append(
        table(
            ["Campo", "Ejemplo", "Descripcion"],
            [
                ["school_id", "798", "ID interno de la escuela en Martial App."],
                ["language", "es", "Idioma por defecto para el lead y las comunicaciones. Valores recomendados: es o en."],
                ["endpoint", "https://martialapp.com/api/createlead", "URL de la API donde se envia el formulario."],
                ["academy_name", "Roger Gracie Malaga", "Nombre visible de la escuela. Opcional si el backend ya lo obtiene desde school_id."],
            ],
        )
    )
    content.append(p("Ejemplo para entregar a una escuela:", "Heading2"))
    content.append(
        code_block(
            """School name: Roger Gracie Malaga
school_id: 798
language: es
endpoint: https://martialapp.com/api/createlead"""
        )
    )

    content.append(p("Payload requerido", "Heading1"))
    content.append(p("El formulario debe enviar un JSON como este:"))
    content.append(
        code_block(
            """{
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
}"""
        )
    )

    content.append(p("Campos del formulario", "Heading1"))
    content.append(
        table(
            ["Campo", "Obligatorio", "Ejemplo", "Notas"],
            [
                ["school_id", "Si", "798", "Lo proporciona Martial App."],
                ["first_name", "Si", "Pablo", "Nombre del alumno/interesado."],
                ["last_name", "Si", "Cabo", "Apellidos."],
                ["email", "Si", "pablo@email.com", "Debe tener formato email valido."],
                ["phone", "Recomendado", "+34600000000", "Recomendado para contacto por WhatsApp/telefono."],
                ["gender", "Si", "male", "Valores recomendados: male, female."],
                ["register_on", "Si", "2026-06-01", "Fecha de registro en formato YYYY-MM-DD."],
                ["dob", "Si", "2026-06-01", "Si la web no pregunta fecha de nacimiento, se puede enviar la fecha del dia."],
                ["address", "Recomendado", "Malaga", "Ciudad o direccion basica."],
                ["language", "Si", "es", "Campo obligatorio. Define idioma de comunicaciones."],
            ],
        )
    )

    content.append(p("Codigo listo para copiar y pegar", "Heading1"))
    content.append(
        p(
            "Este ejemplo funciona en una web normal con HTML y JavaScript. La escuela solo debe cambiar MARTIAL_APP_SCHOOL_ID, MARTIAL_APP_LANGUAGE y los textos si quiere personalizarlos."
        )
    )
    content.append(
        code_block(
            """<form id="martialapp-lead-form">
  <label>Nombre <input name="first_name" placeholder="Nombre" required /></label>
  <label>Apellidos <input name="last_name" placeholder="Apellidos" required /></label>
  <label>Email <input name="email" type="email" placeholder="Email" required /></label>
  <label>Telefono <input name="phone" placeholder="+34 600 000 000" /></label>
  <label>Genero
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
  const MARTIAL_APP_LANGUAGE = "es";
  const MARTIAL_APP_ENDPOINT = "https://martialapp.com/api/createlead";

  document.getElementById("martialapp-lead-form").addEventListener("submit", async function (event) {
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
        headers: { "Content-Type": "application/json" },
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
</script>"""
        )
    )

    content.append(p("Version compacta para desarrolladores", "Heading1"))
    content.append(
        code_block(
            """const payload = {
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
});"""
        )
    )

    content.append(p("Idioma", "Heading1"))
    content.append(p("El campo language es obligatorio. Valores recomendados:"))
    content.append(bullet("es = Espanol"))
    content.append(bullet("en = Ingles"))
    content.append(p("Si el campo language no se envia, Martial App puede responder:"))
    content.append(
        code_block(
            """{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "language": ["The language field is required."]
  }
}"""
        )
    )

    content.append(p("Respuesta esperada", "Heading1"))
    content.append(p("Una respuesta correcta deberia indicar que el lead se ha creado correctamente:"))
    content.append(
        code_block(
            """{
  "success": true,
  "message": "Lead created successfully",
  "user_id": 798
}"""
        )
    )
    content.append(p("Una respuesta con error de validacion puede tener este formato:"))
    content.append(
        code_block(
            """{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."],
    "language": ["The language field is required."]
  }
}"""
        )
    )

    content.append(p("Recomendacion de producto en Martial App", "Heading1"))
    content.append(p("Crear una seccion dentro del panel:"))
    content.append(code_block("Ajustes > Website Integration"))
    for item in [
        "Nombre de la escuela.",
        "school_id.",
        "Idioma por defecto.",
        "Endpoint de produccion.",
        "Snippet HTML listo para copiar.",
        "Boton Copiar codigo.",
        "Boton Enviar prueba.",
        "Ultimos errores recibidos desde la API, para facilitar soporte.",
    ]:
        content.append(bullet(item))

    content.append(p("Checklist para soporte", "Heading1"))
    for item in [
        "La web esta enviando una peticion POST a https://martialapp.com/api/createlead.",
        "El header incluye Content-Type: application/json.",
        "El JSON incluye school_id.",
        "El JSON incluye language.",
        "El email tiene formato valido.",
        "El backend responde success: true.",
        "La escuela recibe el lead dentro de Martial App.",
        "El alumno recibe la comunicacion en el idioma correcto.",
    ]:
        content.append(bullet(item))

    content.append(p("Notas tecnicas", "Heading1"))
    for item in [
        "No se debe exponer ningun token privado en el codigo de la web.",
        "El endpoint debe aceptar peticiones desde dominios externos autorizados.",
        "Martial App deberia validar school_id y language en backend.",
        "Para evitar spam, se recomienda anadir rate limiting, captcha o validacion por dominio si el formulario se usa publicamente.",
        "Si una escuela usa WordPress, Webflow, Wix o Shopify, este snippet se puede pegar normalmente en un bloque HTML personalizado.",
    ]:
        content.append(bullet(item))

    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {''.join(content)}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>'''


STYLES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:after="120"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="52"/><w:color w:val="111827"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:after="240"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:color w:val="4B5563"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Meta">
    <w:name w:val="Meta"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:after="80"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/><w:color w:val="4B5563"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="32"/><w:color w:val="111827"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="240" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="26"/><w:color w:val="111827"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Bullet">
    <w:name w:val="Bullet"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:ind w:left="480" w:hanging="240"/><w:spacing w:after="80"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="CodeBlock">
    <w:name w:val="Code Block"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:shd w:fill="F3F4F6"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/></w:rPr>
  </w:style>
</w:styles>'''


CONTENT_TYPES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>'''


RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''


DOC_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUT, "w", ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES)
        zf.writestr("_rels/.rels", RELS)
        zf.writestr("word/_rels/document.xml.rels", DOC_RELS)
        zf.writestr("word/document.xml", document_xml())
        zf.writestr("word/styles.xml", STYLES)
    print(OUT)


if __name__ == "__main__":
    main()
