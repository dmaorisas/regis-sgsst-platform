#!/usr/bin/env python3
"""
OCR extraction bridge for the Next.js webapp.
Receives a PDF via stdin (base64) or file path argument.
Outputs JSON to stdout: { "success": true, "text": "...", "method": "..." }

Supports:
  - Digital PDFs: PyMuPDF text extraction (fast, ~100ms)
  - Scanned PDFs: PyMuPDF image extraction + EasyOCR (slower, ~5-15s)
"""

import sys
import os
import json
import base64
import tempfile

import fitz  # PyMuPDF


def extract_digital(pdf_path: str) -> str:
    """Extract text from digital PDF using PyMuPDF."""
    doc = fitz.open(pdf_path)
    parts = []
    for i in range(len(doc)):
        text = doc[i].get_text("text")
        if text.strip():
            parts.append(text)
    doc.close()
    return "\n\n".join(parts)


def is_digital(pdf_path: str, threshold: int = 50) -> bool:
    """Check if PDF has enough embedded text to be considered digital."""
    doc = fitz.open(pdf_path)
    total = ""
    for page in doc:
        total += page.get_text("text")
        if len(total.strip()) > threshold:
            doc.close()
            return True
    doc.close()
    return len(total.strip()) > threshold


def extract_scanned(pdf_path: str) -> str:
    """Extract text from scanned PDF using PyMuPDF rendering + EasyOCR."""
    import easyocr
    import numpy as np
    from PIL import Image
    import io

    reader = easyocr.Reader(["es", "en"], gpu=False, verbose=False)
    doc = fitz.open(pdf_path)
    parts = []

    for i in range(len(doc)):
        page = doc[i]
        # Render page to image at 300 DPI
        mat = fitz.Matrix(300 / 72, 300 / 72)
        pix = page.get_pixmap(matrix=mat)
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        img_array = np.array(img)

        results = reader.readtext(img_array, detail=0, paragraph=True)
        page_text = "\n".join(results)
        if page_text.strip():
            parts.append(page_text)

    doc.close()
    return "\n\n".join(parts)


def main():
    try:
        # Read base64 from stdin or file path from argv
        if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
            pdf_path = sys.argv[1]
            cleanup = False
        else:
            # Read base64 from stdin
            b64_data = sys.stdin.read().strip()
            if not b64_data:
                print(json.dumps({"success": False, "error": "No input received"}))
                sys.exit(1)

            pdf_bytes = base64.b64decode(b64_data)
            tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
            tmp.write(pdf_bytes)
            tmp.close()
            pdf_path = tmp.name
            cleanup = True

        try:
            if is_digital(pdf_path):
                text = extract_digital(pdf_path)
                method = "digital"
            else:
                text = extract_scanned(pdf_path)
                method = "ocr"

            if not text.strip():
                print(json.dumps({
                    "success": False,
                    "error": "No se detecto texto en el documento.",
                    "method": method
                }))
                sys.exit(1)

            print(json.dumps({
                "success": True,
                "text": text,
                "method": method,
                "char_count": len(text)
            }))

        finally:
            if cleanup and os.path.exists(pdf_path):
                os.unlink(pdf_path)

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
