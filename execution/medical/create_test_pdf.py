"""
Genera un PDF de prueba que simula un examen médico ocupacional.
Solo para testing del pipeline.
"""

import os
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Instalar PyMuPDF: pip install pymupdf")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "..", "..", ".tmp", "test_inputs")


def create_test_exam_pdf():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, "examen_prueba_carlos_martinez.pdf")

    doc = fitz.open()

    # --- Página 1 ---
    page = doc.new_page(width=612, height=792)

    y = 50
    page.insert_text((50, y), "CENTRO MÉDICO OCUPACIONAL DEL VALLE", fontsize=14, fontname="helv")
    y += 20
    page.insert_text((50, y), "NIT: 900.123.456-7 | Tel: (602) 555-1234", fontsize=9, fontname="helv")
    y += 15
    page.insert_text((50, y), "Calle 10 #23-45, Cali, Valle del Cauca", fontsize=9, fontname="helv")

    y += 35
    page.insert_text((180, y), "EXAMEN MÉDICO OCUPACIONAL", fontsize=13, fontname="helv")
    y += 15
    page.insert_text((200, y), "Tipo: Periódico", fontsize=10, fontname="helv")

    y += 35
    page.insert_text((50, y), "═" * 70, fontsize=8, fontname="helv")
    y += 15
    page.insert_text((50, y), "DATOS DEL TRABAJADOR", fontsize=11, fontname="helv")
    y += 5
    page.insert_text((50, y + 12), "─" * 70, fontsize=8, fontname="helv")

    data_lines = [
        "Fecha del examen:        15 de marzo de 2026",
        "Nombre completo:         CARLOS ANDRÉS MARTÍNEZ LÓPEZ",
        "Documento de identidad:  1.098.765.432",
        "Fecha de nacimiento:     22 de julio de 1985",
        "Edad:                    40 años",
        "Peso:                    82 kg",
        "Talla:                   1.75 m",
        "IMC:                     26.8 (Sobrepeso)",
        "EPS:                     NUEVA EPS",
        "Cargo:                   Coordinador de Seguridad y Salud en el Trabajo",
        "Empresa:                 REGIS COLOMBIA S.A.S.",
        "En tratamiento médico:   SI",
    ]

    y += 30
    for line in data_lines:
        page.insert_text((50, y), line, fontsize=9, fontname="helv")
        y += 14

    y += 20
    page.insert_text((50, y), "═" * 70, fontsize=8, fontname="helv")
    y += 15
    page.insert_text((50, y), "DIAGNÓSTICO", fontsize=11, fontname="helv")
    y += 5
    page.insert_text((50, y + 12), "─" * 70, fontsize=8, fontname="helv")

    y += 30
    diag_lines = [
        "1. Hipertensión arterial estadio I controlada con medicamento (CIE-10: I10).",
        "   Paciente en tratamiento con Losartán 50mg cada 12 horas desde hace 2 años.",
        "   Cifras tensionales actuales: 130/85 mmHg.",
        "",
        "2. Sobrepeso (IMC 26.8) — se recomienda plan de alimentación y actividad física.",
        "",
        "3. Lumbalgia mecánica recurrente asociada a postura prolongada en silla",
        "   de oficina. Sin signos de radiculopatía.",
        "",
        "4. Agudeza visual: OD 20/25, OI 20/30. Astigmatismo leve bilateral.",
        "   Usa lentes correctivos. Control oftalmológico anual.",
    ]

    for line in diag_lines:
        page.insert_text((50, y), line, fontsize=9, fontname="helv")
        y += 13

    # --- Página 2 ---
    page2 = doc.new_page(width=612, height=792)
    y = 50

    page2.insert_text((50, y), "TIPO DE TRATAMIENTO", fontsize=11, fontname="helv")
    y += 20

    trat_lines = [
        "- Losartán 50mg vía oral cada 12 horas (manejo de hipertensión)",
        "- Control con médico internista cada 3 meses",
        "- Plan nutricional para reducción de peso (remisión a nutricionista)",
        "- Programa de pausas activas y ejercicio supervisado 3 veces por semana",
        "- Terapia física para lumbalgia: 10 sesiones de fisioterapia",
        "- Uso de silla ergonómica y soporte lumbar en puesto de trabajo",
        "- Control oftalmológico anual con actualización de fórmula de lentes",
    ]

    for line in trat_lines:
        page2.insert_text((50, y), line, fontsize=9, fontname="helv")
        y += 14

    y += 25
    page2.insert_text((50, y), "RECOMENDACIONES MÉDICO LABORALES", fontsize=11, fontname="helv")
    y += 20

    rec_lines = [
        "1. Evitar jornadas laborales que excedan 8 horas continuas en posición",
        "   sedente. Implementar pausas activas cada 2 horas mínimo.",
        "",
        "2. Garantizar puesto de trabajo con silla ergonómica certificada, soporte",
        "   lumbar ajustable, y pantalla a la altura de los ojos.",
        "",
        "3. No realizar levantamiento manual de cargas superiores a 15 kg.",
        "",
        "4. Control de cifras tensionales mensual por parte del servicio de SST",
        "   de la empresa.",
        "",
        "5. Permitir asistencia a citas médicas programadas (internista, fisioterapia,",
        "   nutrición, oftalmología) sin afectación laboral.",
        "",
        "6. Se recomienda vinculación al programa de vigilancia epidemiológica",
        "   de riesgo cardiovascular y osteomuscular de la empresa.",
        "",
        "7. Apto para laborar con las restricciones mencionadas.",
    ]

    for line in rec_lines:
        page2.insert_text((50, y), line, fontsize=9, fontname="helv")
        y += 13

    y += 30
    page2.insert_text((50, y), "─" * 70, fontsize=8, fontname="helv")
    y += 20
    page2.insert_text((50, y), "Dr. FERNANDO JOSÉ RESTREPO AGUILAR", fontsize=10, fontname="helv")
    y += 14
    page2.insert_text((50, y), "Médico Especialista en Salud Ocupacional", fontsize=9, fontname="helv")
    y += 14
    page2.insert_text((50, y), "Lic. SST No. 12345 | Reg. Médico 67890", fontsize=9, fontname="helv")
    y += 14
    page2.insert_text((50, y), "Centro Médico Ocupacional del Valle", fontsize=9, fontname="helv")

    doc.save(output_path)
    doc.close()
    print(f"PDF de prueba creado: {output_path}")
    return output_path


if __name__ == "__main__":
    create_test_pdf = create_test_exam_pdf()
