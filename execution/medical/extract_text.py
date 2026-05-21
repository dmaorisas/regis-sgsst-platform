"""
Paso 1: Extrae texto de un PDF (digital o escaneado).
- PDFs digitales: PyMuPDF extrae texto directo.
- PDFs escaneados: pdf2image + EasyOCR.
"""

import sys
import os
import json
import argparse
import fitz  # PyMuPDF


def extract_from_digital_pdf(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    text_parts = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        if text.strip():
            text_parts.append(f"--- Página {page_num + 1} ---\n{text}")
    doc.close()
    return "\n\n".join(text_parts)


def extract_from_scanned_pdf(pdf_path: str) -> str:
    from pdf2image import convert_from_path
    import easyocr

    reader = easyocr.Reader(["es", "en"], gpu=False, verbose=False)
    images = convert_from_path(pdf_path, dpi=300)

    text_parts = []
    for i, img in enumerate(images):
        import numpy as np
        img_array = np.array(img)
        results = reader.readtext(img_array, detail=0, paragraph=True)
        page_text = "\n".join(results)
        if page_text.strip():
            text_parts.append(f"--- Página {i + 1} ---\n{page_text}")

    return "\n\n".join(text_parts)


def is_digital_pdf(pdf_path: str) -> bool:
    doc = fitz.open(pdf_path)
    total_text = ""
    for page in doc:
        total_text += page.get_text("text")
    doc.close()
    return len(total_text.strip()) > 50


def extract_text(pdf_path: str) -> dict:
    if not os.path.exists(pdf_path):
        return {"success": False, "error": f"Archivo no encontrado: {pdf_path}"}

    try:
        digital = is_digital_pdf(pdf_path)
        method = "digital (PyMuPDF)" if digital else "escaneado (EasyOCR)"

        if digital:
            text = extract_from_digital_pdf(pdf_path)
        else:
            text = extract_from_scanned_pdf(pdf_path)

        if not text.strip():
            return {
                "success": False,
                "error": "No se detectó texto en el documento. Verificar calidad del archivo.",
                "method": method,
            }

        return {
            "success": True,
            "text": text,
            "method": method,
            "char_count": len(text),
        }

    except Exception as e:
        return {"success": False, "error": f"Error procesando PDF: {str(e)}"}


def main():
    parser = argparse.ArgumentParser(description="Extraer texto de examen médico PDF")
    parser.add_argument("--input", required=True, help="Ruta al PDF del examen")
    parser.add_argument("--output", help="Ruta para guardar el texto extraído (opcional)")
    args = parser.parse_args()

    result = extract_text(args.input)

    if result["success"]:
        print(f"[OK] Método: {result['method']} | Caracteres: {result['char_count']}")
        if args.output:
            os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(result["text"])
            print(f"[OK] Texto guardado en: {args.output}")
        else:
            print(result["text"])
    else:
        print(f"[ERROR] {result['error']}", file=sys.stderr)
        sys.exit(1)

    return result


if __name__ == "__main__":
    main()
