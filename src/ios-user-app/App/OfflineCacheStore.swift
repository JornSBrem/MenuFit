import Foundation

enum OfflineCacheError: Error {
  case cacheDirectoryUnavailable
}

final class OfflineCacheStore {
  private let fileManager: FileManager
  private let directoryURL: URL
  private let decoder = JSONDecoder()
  private let encoder = JSONEncoder()

  init(fileManager: FileManager = .default) throws {
    self.fileManager = fileManager
    guard let cacheDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else {
      throw OfflineCacheError.cacheDirectoryUnavailable
    }

    directoryURL = cacheDirectory.appendingPathComponent("MenuFitOfflineCache", isDirectory: true)
    try fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
  }

  func save(bundle: CachedWeekBundle) throws {
    let fileURL = cacheFileURL(selection: bundle.selection)
    let data = try encoder.encode(bundle)
    try data.write(to: fileURL, options: [.atomic])
  }

  func load(selection: WeekSelection) throws -> CachedWeekBundle {
    let data = try Data(contentsOf: cacheFileURL(selection: selection))
    return try decoder.decode(CachedWeekBundle.self, from: data)
  }

  func clearAll() throws {
    if fileManager.fileExists(atPath: directoryURL.path) {
      try fileManager.removeItem(at: directoryURL)
    }
    try fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
  }

  private func cacheFileURL(selection: WeekSelection) -> URL {
    directoryURL.appendingPathComponent(
      "week-\(selection.year)-\(selection.week)-\(selection.kcal)-\(selection.basePersons).json"
    )
  }
}
