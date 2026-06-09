import Cocoa

let logoPath = "assets/images/pallithozhan_logo.png"
let outPath = "assets/images/android-icon-foreground.png"

guard let logoImage = NSImage(contentsOfFile: logoPath) else {
    print("Failed to load logo image")
    exit(1)
}

let canvasSize = NSSize(width: 512, height: 512)
let logoSize = NSSize(width: 340, height: 340)

let newImage = NSImage(size: canvasSize)
newImage.lockFocus()

// Clear canvas with transparency
NSColor.clear.set()
let canvasRect = NSRect(origin: .zero, size: canvasSize)
canvasRect.fill()

// Draw centered logo
let x = (canvasSize.width - logoSize.width) / 2
let y = (canvasSize.height - logoSize.height) / 2
let targetRect = NSRect(x: x, y: y, width: logoSize.width, height: logoSize.height)

logoImage.draw(in: targetRect, from: NSRect(origin: .zero, size: logoImage.size), operation: .sourceOver, fraction: 1.0)

newImage.unlockFocus()

if let tiffData = newImage.tiffRepresentation,
   let bitmapRep = NSBitmapImageRep(data: tiffData),
   let pngData = bitmapRep.representation(using: .png, properties: [:]) {
    do {
        try pngData.write(to: URL(fileURLWithPath: outPath))
        print("Successfully created adaptive icon foreground!")
    } catch {
        print("Failed to write PNG file: \(error)")
        exit(1)
    }
} else {
    print("Failed to convert image representation to PNG")
    exit(1)
}
