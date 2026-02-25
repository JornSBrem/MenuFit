import CoreGraphics
import UIKit
import XCTest

enum SnapshotAssert {
  static func assertElementSnapshot(
    named name: String,
    element: XCUIElement,
    pixelTolerance: UInt8 = 10,
    maxDiffRatio: Double = 0.001,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    XCTAssertTrue(element.exists, "Snapshot element '\(name)' bestaat niet.", file: file, line: line)

    let image = element.screenshot().image
    guard let imageData = image.pngData() else {
      XCTFail("Kon screenshot niet encoden voor '\(name)'.", file: file, line: line)
      return
    }

    let fileURL = URL(fileURLWithPath: "\(file)")
    let snapshotsDirectory = fileURL.deletingLastPathComponent().appendingPathComponent("Snapshots", isDirectory: true)
    let baselineURL = snapshotsDirectory.appendingPathComponent("\(name).png")

    if isRecordMode {
      record(imageData: imageData, to: baselineURL, name: name, file: file, line: line)
      return
    }

    guard let baselineData = try? Data(contentsOf: baselineURL),
          let baselineImage = UIImage(data: baselineData)
    else {
      if !isCI {
        record(imageData: imageData, to: baselineURL, name: name, file: file, line: line)
        return
      }
      XCTFail("Baseline snapshot ontbreekt voor '\(name)'.", file: file, line: line)
      return
    }

    guard let baselinePixels = imagePixels(baselineImage),
          let actualPixels = imagePixels(image)
    else {
      XCTFail("Kon pixeldata niet lezen voor '\(name)'.", file: file, line: line)
      return
    }

    if baselinePixels.width != actualPixels.width || baselinePixels.height != actualPixels.height {
      attach(image: baselineImage, name: "\(name)-baseline")
      attach(image: image, name: "\(name)-actual")
      XCTFail("Snapshot dimensie mismatch voor '\(name)'.", file: file, line: line)
      return
    }

    let stride = 4
    let totalPixels = baselinePixels.width * baselinePixels.height
    var diffCount = 0
    var diffBuffer = [UInt8](repeating: 0, count: baselinePixels.bytes.count)

    for pixel in 0..<totalPixels {
      let offset = pixel * stride
      let rDiff = abs(Int(baselinePixels.bytes[offset]) - Int(actualPixels.bytes[offset]))
      let gDiff = abs(Int(baselinePixels.bytes[offset + 1]) - Int(actualPixels.bytes[offset + 1]))
      let bDiff = abs(Int(baselinePixels.bytes[offset + 2]) - Int(actualPixels.bytes[offset + 2]))
      let differs = rDiff > Int(pixelTolerance) || gDiff > Int(pixelTolerance) || bDiff > Int(pixelTolerance)

      if differs {
        diffCount += 1
        diffBuffer[offset] = 255
        diffBuffer[offset + 1] = 0
        diffBuffer[offset + 2] = 0
        diffBuffer[offset + 3] = 255
      } else {
        diffBuffer[offset] = actualPixels.bytes[offset]
        diffBuffer[offset + 1] = actualPixels.bytes[offset + 1]
        diffBuffer[offset + 2] = actualPixels.bytes[offset + 2]
        diffBuffer[offset + 3] = 96
      }
    }

    let diffRatio = Double(diffCount) / Double(totalPixels)
    guard diffRatio <= maxDiffRatio else {
      attach(image: baselineImage, name: "\(name)-baseline")
      attach(image: image, name: "\(name)-actual")
      if let diffImage = imageFromPixels(width: baselinePixels.width, height: baselinePixels.height, bytes: diffBuffer) {
        attach(image: diffImage, name: "\(name)-diff")
      }
      XCTFail("Snapshot afwijking voor '\(name)': \(String(format: "%.5f", diffRatio)).", file: file, line: line)
      return
    }
  }

  private static var isRecordMode: Bool {
    ProcessInfo.processInfo.environment["MENUFIT_SNAPSHOT_RECORD"] == "1"
  }

  private static var isCI: Bool {
    let value = ProcessInfo.processInfo.environment["CI"]?.lowercased()
    return value == "1" || value == "true"
  }

  private static func record(imageData: Data, to baselineURL: URL, name: String, file: StaticString, line: UInt) {
    do {
      try FileManager.default.createDirectory(at: baselineURL.deletingLastPathComponent(), withIntermediateDirectories: true)
      try imageData.write(to: baselineURL, options: [.atomic])
    } catch {
      XCTFail("Kon baseline '\(name)' niet schrijven: \(error.localizedDescription)", file: file, line: line)
    }
  }

  private static func attach(image: UIImage, name: String) {
    let attachment = XCTAttachment(image: image)
    attachment.name = name
    attachment.lifetime = .keepAlways
    XCTContext.runActivity(named: "Snapshot \(name)") { activity in
      activity.add(attachment)
    }
  }

  private static func imagePixels(_ image: UIImage) -> (width: Int, height: Int, bytes: [UInt8])? {
    guard let cgImage = image.cgImage else {
      return nil
    }
    let width = cgImage.width
    let height = cgImage.height
    let bytesPerRow = width * 4
    var bytes = [UInt8](repeating: 0, count: width * height * 4)
    guard let context = CGContext(
      data: &bytes,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: bytesPerRow,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
      return nil
    }
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    return (width: width, height: height, bytes: bytes)
  }

  private static func imageFromPixels(width: Int, height: Int, bytes: [UInt8]) -> UIImage? {
    var mutable = bytes
    guard let context = CGContext(
      data: &mutable,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: width * 4,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ),
    let cgImage = context.makeImage()
    else {
      return nil
    }
    return UIImage(cgImage: cgImage)
  }
}
