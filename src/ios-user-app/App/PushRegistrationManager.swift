import UIKit

/// Coördineert APNs device token registratie met de backend.
///
/// Gebruik:
///   1. Stel `backendAPI` in zodra de gebruiker ingelogd is.
///   2. Roep `registerIfNeeded()` aan om APNs registratie te starten.
///   3. AppDelegate stuurt het ontvangen token door via `handleDeviceToken(_:)`.
final class PushRegistrationManager {
  static let shared = PushRegistrationManager()

  private static let tokenKey = "menufit.push-device-token"

  /// Wordt gezet door UserFlowViewModel na het inloggen.
  var backendAPI: BackendAPI?

  private var currentToken: String? {
    get { UserDefaults.standard.string(forKey: Self.tokenKey) }
    set { UserDefaults.standard.set(newValue, forKey: Self.tokenKey) }
  }

  private init() {}

  /// Start APNs device token aanvraag. Veilig meerdere keren aanroepen.
  func registerIfNeeded() {
    DispatchQueue.main.async {
      UIApplication.shared.registerForRemoteNotifications()
    }
  }

  /// Verwerkt het device token ontvangen van APNs (via AppDelegate).
  /// Slaat het op en stuurt het naar de backend als het nieuw is.
  func handleDeviceToken(_ hex: String) {
    guard hex != currentToken else { return }
    currentToken = hex
    Task {
      await sendTokenToBackend(hex)
    }
  }

  /// Verwijdert het huidige token bij de backend (bijv. bij uitloggen).
  func unregisterCurrentToken() async {
    guard let token = currentToken, let api = backendAPI else { return }
    do {
      try await api.unregisterPushToken(token)
      currentToken = nil
    } catch {
      print("[PushRegistrationManager] Unregister failed: \(error.localizedDescription)")
    }
  }

  private func sendTokenToBackend(_ token: String) async {
    guard let api = backendAPI else {
      print("[PushRegistrationManager] No API client available, token will retry on next launch")
      return
    }
    do {
      try await api.registerPushToken(token)
      print("[PushRegistrationManager] Device token registered with backend")
    } catch {
      print("[PushRegistrationManager] Register failed: \(error.localizedDescription)")
    }
  }
}
