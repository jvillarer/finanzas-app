"""
Recorta el padding blanco de los iconos PWA y los escala para que
el contenido llene el 100% del canvas.
"""
from PIL import Image
import os

PUBLIC = os.path.join(os.path.dirname(__file__), "public")

def rellenar_icono(nombre_entrada, nombre_salida, tamaño):
    ruta = os.path.join(PUBLIC, nombre_entrada)
    img = Image.open(ruta).convert("RGBA")

    # Detectar bounding box del contenido no-blanco / no-transparente
    # Umbral: pixel "blanco" = R>240, G>240, B>240
    datos = img.load()
    ancho, alto = img.size
    min_x, min_y = ancho, alto
    max_x, max_y = 0, 0

    for y in range(alto):
        for x in range(ancho):
            r, g, b, a = datos[x, y]
            es_blanco = r > 240 and g > 240 and b > 240
            es_transparente = a < 30
            if not es_blanco and not es_transparente:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    print(f"{nombre_entrada}: contenido en ({min_x},{min_y}) -> ({max_x},{max_y})")

    # Recortar al bounding box del contenido
    recortada = img.crop((min_x, min_y, max_x + 1, max_y + 1))

    # Escalar al tamaño final con calidad máxima
    final = recortada.resize((tamaño, tamaño), Image.LANCZOS)

    # Guardar como PNG sin canal alfa (iOS no lo necesita para PWA)
    fondo = Image.new("RGB", (tamaño, tamaño), (0, 0, 0))
    fondo.paste(final, mask=final.split()[3] if final.mode == "RGBA" else None)
    ruta_salida = os.path.join(PUBLIC, nombre_salida)
    fondo.save(ruta_salida, "PNG", optimize=True)
    print(f"  guardado como {nombre_salida} ({tamaño}x{tamaño}px)")

rellenar_icono("icon-512.png", "icon-512.png", 512)
rellenar_icono("icon-192.png", "icon-192.png", 192)
print("Listo!")
