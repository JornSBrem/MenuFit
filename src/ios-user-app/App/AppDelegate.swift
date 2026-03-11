import UIKit

final class AppDelegate: NSObject, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
    PushRegistrationManager.shared.handleDeviceToken(hex)
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("[AppDelegate] APNs registration failed: \(error.localizedDescription)")
  }
}
