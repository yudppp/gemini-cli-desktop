#!/bin/bash

# Create iconset directory
mkdir -p iconset.iconset

echo "Generating organic blob icon..."

# Generate all required sizes
rsvg-convert -w 16 -h 16 icon.svg -o iconset.iconset/icon_16x16.png
rsvg-convert -w 32 -h 32 icon.svg -o iconset.iconset/icon_16x16@2x.png
rsvg-convert -w 32 -h 32 icon.svg -o iconset.iconset/icon_32x32.png
rsvg-convert -w 64 -h 64 icon.svg -o iconset.iconset/icon_32x32@2x.png
rsvg-convert -w 128 -h 128 icon.svg -o iconset.iconset/icon_128x128.png
rsvg-convert -w 256 -h 256 icon.svg -o iconset.iconset/icon_128x128@2x.png
rsvg-convert -w 256 -h 256 icon.svg -o iconset.iconset/icon_256x256.png
rsvg-convert -w 512 -h 512 icon.svg -o iconset.iconset/icon_256x256@2x.png
rsvg-convert -w 512 -h 512 icon.svg -o iconset.iconset/icon_512x512.png
rsvg-convert -w 1024 -h 1024 icon.svg -o iconset.iconset/icon_512x512@2x.png

# Create icns
iconutil -c icns iconset.iconset -o icon.icns

# Update PNGs
echo "Updating PNG files..."
rsvg-convert -w 16 -h 16 icon.svg -o icons/16x16.png
rsvg-convert -w 32 -h 32 icon.svg -o icons/32x32.png
rsvg-convert -w 48 -h 48 icon.svg -o icons/48x48.png
rsvg-convert -w 64 -h 64 icon.svg -o icons/64x64.png
rsvg-convert -w 128 -h 128 icon.svg -o icons/128x128.png
rsvg-convert -w 256 -h 256 icon.svg -o icons/256x256.png
rsvg-convert -w 512 -h 512 icon.svg -o icons/512x512.png
rsvg-convert -w 1024 -h 1024 icon.svg -o icons/1024x1024.png

# Generate ICO for Windows
echo "Generating Windows ICO..."
# Create multiple sizes for ICO
rsvg-convert -w 16 -h 16 icon.svg -o icon-16.png
rsvg-convert -w 32 -h 32 icon.svg -o icon-32.png
rsvg-convert -w 48 -h 48 icon.svg -o icon-48.png
rsvg-convert -w 256 -h 256 icon.svg -o icon-256.png

# Convert to ICO using ImageMagick
magick convert icon-16.png icon-32.png icon-48.png icon-256.png icon.ico

# Clean up temporary files
rm -f icon-16.png icon-32.png icon-48.png icon-256.png

# Clean up
rm -rf iconset.iconset

echo "Done!"