"""
Paso 3: Genera el PDF final GTH-F-56 directamente con PyMuPDF.
No depende de Word ni LibreOffice. Auto-contenido.
"""

import os
import sys
import json
import argparse
import fitz  # PyMuPDF

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

PAGE_W, PAGE_H = 612, 792
MARGIN_LEFT = 55
MARGIN_RIGHT = 557
MARGIN_TOP = 45
MARGIN_BOTTOM = 50
CONTENT_WIDTH = MARGIN_RIGHT - MARGIN_LEFT

FONT_REGULAR = "helv"
FONT_BOLD = "hebo"
COLOR_BLACK = (0, 0, 0)
COLOR_GRAY_HEADER = (0.75, 0.75, 0.75)
COLOR_GRAY_LIGHT = (0.85, 0.85, 0.85)
LINE_HEIGHT = 12
FONT_SIZE = 8
PADDING = 5


def draw_header(page, y):
    col1_x = MARGIN_LEFT
    col2_x = MARGIN_LEFT + 180
    col3_x = MARGIN_RIGHT - 120
    header_h = 55

    page.draw_rect(fitz.Rect(col1_x, y, MARGIN_RIGHT, y + header_h), color=COLOR_BLACK, width=0.8)
    page.draw_line(fitz.Point(col2_x, y), fitz.Point(col2_x, y + header_h), color=COLOR_BLACK, width=0.5)
    page.draw_line(fitz.Point(col3_x, y), fitz.Point(col3_x, y + header_h), color=COLOR_BLACK, width=0.5)

    page.insert_text((col1_x + 15, y + 25), "REGIS", fontsize=16, fontname=FONT_BOLD, color=(0.1, 0.15, 0.3))
    page.insert_text((col1_x + 15, y + 40), "COLOMBIA", fontsize=9, fontname=FONT_REGULAR, color=(0.1, 0.15, 0.3))

    page.insert_text((col2_x + 5, y + 18), "FORMATO SST: SEGUIMIENTO A", fontsize=8, fontname=FONT_BOLD)
    page.insert_text((col2_x + 5, y + 30), "RECOMENDACIONES MÉDICO LABORALES", fontsize=8, fontname=FONT_BOLD)
    page.insert_text((col2_x + 5, y + 48), "PROCESO: GESTIÓN DEL TALENTO HUMANO", fontsize=7, fontname=FONT_BOLD)

    page.insert_text((col3_x + 5, y + 15), "Versión: 3.0", fontsize=7, fontname=FONT_REGULAR)
    page.draw_line(fitz.Point(col3_x, y + 18), fitz.Point(MARGIN_RIGHT, y + 18), color=COLOR_BLACK, width=0.3)
    page.insert_text((col3_x + 5, y + 30), "Fecha: 12/09/2019", fontsize=7, fontname=FONT_REGULAR)
    page.draw_line(fitz.Point(col3_x, y + 36), fitz.Point(MARGIN_RIGHT, y + 36), color=COLOR_BLACK, width=0.3)
    page.insert_text((col3_x + 5, y + 48), "Código: GTH-F-56", fontsize=7, fontname=FONT_REGULAR)

    return y + header_h + 10


def new_page_with_header(doc):
    page = doc.new_page(width=PAGE_W, height=PAGE_H)
    y = draw_header(page, MARGIN_TOP)
    return page, y


def draw_data_row(page, y, label, value, label_width=195):
    row_h = 18
    page.draw_rect(fitz.Rect(MARGIN_LEFT, y, MARGIN_LEFT + label_width, y + row_h),
                   color=COLOR_BLACK, fill=COLOR_GRAY_LIGHT, width=0.5)
    page.draw_rect(fitz.Rect(MARGIN_LEFT + label_width, y, MARGIN_RIGHT, y + row_h),
                   color=COLOR_BLACK, width=0.5)
    page.insert_text((MARGIN_LEFT + 4, y + 13), label, fontsize=FONT_SIZE, fontname=FONT_BOLD)
    page.insert_text((MARGIN_LEFT + label_width + 4, y + 13), str(value or ""),
                     fontsize=FONT_SIZE, fontname=FONT_REGULAR)
    return y + row_h


def wrap_text(text, max_width):
    text = str(text or "")
    lines = []
    for paragraph in text.split("\n"):
        if not paragraph.strip():
            lines.append("")
            continue
        words = paragraph.split()
        current_line = ""
        for word in words:
            test = current_line + " " + word if current_line else word
            tw = fitz.get_text_length(test, fontname=FONT_REGULAR, fontsize=FONT_SIZE)
            if tw > max_width:
                if current_line:
                    lines.append(current_line)
                    current_line = word
                else:
                    lines.append(word)
                    current_line = ""
            else:
                current_line = test
        if current_line:
            lines.append(current_line)
    return lines


def draw_text_block(doc, page, y, title, content, min_height=70):
    """Draws a titled text block. Returns (page, y) — may create new pages for overflow."""
    usable_width = CONTENT_WIDTH - 2 * PADDING
    lines = wrap_text(content, usable_width)
    content_height = max(len(lines) * LINE_HEIGHT + 2 * PADDING, min_height)
    total_height = 18 + content_height  # title bar + content

    # If not enough room for even the title bar, start new page
    if y + 30 > PAGE_H - MARGIN_BOTTOM:
        page, y = new_page_with_header(doc)

    # Draw title bar
    title_h = 18
    page.draw_rect(fitz.Rect(MARGIN_LEFT, y, MARGIN_RIGHT, y + title_h),
                   color=COLOR_BLACK, fill=COLOR_GRAY_HEADER, width=0.5)
    page.insert_text((MARGIN_LEFT + 4, y + 13), title, fontsize=FONT_SIZE, fontname=FONT_BOLD)
    y += title_h

    # Draw content lines, handling page overflow
    box_start_y = y
    line_idx = 0

    while line_idx < len(lines):
        available_h = PAGE_H - MARGIN_BOTTOM - y
        lines_that_fit = max(int((available_h - PADDING) / LINE_HEIGHT), 1)

        batch = lines[line_idx:line_idx + lines_that_fit]
        box_h = max(len(batch) * LINE_HEIGHT + 2 * PADDING, min_height if line_idx == 0 else 30)

        if y + box_h > PAGE_H - MARGIN_BOTTOM:
            box_h = PAGE_H - MARGIN_BOTTOM - y

        page.draw_rect(fitz.Rect(MARGIN_LEFT, y, MARGIN_RIGHT, y + box_h),
                       color=COLOR_BLACK, width=0.5)

        ty = y + PADDING + LINE_HEIGHT - 2
        for line in batch:
            if ty > y + box_h - 3:
                break
            page.insert_text((MARGIN_LEFT + PADDING, ty), line,
                             fontsize=FONT_SIZE, fontname=FONT_REGULAR)
            ty += LINE_HEIGHT

        y += box_h
        line_idx += len(batch)

        if line_idx < len(lines):
            page, y = new_page_with_header(doc)

    # If content was very short, enforce min_height
    actual_content_h = y - box_start_y
    if actual_content_h < min_height and line_idx == len(lines):
        # Extend the last box
        pass  # already drawn, acceptable

    return page, y


def generate_report(exam_fields: dict, external_fields: dict, output_path: str) -> dict:
    try:
        f = {**exam_fields, **external_fields}
        doc = fitz.open()

        # === PÁGINA 1: Datos + Diagnóstico + Tratamiento + Funciones ===
        page, y = new_page_with_header(doc)

        data_rows = [
            ("FECHA", f.get("fecha")),
            ("NOMBRE DEL TRABAJADOR", f.get("nombre_trabajador")),
            ("CÉDULA", f.get("cedula")),
            ("EPS", f.get("eps")),
            ("CARGO", f.get("cargo")),
            ("EDAD", f.get("edad")),
            ("PESO", f.get("peso")),
            ("FECHA DE NACIMIENTO", f.get("fecha_nacimiento")),
            ("DEPENDENCIA", f.get("dependencia")),
            ("EN TRATAMIENTO MÉDICO", f.get("en_tratamiento_medico")),
            ("SEDE", f.get("sede")),
            ("TIPO DE VINCULACIÓN LABORAL", f.get("tipo_vinculacion_laboral")),
            ("NOMBRE DEL JEFE INMEDIATO", f.get("nombre_jefe_inmediato")),
        ]

        for label, value in data_rows:
            if y + 18 > PAGE_H - MARGIN_BOTTOM:
                page, y = new_page_with_header(doc)
            y = draw_data_row(page, y, label, value)

        y += 8
        page, y = draw_text_block(doc, page, y, "Diagnóstico:", f.get("diagnostico"), min_height=70)

        y += 8
        page, y = draw_text_block(doc, page, y, "Tipo de tratamiento:", f.get("tipo_tratamiento"), min_height=70)

        y += 8
        page, y = draw_text_block(doc, page, y, "Funciones del cargo:", f.get("funciones_cargo"), min_height=70)

        # === PÁGINA 2: Recomendaciones + Observaciones + Compromisos ===
        page, y = new_page_with_header(doc)

        page, y = draw_text_block(doc, page, y,
                                  "Estado y cumplimiento de las recomendaciones médico laborales:",
                                  f.get("recomendaciones_medico_laborales"), min_height=100)

        y += 12
        page, y = draw_text_block(doc, page, y, "Observaciones:", f.get("observaciones"), min_height=70)

        y += 12
        page, y = draw_text_block(doc, page, y, "Compromiso de funcionario:",
                                  f.get("compromiso_funcionario"), min_height=70)

        y += 12
        page, y = draw_text_block(doc, page, y, "Compromiso de la entidad y áreas afines:",
                                  f.get("compromiso_entidad"), min_height=70)

        # === PÁGINA FINAL: Firma ===
        page, y = new_page_with_header(doc)

        y += 30
        page.draw_rect(fitz.Rect(MARGIN_LEFT, y, MARGIN_RIGHT, y + 20),
                       color=COLOR_BLACK, fill=COLOR_GRAY_HEADER, width=0.5)
        page.insert_text((200, y + 14), "Nombre, Cargo y Firma",
                         fontsize=9, fontname=FONT_BOLD)
        page.draw_rect(fitz.Rect(MARGIN_LEFT, y + 20, MARGIN_RIGHT, y + 140),
                       color=COLOR_BLACK, width=0.5)

        # Save
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        pdf_path = output_path if output_path.endswith(".pdf") else output_path + ".pdf"
        doc.save(pdf_path)
        doc.close()

        return {
            "success": True,
            "pdf_path": pdf_path,
            "pdf_generated": True,
            "fields_filled": len([v for v in f.values() if v]),
            "fields_empty": len([v for v in f.values() if not v]),
        }

    except Exception as e:
        return {"success": False, "error": f"Error generando reporte: {str(e)}"}


def main():
    parser = argparse.ArgumentParser(description="Generar reporte GTH-F-56 desde campos JSON")
    parser.add_argument("--exam-fields", required=True, help="Ruta al JSON de campos del examen")
    parser.add_argument("--external-fields", help="JSON string o ruta a archivo con campos externos")
    parser.add_argument("--output", required=True, help="Ruta del archivo de salida (.pdf)")
    args = parser.parse_args()

    with open(args.exam_fields, "r", encoding="utf-8") as f:
        exam_fields = json.load(f)

    external_fields = {}
    if args.external_fields:
        if os.path.exists(args.external_fields):
            with open(args.external_fields, "r", encoding="utf-8") as f:
                external_fields = json.load(f)
        else:
            try:
                external_fields = json.loads(args.external_fields)
            except json.JSONDecodeError:
                print("[ERROR] No se pudo parsear --external-fields como JSON", file=sys.stderr)
                sys.exit(1)

    result = generate_report(exam_fields, external_fields, args.output)

    if result["success"]:
        print(f"[OK] PDF generado: {result['pdf_path']}")
        print(f"[INFO] Campos llenados: {result['fields_filled']} | Vacíos: {result['fields_empty']}")
    else:
        print(f"[ERROR] {result['error']}", file=sys.stderr)
        sys.exit(1)

    return result


if __name__ == "__main__":
    main()
