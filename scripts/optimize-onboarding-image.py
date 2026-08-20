from pathlib import Path

from PIL import Image


SOURCE = Path(__file__).resolve().parents[1] / "assets/images/onboarding-hiker-phone.jpg"
MAX_WIDTH = 900


def main() -> None:
    with Image.open(SOURCE) as original:
        image = original.convert("RGB")
        if image.width > MAX_WIDTH:
            ratio = MAX_WIDTH / image.width
            image = image.resize((MAX_WIDTH, round(image.height * ratio)), Image.Resampling.LANCZOS)
        temporary = SOURCE.with_suffix(".tmp.jpg")
        image.save(temporary, "JPEG", quality=78, optimize=True, progressive=True, subsampling=2)
    temporary.replace(SOURCE)
    print(f"Optimized {SOURCE.name}: {image.width}x{image.height}, {SOURCE.stat().st_size} bytes")


if __name__ == "__main__":
    main()
